from ..extensions import db
from ..models import AuditLog


# ============================================================
# CREATE AUDIT LOG
# ============================================================

def create_audit_log(
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id=None,
    old_values=None,
    new_values=None,
):
    audit_log = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
    )

    db.session.add(audit_log)
    db.session.flush()

    return audit_log


# ============================================================
# GET AUDIT LOGS
# ============================================================

def get_audit_logs(organization_id):
    return (
        AuditLog.query
        .filter(
            AuditLog.organization_id == organization_id
        )
        .order_by(
            AuditLog.created_at.desc(),
            AuditLog.id.desc(),
        )
        .all()
    )