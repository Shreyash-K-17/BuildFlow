from flask import Blueprint, jsonify

from ..extensions import db
from ..models import AuditLog
from ..utils.auth import role_required
from ..utils.organization import organization_scoped_query


audit_bp = Blueprint(
    "audit",
    __name__,
    url_prefix="/api/audit-logs",
)


# ============================================================
# GET AUDIT LOGS
# Admin only
# Organization scoped
# Newest first
# ============================================================

@audit_bp.get("")
@role_required("admin")
def get_audit_logs(current_user):
    query = organization_scoped_query(
        AuditLog.query,
        AuditLog,
        current_user,
    )

    audit_logs = query.order_by(
        AuditLog.created_at.desc(),
        AuditLog.id.desc(),
    ).all()

    return jsonify({
        "success": True,
        "data": {
            "audit_logs": [
                {
                    "id": audit_log.id,
                    "organization_id": audit_log.organization_id,
                    "user_id": audit_log.user_id,
                    "action": audit_log.action,
                    "entity_type": audit_log.entity_type,
                    "entity_id": audit_log.entity_id,
                    "old_values": audit_log.old_values,
                    "new_values": audit_log.new_values,
                    "created_at": (
                        audit_log.created_at.isoformat()
                        if audit_log.created_at
                        else None
                    ),
                }
                for audit_log in audit_logs
            ]
        },
    }), 200