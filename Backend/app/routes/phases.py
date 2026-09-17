from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Project, ProjectPhase
from ..schemas.phase import (
    CreatePhaseSchema,
    UpdatePhaseSchema,
)
from ..services.phase_service import (
    create_phase,
    get_all_phases,
    update_phase,
)
from ..services.audit_service import create_audit_log
from ..utils.auth import role_required
from ..utils.organization import ensure_same_organization


phases_bp = Blueprint(
    "phases",
    __name__,
    url_prefix="/api",
)


create_phase_schema = CreatePhaseSchema()
update_phase_schema = UpdatePhaseSchema()


def get_phase_audit_values(phase):
    return {
        "project_id": phase.project_id,
        "name": phase.name,
        "description": phase.description,
        "phase_order": phase.phase_order,
    }


def serialize_phase(phase):
    return {
        "id": phase.id,
        "project_id": phase.project_id,
        "name": phase.name,
        "description": phase.description,
        "phase_order": phase.phase_order,
        "created_at": (
            phase.created_at.isoformat()
            if phase.created_at
            else None
        ),
        "updated_at": (
            phase.updated_at.isoformat()
            if phase.updated_at
            else None
        ),
    }


@phases_bp.post("/projects/<int:project_id>/phases")
@role_required("admin")
def create_phase_endpoint(project_id, current_user):
    try:
        project = db.session.get(
            Project,
            project_id,
        )

        project = ensure_same_organization(
            project,
            current_user,
        )

        data = create_phase_schema.load(
            request.get_json() or {}
        )

        phase = create_phase(
            project_id=project.id,
            name=data["name"],
            description=data.get("description"),
            phase_order=data["phase_order"],
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="create",
            entity_type="phase",
            entity_id=phase.id,
            new_values=get_phase_audit_values(phase),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Phase created successfully.",
            "data": {
                "phase": serialize_phase(phase)
            },
        }), 201

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid phase data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "PHASE_CREATION_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": "Phase could not be created.",
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise


@phases_bp.get("/projects/<int:project_id>/phases")
@role_required("admin", "worker")
def get_phases(project_id, current_user):
    project = db.session.get(
        Project,
        project_id,
    )

    project = ensure_same_organization(
        project,
        current_user,
    )

    phases = get_all_phases(project.id)

    return jsonify({
        "success": True,
        "data": {
            "phases": [
                serialize_phase(phase)
                for phase in phases
            ]
        },
    }), 200


@phases_bp.get("/phases/<int:phase_id>")
@role_required("admin", "worker")
def get_phase(phase_id, current_user):
    phase = db.session.get(
        ProjectPhase,
        phase_id,
    )

    if phase is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "Phase not found.",
            },
        }), 404

    project = db.session.get(
        Project,
        phase.project_id,
    )

    ensure_same_organization(
        project,
        current_user,
    )

    return jsonify({
        "success": True,
        "data": {
            "phase": serialize_phase(phase)
        },
    }), 200


@phases_bp.put("/phases/<int:phase_id>")
@role_required("admin")
def update_phase_endpoint(phase_id, current_user):
    try:
        phase = db.session.get(
            ProjectPhase,
            phase_id,
        )

        if phase is None:
            return jsonify({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Phase not found.",
                },
            }), 404

        project = db.session.get(
            Project,
            phase.project_id,
        )

        ensure_same_organization(
            project,
            current_user,
        )

        data = update_phase_schema.load(
            request.get_json() or {}
        )

        old_values = get_phase_audit_values(phase)

        phase = update_phase(
            phase=phase,
            name=data.get("name"),
            description=data.get("description"),
            phase_order=data.get("phase_order"),
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="update",
            entity_type="phase",
            entity_id=phase.id,
            old_values=old_values,
            new_values=get_phase_audit_values(phase),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Phase updated successfully.",
            "data": {
                "phase": serialize_phase(phase)
            },
        }), 200

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid phase data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "PHASE_UPDATE_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": "Phase could not be updated.",
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise