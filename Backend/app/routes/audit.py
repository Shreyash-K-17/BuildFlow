from flask import Blueprint, jsonify, request

from ..services.audit_service import get_paginated_audit_logs
from ..utils.auth import role_required


audit_bp = Blueprint(
    "audit",
    __name__,
    url_prefix="/api/audit-logs",
)


# ============================================================
# GET AUDIT LOGS
# Admin only
# Organization scoped
# Newest first, paginated
# ============================================================

@audit_bp.get("")
@role_required("admin")
def get_audit_logs(current_user):
    raw_page = request.args.get("page", 1)
    raw_per_page = request.args.get("per_page", 25)

    try:
        page = int(raw_page)
        per_page = int(raw_per_page)
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid pagination parameters: page and per_page must be integers.",
            },
        }), 400

    if page < 1:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "page must be greater than or equal to 1.",
            },
        }), 400

    if per_page < 1:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "per_page must be greater than or equal to 1.",
            },
        }), 400

    if per_page > 100:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "per_page cannot exceed 100.",
            },
        }), 400

    audit_logs, total, pages = get_paginated_audit_logs(
        organization_id=current_user.organization_id,
        page=page,
        per_page=per_page,
    )

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
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": pages,
            },
        },
    }), 200