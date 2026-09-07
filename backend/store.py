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
from datetime import datetime, timezone

_LOCK = threading.RLock()

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
    return f"{prefix}_{secrets.token_hex(6)}"


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(8)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
    except ValueError:
        return False
    return secrets.compare_digest(hash_password(password, salt), stored)


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
            user("usr_acme_admin", org_a, "admin@acme.com", "Ana Admin", "UCA", "password123"),
            user("usr_acme_user", org_a, "user@acme.com", "Carlos Cliente", "UC", "password123"),
            user("usr_globex_admin", org_b, "admin@globex.com", "Gina Gerente", "UCA", "password123"),
        ],
        "invitations": [],
        "requests": [],
        "messages": [],
        "sessions": {},
    }

    # A couple of seed requests for Acme so the dashboard isn't empty.
    r1 = {
        "id": "req_seed1", "org_id": org_a, "title": "El correo corporativo no sincroniza",
        "type": "Incidencia", "urgency": "Alta", "status": "En progreso",
        "created_by": "usr_acme_user", "created_at": ts, "updated_at": ts,
    }
    r2 = {
        "id": "req_seed2", "org_id": org_a, "title": "Solicitud de acceso a la VPN",
        "type": "Petición", "urgency": "Media", "status": "Cerrada",
        "created_by": "usr_acme_user", "created_at": ts, "updated_at": ts,
    }
    r3 = {
        "id": "req_seed3", "org_id": org_a, "title": "Consulta sobre licencias de Office",
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


def _load() -> dict:
    if not os.path.exists(DATA_PATH):
        data = _seed()
        _write(data)
        return data
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
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
