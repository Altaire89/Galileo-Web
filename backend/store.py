"""JSON-file backed data store with a process-wide lock.

Persistence is intentionally a single JSON document (per the project brief).
On serverless cold starts the file may be recreated from seed data, which is
acceptable for this demo: the seed always provides working demo accounts.
"""

import hashlib
import json
import os
import secrets
import tempfile
import threading
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_LOCK = threading.RLock()
_PASSWORD_HASHER = PasswordHasher(time_cost=3, memory_cost=64 * 1024, parallelism=4)

# Prefer a writable location; fall back to the system temp dir on read-only FS.
_DEFAULT_PATH = os.path.join(os.path.dirname(__file__), "data.json")
try:
    with open(_DEFAULT_PATH, "a"):
        pass
    DATA_PATH = _DEFAULT_PATH
except OSError:
    DATA_PATH = os.path.join(tempfile.gettempdir(), "consultora_data.json")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(32)}"


def hash_password(password: str) -> str:
    return _PASSWORD_HASHER.hash(password)


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("$argon2"):
        try:
            return _PASSWORD_HASHER.verify(stored, password)
        except (InvalidHashError, VerificationError, VerifyMismatchError):
            return False
    try:
        salt, _ = stored.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return secrets.compare_digest(f"{salt}${digest.hex()}", stored)


def password_needs_rehash(stored: str) -> bool:
    return not stored.startswith("$argon2") or _PASSWORD_HASHER.check_needs_rehash(stored)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _session_expiry() -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=8)).isoformat()


def _seed() -> dict:
    ts = now_iso()
    org_a = "org_acme"
    org_b = "org_globex"

    def user(uid, org, email, name, role, password):
        return {
            "id": uid,
            "org_id": org,
            "email": email.lower(),
            "name": name,
            "role": role,
            "active": True,
            "password": hash_password(password),
            "created_at": ts,
        }

    data = {
        "organizations": [
            {"id": org_a, "name": "Acme Corp"},
            {"id": org_b, "name": "Globex"},
        ],
        "users": [
            user("usr_platform_admin", org_a, "platform@consultora.com", "Platform Admin", "PLATFORM_ADMIN", "password123"),
            user("usr_acme_admin", org_a, "admin@acme.com", "Ana Admin", "ORG_ADMIN", "password123"),
            user("usr_acme_user", org_a, "user@acme.com", "Carlos Cliente", "MEMBER", "password123"),
            user("usr_globex_admin", org_b, "admin@globex.com", "Gina Gerente", "ORG_ADMIN", "password123"),
        ],
        "groups": [
            {"id": "group_acme_general", "org_id": org_a, "name": "General", "active": True},
            {"id": "group_globex_general", "org_id": org_b, "name": "General", "active": True},
        ],
        "group_members": [
            {"user_id": "usr_acme_admin", "group_id": "group_acme_general"},
            {"user_id": "usr_acme_user", "group_id": "group_acme_general"},
            {"user_id": "usr_globex_admin", "group_id": "group_globex_general"},
        ],
        "invitations": [],
        "requests": [],
        "messages": [],
        "sessions": {},
    }

    # A couple of seed requests for Acme so the dashboard isn't empty.
    r1 = {
        "id": "req_seed1", "org_id": org_a, "group_id": "group_acme_general", "title": "El correo corporativo no sincroniza",
        "type": "Incidencia", "urgency": "Alta", "status": "En progreso",
        "created_by": "usr_acme_user", "created_at": ts, "updated_at": ts,
    }
    r2 = {
        "id": "req_seed2", "org_id": org_a, "group_id": "group_acme_general", "title": "Solicitud de acceso a la VPN",
        "type": "Petición", "urgency": "Media", "status": "Cerrada",
        "created_by": "usr_acme_user", "created_at": ts, "updated_at": ts,
    }
    r3 = {
        "id": "req_seed3", "org_id": org_a, "group_id": "group_acme_general", "title": "Consulta sobre licencias de Office",
        "type": "Consulta", "urgency": "Baja", "status": "Cerrada",
        "created_by": "usr_acme_user", "created_at": ts, "updated_at": ts,
    }
    data["requests"] = [r1, r2, r3]
    data["messages"] = [
        {"id": "msg_s1", "request_id": "req_seed1", "org_id": org_a, "author_id": "usr_acme_user",
         "body": "Desde esta mañana el cliente de correo no descarga mensajes nuevos.",
         "attachments": [], "created_at": ts},
        {"id": "msg_s2", "request_id": "req_seed1", "org_id": org_a, "author_id": "usr_acme_admin",
         "body": "Gracias por avisar, lo estamos revisando con el equipo de infraestructura.",
         "attachments": [], "created_at": ts},
        {"id": "msg_s3", "request_id": "req_seed2", "org_id": org_a, "author_id": "usr_acme_user",
         "body": "Necesito acceso a la VPN para trabajar en remoto.", "attachments": [], "created_at": ts},
        {"id": "msg_s4", "request_id": "req_seed3", "org_id": org_a, "author_id": "usr_acme_user",
         "body": "¿Cuántas licencias de Office tenemos disponibles?", "attachments": [], "created_at": ts},
    ]
    return data


