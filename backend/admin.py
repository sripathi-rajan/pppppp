"""
DriveLegal Admin API
Provides secure endpoints for the admin panel:
  - Report management (list, update status, delete)
  - Custom news briefs (create, list, delete)
  - Custom push notifications (create, list, delete)
  - Analytics overview
  - User listing
"""
import os
import json
import re
import sqlite3
import glob
from datetime import datetime
from typing import Optional, List, Literal
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ── Config ──────────────────────────────────────────────────────────────────
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "drivelegal-admin-2025")

# Report ids are used to build file paths (REPORTS_DIR/{id}.json etc.) — reject
# anything that isn't a plain token so a crafted id can't escape REPORTS_DIR.
_SAFE_REPORT_ID = re.compile(r"^[A-Za-z0-9_-]+$")

# Paths
_BASE = os.path.dirname(__file__)
REPORTS_DIR = os.path.join(_BASE, "reports")
DATA_DIR    = os.path.join(_BASE, "data")
USERS_DB    = os.path.join(DATA_DIR, "users.db")

# Custom content store (JSON flat files for simplicity)
CUSTOM_BRIEFS_FILE   = os.path.join(DATA_DIR, "custom_briefs.json")
CUSTOM_NOTIFS_FILE   = os.path.join(DATA_DIR, "custom_notifications.json")

os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)


# ── Auth dependency ──────────────────────────────────────────────────────────
def require_admin(x_admin_secret: str = Header(..., alias="X-Admin-Secret")):
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden: invalid admin secret")
    return True


# ── Helpers ──────────────────────────────────────────────────────────────────
def load_json_file(path: str, default):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return default


def save_json_file(path: str, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_all_reports():
    reports = []
    pattern = os.path.join(REPORTS_DIR, "*.json")
    for fpath in sorted(glob.glob(pattern), reverse=True):
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Attach image URL if exists
            img_path = os.path.join(REPORTS_DIR, data.get("image_file", ""))
            data["has_image"] = os.path.exists(img_path)
            reports.append(data)
        except Exception:
            pass
    return reports


def get_users_db():
    if not os.path.exists(USERS_DB):
        return []
    conn = sqlite3.connect(USERS_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT id, name, email, phone, gender, vehicleNumber, createdAt, authProvider FROM users ORDER BY id DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


# ── Pydantic Models ──────────────────────────────────────────────────────────
class ReportStatusUpdate(BaseModel):
    status: Literal["unverified", "verified", "rejected", "action_taken"]
    admin_note: Optional[str] = None


class BriefCreate(BaseModel):
    title: str
    desc: str
    icon: str = "newspaper"
    iconBg: str = "#e0f2fe"
    iconColor: str = "#0284c7"
    link: Optional[str] = None
    pinned: bool = False


class NotificationCreate(BaseModel):
    title: str
    body: str
    type: Literal["info", "warning", "alert"] = "info"
    icon: str = "newspaper"
    iconBg: str = "#e0f2fe"
    iconColor: str = "#0284c7"
    actionLabel: Optional[str] = None
    route: Optional[str] = None


# ── Analytics ────────────────────────────────────────────────────────────────
@router.get("/analytics")
def get_analytics(_: bool = Depends(require_admin)):
    reports = load_all_reports()
    users   = get_users_db()
    briefs  = load_json_file(CUSTOM_BRIEFS_FILE, [])
    notifs  = load_json_file(CUSTOM_NOTIFS_FILE, [])

    # Status breakdown
    status_counts = {}
    type_counts   = {}
    for r in reports:
        s = r.get("status", "unverified")
        t = r.get("typeLabel", "Unknown")
        status_counts[s] = status_counts.get(s, 0) + 1
        type_counts[t]   = type_counts.get(t, 0) + 1

    # Recent activity (last 7 reports)
    recent = reports[:7]

    return {
        "total_reports": len(reports),
        "total_users": len(users),
        "active_briefs": len(briefs),
        "active_notifications": len(notifs),
        "status_breakdown": status_counts,
        "type_breakdown": type_counts,
        "recent_reports": recent,
    }


# ── Reports ──────────────────────────────────────────────────────────────────
@router.get("/reports")
def list_reports(
    status: Optional[str] = None,
    type_filter: Optional[str] = None,
    _: bool = Depends(require_admin),
):
    reports = load_all_reports()
    if status:
        reports = [r for r in reports if r.get("status") == status]
    if type_filter:
        reports = [r for r in reports if r.get("type") == type_filter]
    return {"reports": reports, "count": len(reports)}


@router.get("/reports/{report_id}")
def get_report(report_id: str, _: bool = Depends(require_admin)):
    if not _SAFE_REPORT_ID.match(report_id):
        raise HTTPException(status_code=400, detail="Invalid report id")
    fpath = os.path.join(REPORTS_DIR, f"{report_id}.json")
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="Report not found")
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    img_path = os.path.join(REPORTS_DIR, data.get("image_file", ""))
    data["has_image"] = os.path.exists(img_path)
    return data


@router.patch("/reports/{report_id}/status")
def update_report_status(
    report_id: str,
    body: ReportStatusUpdate,
    _: bool = Depends(require_admin),
):
    if not _SAFE_REPORT_ID.match(report_id):
        raise HTTPException(status_code=400, detail="Invalid report id")
    fpath = os.path.join(REPORTS_DIR, f"{report_id}.json")
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="Report not found")
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    data["status"] = body.status
    if body.admin_note:
        data["admin_note"] = body.admin_note
    data["updated_at"] = datetime.utcnow().isoformat()
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    return {"status": "ok", "report": data}


