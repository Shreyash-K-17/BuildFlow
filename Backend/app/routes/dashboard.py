from flask import Blueprint, jsonify

from ..services.dashboard_service import get_dashboard_data
from ..utils.auth import role_required


dashboard_bp = Blueprint(
    "dashboard",
    __name__,
    url_prefix="/api",
)


@dashboard_bp.get("/dashboard")
@role_required("admin")
def get_dashboard(current_user):
    dashboard_data = get_dashboard_data(
        current_user.organization_id
    )

    return jsonify({
        "success": True,
        "data": dashboard_data,
    }), 200