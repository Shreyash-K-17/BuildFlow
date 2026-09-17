from flask import Blueprint, current_app, jsonify

from ..extensions import db

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.get("/health")
def health():
    try:
        with db.engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")

        return jsonify({
            "status": "ok",
            "database": "connected"
        }), 200

    except Exception as error:
        current_app.logger.error("Database health check failed: %s", error)
        return jsonify({
            "status": "error",
            "database": "disconnected"
        }), 500