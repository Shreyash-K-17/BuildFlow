from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import db, migrate
from .routes import (
    auth_bp,
    health_bp,
    workers_bp,
    projects_bp,
    phases_bp,
    tasks_bp,
    task_dependencies_bp,
    attendance_bp,
    inventory_bp,
    expenses_bp,
    dashboard_bp,
)
from .routes.audit import audit_bp
from .errors import register_error_handlers


def create_app():
    app = Flask(__name__)

    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)

    cors_origins = app.config.get("CORS_ORIGINS", "http://localhost:3000")
    if isinstance(cors_origins, str):
        if cors_origins == "*":
            origins_list = "*"
        else:
            origins_list = [
                origin.strip()
                for origin in cors_origins.split(",")
                if origin.strip()
            ]
    else:
        origins_list = cors_origins

    CORS(
        app,
        origins=origins_list,
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    from . import models  # noqa: F401

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(workers_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(phases_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(task_dependencies_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(expenses_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(audit_bp)

    register_error_handlers(app)

    return app