from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Project
from ..schemas.project import (
    CreateProjectSchema,
    UpdateProjectSchema,
)
from ..services.project_service import (
    create_project,
    get_all_projects,
    update_project,
)
from ..services.audit_service import create_audit_log
from ..utils.auth import role_required
from ..utils.organization import ensure_same_organization


projects_bp = Blueprint(
    "projects",
    __name__,
    url_prefix="/api/projects",
)


create_project_schema = CreateProjectSchema()
update_project_schema = UpdateProjectSchema()


def serialize_project(project):
    return {
        "id": project.id,
        "organization_id": project.organization_id,
        "name": project.name,
        "description": project.description,
        "client_name": project.client_name,
        "location": project.location,
        "status": project.status,
        "budget": str(project.budget),
        "start_date": (
            project.start_date.isoformat()
            if project.start_date
            else None
        ),
        "expected_end_date": (
            project.expected_end_date.isoformat()
            if project.expected_end_date
            else None
        ),
        "actual_end_date": (
            project.actual_end_date.isoformat()
            if project.actual_end_date
            else None
        ),
        "created_at": (
            project.created_at.isoformat()
            if project.created_at
            else None
        ),
        "updated_at": (
            project.updated_at.isoformat()
            if project.updated_at
            else None
        ),
    }


def get_project_audit_values(project):
    return {
        "name": project.name,
        "description": project.description,
        "client_name": project.client_name,
        "location": project.location,
        "status": project.status,
        "budget": str(project.budget),
        "start_date": (
            project.start_date.isoformat()
            if project.start_date
            else None
        ),
        "expected_end_date": (
            project.expected_end_date.isoformat()
            if project.expected_end_date
            else None
        ),
        "actual_end_date": (
            project.actual_end_date.isoformat()
            if project.actual_end_date
            else None
        ),
    }


# ============================================================
# CREATE PROJECT
# Admin only
# ============================================================

@projects_bp.post("")
@role_required("admin")
def create_project_endpoint(current_user):
    try:
        data = create_project_schema.load(
            request.get_json() or {}
        )

        project = create_project(
            organization_id=current_user.organization_id,
            name=data["name"],
            description=data.get("description"),
            client_name=data.get("client_name"),
            location=data.get("location"),
            status=data.get("status", "planning"),
            budget=data.get("budget", 0),
            start_date=data.get("start_date"),
            expected_end_date=data.get("expected_end_date"),
            actual_end_date=data.get("actual_end_date"),
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="create",
            entity_type="project",
            entity_id=project.id,
            new_values=get_project_audit_values(project),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Project created successfully.",
            "data": {
                "project": serialize_project(project)
            },
        }), 201

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid project data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "PROJECT_CREATION_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": "Project could not be created.",
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise


# ============================================================
# GET ALL PROJECTS
# Admin + Worker
# Organization scoped
# ============================================================

@projects_bp.get("")
@role_required("admin", "worker")
def get_projects(current_user):
    projects = get_all_projects(
        current_user.organization_id
    )

    return jsonify({
        "success": True,
        "data": {
            "projects": [
                serialize_project(project)
                for project in projects
            ]
        },
    }), 200


# ============================================================
# GET SINGLE PROJECT
# Admin + Worker
# Organization scoped
# ============================================================

@projects_bp.get("/<int:project_id>")
@role_required("admin", "worker")
def get_project(project_id, current_user):
    project = db.session.get(
        Project,
        project_id,
    )

    project = ensure_same_organization(
        project,
        current_user,
    )

    return jsonify({
        "success": True,
        "data": {
            "project": serialize_project(project)
        },
    }), 200


# ============================================================
# UPDATE PROJECT
# Admin only
# Organization scoped
# ============================================================

@projects_bp.put("/<int:project_id>")
@role_required("admin")
def update_project_endpoint(project_id, current_user):
    try:
        project = db.session.get(
            Project,
            project_id,
        )

        project = ensure_same_organization(
            project,
            current_user,
        )

        old_values = get_project_audit_values(project)

        data = update_project_schema.load(
            request.get_json() or {}
        )

        project = update_project(
            project=project,
            name=data.get("name"),
            description=data.get("description"),
            client_name=data.get("client_name"),
            location=data.get("location"),
            status=data.get("status"),
            budget=data.get("budget"),
            start_date=data.get("start_date"),
            expected_end_date=data.get("expected_end_date"),
            actual_end_date=data.get("actual_end_date"),
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="update",
            entity_type="project",
            entity_id=project.id,
            old_values=old_values,
            new_values=get_project_audit_values(project),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Project updated successfully.",
            "data": {
                "project": serialize_project(project)
            },
        }), 200

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid project data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "PROJECT_UPDATE_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": "Project could not be updated.",
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise