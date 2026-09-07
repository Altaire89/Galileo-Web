"""REST API for the multi-tenant support platform, implemented with Flask."""

from functools import wraps
from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS

from store import hash_password, new_id, now_iso, store, verify_password

app = Flask(__name__)
CORS(app)

REQUEST_TYPES = {"Incidencia", "Consulta", "Petición"}
URGENCIES = {"Baja", "Media", "Alta", "Crítica"}
STATUSES = {"Abierta", "En progreso", "Resuelta", "Cerrada"}


def error(message: str, status: int):
    return jsonify({"detail": message}), status


def json_body() -> dict[str, Any]:
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else {}


def required_string(body: dict[str, Any], key: str, minimum: int = 1) -> str | None:
    value = body.get(key)
    if not isinstance(value, str) or len(value.strip()) < minimum:
        return None
    return value.strip()


def valid_email(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    local, separator, domain = value.strip().rpartition("@")
    return bool(separator and local and domain and "." in domain)


def public_user(user: dict) -> dict:
    return {key: value for key, value in user.items() if key != "password"}


def organization_name(db: dict, org_id: str) -> str:
    organization = next((item for item in db["organizations"] if item["id"] == org_id), None)
    return organization["name"] if organization else "—"


def bearer_token() -> str:
    authorization = request.headers.get("Authorization", "")
    return authorization.removeprefix("Bearer ").strip()


def get_current_user() -> dict | None:
    token = bearer_token()
    if not token:
        return None
    db = store.read()
    user_id = db.get("sessions", {}).get(token)
    user = next((item for item in db["users"] if item["id"] == user_id), None)
    return user if user and user.get("active", True) else None


def authenticated(handler):
    @wraps(handler)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user:
            return error("No autenticado" if not bearer_token() else "Sesión inválida", 401)
        return handler(user, *args, **kwargs)

    return wrapper


def admin_only(handler):
    @wraps(handler)
    @authenticated
    def wrapper(user, *args, **kwargs):
        if user["role"] != "UCA":
            return error("Se requieren permisos de administrador", 403)
        return handler(user, *args, **kwargs)

    return wrapper


def request_summary(db: dict, req: dict) -> dict:
    messages = [item for item in db["messages"] if item["request_id"] == req["id"]]
    last = max(messages, key=lambda item: item["created_at"]) if messages else None
    author = next((item for item in db["users"] if item["id"] == req["created_by"]), None)
    return {
        **req,
        "created_by_name": author["name"] if author else "—",
        "message_count": len(messages),
        "last_message": last["body"][:120] if last else "",
        "last_activity": last["created_at"] if last else req["created_at"],
    }


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/auth/login")
def login():
    body = json_body()
    email = body.get("email", "")
    password = body.get("password", "")
    if not valid_email(email) or not isinstance(password, str):
        return error("Datos de acceso no válidos", 422)
    with store.transaction() as db:
        user = next((item for item in db["users"] if item["email"] == email.lower()), None)
        if not user or not verify_password(password, user["password"]):
            return error("Credenciales incorrectas", 401)
        if not user.get("active", True):
            return error("Cuenta desactivada", 403)
        token = new_id("sess")
        db.setdefault("sessions", {})[token] = user["id"]
        return jsonify({
            "token": token,
            "user": public_user(user),
            "organization": organization_name(db, user["org_id"]),
        })


@app.post("/auth/logout")
@authenticated
def logout(user):
    del user
    with store.transaction() as db:
        db.get("sessions", {}).pop(bearer_token(), None)
    return jsonify({"ok": True})


@app.get("/auth/me")
@authenticated
def me(user):
    db = store.read()
    return jsonify({"user": public_user(user), "organization": organization_name(db, user["org_id"])})


@app.get("/auth/invitation/<token>")
def get_invitation(token):
    db = store.read()
    invitation = next((item for item in db["invitations"] if item["token"] == token), None)
    if not invitation or invitation.get("accepted"):
        return error("Invitación no válida o ya utilizada", 404)
    return jsonify({
        "email": invitation["email"],
        "organization": organization_name(db, invitation["org_id"]),
        "role": invitation["role"],
    })


@app.post("/auth/register")
def register():
    body = json_body()
    invitation_token = required_string(body, "token")
    name = required_string(body, "name")
    password = body.get("password")
    if not invitation_token or not name or not isinstance(password, str) or len(password) < 6:
        return error("Datos de registro no válidos", 422)
    with store.transaction() as db:
        invitation = next((item for item in db["invitations"] if item["token"] == invitation_token), None)
        if not invitation or invitation.get("accepted"):
            return error("Invitación no válida o ya utilizada", 404)
        if any(item["email"] == invitation["email"] for item in db["users"]):
            return error("Ya existe una cuenta con este correo", 409)
        user = {
            "id": new_id("usr"),
            "org_id": invitation["org_id"],
            "email": invitation["email"],
            "name": name,
            "role": invitation["role"],
            "active": True,
            "password": hash_password(password),
            "created_at": now_iso(),
        }
        db["users"].append(user)
        invitation["accepted"] = True
        token = new_id("sess")
        db.setdefault("sessions", {})[token] = user["id"]
        return jsonify({"token": token, "user": public_user(user), "organization": organization_name(db, user["org_id"])})


@app.get("/users")
@admin_only
def list_users(admin):
    db = store.read()
    return jsonify([public_user(item) for item in db["users"] if item["org_id"] == admin["org_id"]])


@app.post("/users")
@admin_only
def create_user(admin):
    body = json_body()
    email = body.get("email", "")
    name = required_string(body, "name")
    password = body.get("password")
    role = body.get("role", "UC")
    if not valid_email(email) or not name or not isinstance(password, str) or len(password) < 6:
        return error("Datos de usuario no válidos", 422)
    if role not in {"UC", "UCA"}:
        return error("Rol no válido", 422)
    with store.transaction() as db:
        if any(item["email"] == email.lower() for item in db["users"]):
            return error("Ya existe una cuenta con este correo", 409)
        user = {
            "id": new_id("usr"), "org_id": admin["org_id"], "email": email.lower(),
            "name": name, "role": role, "active": True,
            "password": hash_password(password), "created_at": now_iso(),
        }
        db["users"].append(user)
        return jsonify(public_user(user))


@app.patch("/users/<user_id>")
@admin_only
def update_user(admin, user_id):
    body = json_body()
    with store.transaction() as db:
        user = next((item for item in db["users"] if item["id"] == user_id and item["org_id"] == admin["org_id"]), None)
        if not user:
            return error("Usuario no encontrado", 404)
        if body.get("name") is not None:
            name = required_string(body, "name")
            if not name:
                return error("Nombre no válido", 422)
            user["name"] = name
        if body.get("role") is not None:
            if body["role"] not in {"UC", "UCA"}:
                return error("Rol no válido", 422)
            user["role"] = body["role"]
        if body.get("active") is not None:
            if not isinstance(body["active"], bool):
                return error("Estado no válido", 422)
            user["active"] = body["active"]
        return jsonify(public_user(user))


@app.delete("/users/<user_id>")
@admin_only
def delete_user(admin, user_id):
    if user_id == admin["id"]:
        return error("No puedes eliminar tu propia cuenta", 400)
    with store.transaction() as db:
        before = len(db["users"])
        db["users"] = [item for item in db["users"] if not (item["id"] == user_id and item["org_id"] == admin["org_id"])]
        if len(db["users"]) == before:
            return error("Usuario no encontrado", 404)
    return jsonify({"ok": True})


@app.get("/invitations")
@admin_only
def list_invitations(admin):
    db = store.read()
    return jsonify([item for item in db["invitations"] if item["org_id"] == admin["org_id"]])


@app.post("/invitations")
@admin_only
def create_invitation(admin):
    body = json_body()
    email = body.get("email", "")
    role = body.get("role", "UC")
    if not valid_email(email) or role not in {"UC", "UCA"}:
        return error("Datos de invitación no válidos", 422)
    with store.transaction() as db:
        if any(item["email"] == email.lower() for item in db["users"]):
            return error("Ya existe una cuenta con este correo", 409)
        invitation = {
            "id": new_id("inv"), "org_id": admin["org_id"], "email": email.lower(),
            "role": role, "token": new_id("tok"), "accepted": False, "created_at": now_iso(),
        }
        db["invitations"].append(invitation)
        return jsonify(invitation)


@app.get("/requests")
@authenticated
def list_requests(user):
    db = store.read()
    items = [item for item in db["requests"] if item["org_id"] == user["org_id"]]
    query = request.args.get("q", "")
    status = request.args.get("status", "")
    date_from = request.args.get("date_from", "")
    date_to = request.args.get("date_to", "")
    if query:
        query = query.lower()
        message_bodies = {}
        for message in db["messages"]:
            message_bodies.setdefault(message["request_id"], []).append(message["body"].lower())
        items = [item for item in items if query in item["title"].lower() or any(query in body for body in message_bodies.get(item["id"], []))]
    if status in STATUSES:
        items = [item for item in items if item["status"] == status]
    if date_from:
        items = [item for item in items if item["created_at"] >= date_from]
    if date_to:
        items = [item for item in items if item["created_at"] <= date_to + "T23:59:59"]
    summaries = [request_summary(db, item) for item in items]
    summaries.sort(key=lambda item: item["last_activity"], reverse=True)
    return jsonify(summaries)


@app.get("/requests/suggest")
@authenticated
def suggest_requests(user):
    db = store.read()
    title = request.args.get("title", "")
    request_type = request.args.get("type", "")
    tokens = {token for token in title.lower().split() if len(token) > 3}
    closed = [item for item in db["requests"] if item["org_id"] == user["org_id"] and item["status"] == "Cerrada"]
    scored = []
    for item in closed:
        score = sum(1 for token in tokens if token in item["title"].lower())
        score += 1 if request_type and item["type"] == request_type else 0
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return jsonify([request_summary(db, item) for _, item in scored[:5]])


@app.post("/requests")
@authenticated
def create_request(user):
    body = json_body()
    title = required_string(body, "title")
    request_type = body.get("type")
    urgency = body.get("urgency")
    message_body = required_string(body, "body")
    if not title or request_type not in REQUEST_TYPES or urgency not in URGENCIES or not message_body:
        return error("Datos de solicitud no válidos", 422)
    with store.transaction() as db:
        timestamp = now_iso()
        req = {
            "id": new_id("req"), "org_id": user["org_id"], "title": title,
            "type": request_type, "urgency": urgency, "status": "Abierta",
            "created_by": user["id"], "created_at": timestamp, "updated_at": timestamp,
        }
        db["requests"].append(req)
        db["messages"].append({
            "id": new_id("msg"), "request_id": req["id"], "org_id": user["org_id"],
            "author_id": user["id"], "body": message_body, "attachments": [], "created_at": timestamp,
        })
        return jsonify(request_summary(db, req))


@app.get("/requests/<request_id>")
@authenticated
def get_request(user, request_id):
    db = store.read()
    req = next((item for item in db["requests"] if item["id"] == request_id and item["org_id"] == user["org_id"]), None)
    if not req:
        return error("Solicitud no encontrada", 404)
    users = {item["id"]: item for item in db["users"]}
    messages = [{
        **message,
        "author_name": users.get(message["author_id"], {}).get("name", "—"),
        "author_role": users.get(message["author_id"], {}).get("role", "UC"),
    } for message in db["messages"] if message["request_id"] == request_id]
    messages.sort(key=lambda item: item["created_at"])
    return jsonify({**request_summary(db, req), "messages": messages})


@app.post("/requests/<request_id>/messages")
@authenticated
def add_message(user, request_id):
    body = json_body()
    message_body = body.get("body", "")
    attachments = body.get("attachments", [])
    if not isinstance(message_body, str) or not isinstance(attachments, list) or (not message_body.strip() and not attachments):
        return error("El mensaje está vacío", 422)
    with store.transaction() as db:
        req = next((item for item in db["requests"] if item["id"] == request_id and item["org_id"] == user["org_id"]), None)
        if not req:
            return error("Solicitud no encontrada", 404)
        timestamp = now_iso()
        message = {
            "id": new_id("msg"), "request_id": request_id, "org_id": user["org_id"],
            "author_id": user["id"], "body": message_body, "attachments": attachments, "created_at": timestamp,
        }
        db["messages"].append(message)
        req["updated_at"] = timestamp
        if req["status"] == "Cerrada":
            req["status"] = "Abierta"
        return jsonify({**message, "author_name": user["name"], "author_role": user["role"]})


@app.patch("/requests/<request_id>")
@authenticated
def update_status(user, request_id):
    status = json_body().get("status")
    if status not in STATUSES:
        return error("Estado no válido", 422)
    with store.transaction() as db:
        req = next((item for item in db["requests"] if item["id"] == request_id and item["org_id"] == user["org_id"]), None)
        if not req:
            return error("Solicitud no encontrada", 404)
        req["status"] = status
        req["updated_at"] = now_iso()
        return jsonify(request_summary(db, req))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