def _ensure_schema(data: dict) -> bool:
    """Upgrade demo data created before organizations had groups and roles."""
    changed = False
    role_map = {"UCA": "ORG_ADMIN", "UC": "MEMBER", "GROUP_MANAGER": "MEMBER"}
    legacy_manager_ids = {
        user["id"] for user in data.get("users", []) if user.get("role") == "GROUP_MANAGER"
    }
    data.setdefault("groups", [])
    data.setdefault("group_members", [])
    sessions = data.setdefault("sessions", {})
    for key, value in list(sessions.items()):
        if len(key) != 64 or not isinstance(value, dict):
            sessions.pop(key)
            sessions[token_digest(key)] = {"user_id": value, "expires_at": _session_expiry()}
            changed = True
    for invitation in data.get("invitations", []):
        if "token" in invitation and "token_hash" not in invitation:
            invitation["token_hash"] = token_digest(invitation.pop("token"))
            changed = True
    for group in data["groups"]:
        if "manager_ids" not in group:
            group["manager_ids"] = []
            changed = True
    unique_users = {}
    for user in data.get("users", []):
        existing = unique_users.get(user["id"])
        if existing is None or user.get("role") == "PLATFORM_ADMIN":
            unique_users[user["id"]] = user
        if existing is not None:
            changed = True
    if len(unique_users) != len(data.get("users", [])):
        data["users"] = list(unique_users.values())
    if not any(user.get("role") == "PLATFORM_ADMIN" for user in data.get("users", [])) and data.get("organizations"):
        data["users"].append({
            "id": "usr_platform_admin",
            "org_id": data["organizations"][0]["id"],
            "email": "platform@consultora.com",
            "name": "Platform Admin",
            "role": "PLATFORM_ADMIN",
            "active": True,
            "password": hash_password("password123"),
            "created_at": now_iso(),
        })
        changed = True
    for organization in data.get("organizations", []):
        group = next((item for item in data["groups"] if item["org_id"] == organization["id"] and item["name"] == "General"), None)
        if not group:
            group = {"id": new_id("group"), "org_id": organization["id"], "name": "General", "active": True}
            data["groups"].append(group)
            changed = True
        for user in data.get("users", []):
            if user["org_id"] != organization["id"]:
                continue
            if user.get("role") in role_map:
                user["role"] = role_map[user["role"]]
                changed = True
            if user.get("role") != "PLATFORM_ADMIN" and not any(
                item["user_id"] == user["id"] for item in data["group_members"]
            ):
                data["group_members"].append({"user_id": user["id"], "group_id": group["id"]})
                changed = True
        for membership in data["group_members"]:
            if (
                membership["group_id"] == group["id"]
                and membership["user_id"] in legacy_manager_ids
                and membership["user_id"] not in group["manager_ids"]
            ):
                group["manager_ids"].append(membership["user_id"])
                changed = True
        for req in data.get("requests", []):
            if req["org_id"] == organization["id"] and not req.get("group_id"):
                req["group_id"] = group["id"]
                changed = True
    if data.get("schema_version") != 3:
        data["schema_version"] = 3
        changed = True
    return changed


def _load() -> dict:
    if not os.path.exists(DATA_PATH):
        data = _seed()
        _write(data)
        return data
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if _ensure_schema(data):
            _write(data)
        return data
    except (json.JSONDecodeError, OSError):
        data = _seed()
        _write(data)
        return data


def _write(data: dict) -> None:
    tmp = f"{DATA_PATH}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, DATA_PATH)


class Store:
    """Thread-safe accessor. Use `with store.transaction() as db:` to mutate."""

    def read(self) -> dict:
        with _LOCK:
            return _load()

    class _Txn:
        def __enter__(self):
            _LOCK.acquire()
            self.data = _load()
            return self.data

        def __exit__(self, exc_type, exc, tb):
            try:
                if exc_type is None:
                    _write(self.data)
            finally:
                _LOCK.release()
            return False

    def transaction(self) -> "_Txn":
        return Store._Txn()


store = Store()