@router.delete("/reports/{report_id}")
def delete_report(report_id: str, _: bool = Depends(require_admin)):
    if not _SAFE_REPORT_ID.match(report_id):
        raise HTTPException(status_code=400, detail="Invalid report id")
    for ext in [".json", ".jpg", ".pdf"]:
        p = os.path.join(REPORTS_DIR, f"{report_id}{ext}")
        if os.path.exists(p):
            os.remove(p)
    return {"status": "ok", "deleted": report_id}


# ── Custom Briefs ────────────────────────────────────────────────────────────
@router.get("/briefs")
def list_custom_briefs(_: bool = Depends(require_admin)):
    briefs = load_json_file(CUSTOM_BRIEFS_FILE, [])
    return {"briefs": briefs, "count": len(briefs)}


@router.post("/briefs")
def create_brief(body: BriefCreate, _: bool = Depends(require_admin)):
    briefs = load_json_file(CUSTOM_BRIEFS_FILE, [])
    new_id = f"admin_{int(datetime.utcnow().timestamp())}"
    brief = body.dict()
    brief["id"]         = new_id
    brief["created_at"] = datetime.utcnow().isoformat()
    briefs.insert(0, brief)
    save_json_file(CUSTOM_BRIEFS_FILE, briefs)
    return {"status": "ok", "brief": brief}


@router.delete("/briefs/{brief_id}")
def delete_brief(brief_id: str, _: bool = Depends(require_admin)):
    briefs = load_json_file(CUSTOM_BRIEFS_FILE, [])
    briefs = [b for b in briefs if b.get("id") != brief_id]
    save_json_file(CUSTOM_BRIEFS_FILE, briefs)
    return {"status": "ok", "deleted": brief_id}


# ── Custom Notifications ─────────────────────────────────────────────────────
@router.get("/notifications")
def list_custom_notifications(_: bool = Depends(require_admin)):
    notifs = load_json_file(CUSTOM_NOTIFS_FILE, [])
    return {"notifications": notifs, "count": len(notifs)}


@router.post("/notifications")
def create_notification(body: NotificationCreate, _: bool = Depends(require_admin)):
    notifs = load_json_file(CUSTOM_NOTIFS_FILE, [])
    new_id = f"admin_notif_{int(datetime.utcnow().timestamp())}"
    notif  = body.dict()
    notif["id"]         = new_id
    notif["time"]       = datetime.utcnow().isoformat()
    notif["created_at"] = datetime.utcnow().isoformat()
    notifs.insert(0, notif)
    save_json_file(CUSTOM_NOTIFS_FILE, notifs)
    return {"status": "ok", "notification": notif}


@router.delete("/notifications/{notif_id}")
def delete_notification(notif_id: str, _: bool = Depends(require_admin)):
    notifs = load_json_file(CUSTOM_NOTIFS_FILE, [])
    notifs = [n for n in notifs if n.get("id") != notif_id]
    save_json_file(CUSTOM_NOTIFS_FILE, notifs)
    return {"status": "ok", "deleted": notif_id}


# ── Users ────────────────────────────────────────────────────────────────────
@router.get("/users")
def list_users(_: bool = Depends(require_admin)):
    users = get_users_db()
    return {"users": users, "count": len(users)}
