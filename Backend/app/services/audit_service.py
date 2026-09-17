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


def get_paginated_audit_logs(organization_id, page=1, per_page=25):
    base_query = (
        AuditLog.query
        .filter(
            AuditLog.organization_id == organization_id
        )
    )

    total = base_query.count()
    pages = (total + per_page - 1) // per_page if total > 0 else 0

    offset = (page - 1) * per_page
    audit_logs = (
        base_query
        .order_by(
            AuditLog.created_at.desc(),
            AuditLog.id.desc(),
        )
        .limit(per_page)
        .offset(offset)
        .all()
    )

    return audit_logs, total, pages