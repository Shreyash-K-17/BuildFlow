from flask import Blueprint

from ..extensions import db

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.get("/health")
def health():
    try:
        with db.engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")

        return {
            "status": "ok",
            "database": "connected"
        }, 200

    except Exception as error:
        return {
            "status": "error",
            "database": "disconnected",
            "message": str(error)
        }, 500