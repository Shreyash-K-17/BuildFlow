from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Project, ProjectPhase, Task, Worker
from ..schemas.task import (
    CreateTaskSchema,
    UpdateTaskSchema,
)
from ..services.task_service import (
    create_task,
    get_all_tasks,
    update_task,
)
from ..services.audit_service import create_audit_log
from ..utils.auth import role_required
from ..utils.organization import ensure_same_organization


tasks_bp = Blueprint(
    "tasks",
    __name__,
    url_prefix="/api",
)


create_task_schema = CreateTaskSchema()
update_task_schema = UpdateTaskSchema()


def serialize_task(task):
    return {
        "id": task.id,
        "phase_id": task.phase_id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "progress": task.progress,
        "priority": task.priority,
        "assigned_worker_id": task.assigned_worker_id,
        "start_date": (
            task.start_date.isoformat()
            if task.start_date
            else None
        ),
        "due_date": (
            task.due_date.isoformat()
            if task.due_date
            else None
        ),
        "completed_at": (
            task.completed_at.isoformat()
            if task.completed_at
            else None
        ),
        "created_at": (
            task.created_at.isoformat()
            if task.created_at
            else None
        ),
        "updated_at": (
            task.updated_at.isoformat()
            if task.updated_at
            else None
        ),
    }


def get_task_audit_values(task):
    return {
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "progress": task.progress,
        "priority": task.priority,
        "assigned_worker_id": task.assigned_worker_id,
        "start_date": (
            task.start_date.isoformat()
            if task.start_date
            else None
        ),
        "due_date": (
            task.due_date.isoformat()
            if task.due_date
            else None
        ),
    }


def get_phase_with_project(phase_id, current_user):
    phase = db.session.get(
        ProjectPhase,
        phase_id,
    )

    if phase is None:
        return None, None

    project = db.session.get(
        Project,
        phase.project_id,
    )

    ensure_same_organization(
        project,
        current_user,
    )

    return phase, project


@tasks_bp.post("/phases/<int:phase_id>/tasks")
@role_required("admin")
def create_task_endpoint(phase_id, current_user):
    try:
        phase, project = get_phase_with_project(
            phase_id,
            current_user,
        )

        if phase is None:
            return jsonify({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Phase not found.",
                },
            }), 404

        data = create_task_schema.load(
            request.get_json() or {}
        )

        assigned_worker_id = data.get(
            "assigned_worker_id"
        )

        if assigned_worker_id is not None:
            worker = db.session.get(
                Worker,
                assigned_worker_id,
            )

            if worker is None:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Assigned worker not found.",
                    },
                }), 404

            if (
                worker.organization_id
                != current_user.organization_id
            ):
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Assigned worker not found.",
                    },
                }), 404

        task = create_task(
            phase_id=phase.id,
            title=data["title"],
            description=data.get("description"),
            status=data.get(
                "status",
                "not_started",
            ),
            progress=data.get(
                "progress",
                0,
            ),
            priority=data.get(
                "priority",
                "medium",
            ),
            assigned_worker_id=assigned_worker_id,
            start_date=data.get("start_date"),
            due_date=data.get("due_date"),
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="create",
            entity_type="task",
            entity_id=task.id,
            new_values=get_task_audit_values(task),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Task created successfully.",
            "data": {
                "task": serialize_task(task)
            },
        }), 201

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid task data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "TASK_CREATION_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": "Task could not be created.",
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise


@tasks_bp.get("/phases/<int:phase_id>/tasks")
@role_required("admin", "worker")
def get_tasks(phase_id, current_user):
    phase, project = get_phase_with_project(
        phase_id,
        current_user,
    )

    if phase is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "Phase not found.",
            },
        }), 404

    tasks = get_all_tasks(
        phase.id
    )

    return jsonify({
        "success": True,
        "data": {
            "tasks": [
                serialize_task(task)
                for task in tasks
            ]
        },
    }), 200


@tasks_bp.get("/tasks/<int:task_id>")
@role_required("admin", "worker")
def get_task(task_id, current_user):
    task = db.session.get(
        Task,
        task_id,
    )

    if task is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "Task not found.",
            },
        }), 404

    phase = db.session.get(
        ProjectPhase,
        task.phase_id,
    )

    if phase is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "Task not found.",
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
            "task": serialize_task(task)
        },
    }), 200


@tasks_bp.put("/tasks/<int:task_id>")
@role_required("admin")
def update_task_endpoint(task_id, current_user):
    try:
        task = db.session.get(
            Task,
            task_id,
        )

        if task is None:
            return jsonify({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Task not found.",
                },
            }), 404

        phase = db.session.get(
            ProjectPhase,
            task.phase_id,
        )

        if phase is None:
            return jsonify({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Task not found.",
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

        old_values = get_task_audit_values(task)

        data = update_task_schema.load(
            request.get_json() or {}
        )

        assigned_worker_id = data.get(
            "assigned_worker_id"
        )

        if assigned_worker_id is not None:
            worker = db.session.get(
                Worker,
                assigned_worker_id,
            )

            if worker is None:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Assigned worker not found.",
                    },
                }), 404

            if (
                worker.organization_id
                != current_user.organization_id
            ):
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Assigned worker not found.",
                    },
                }), 404

        task = update_task(
            task=task,
            title=data.get("title"),
            description=data.get("description"),
            status=data.get("status"),
            progress=data.get("progress"),
            priority=data.get("priority"),
            assigned_worker_id=assigned_worker_id,
            start_date=data.get("start_date"),
            due_date=data.get("due_date"),
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="update",
            entity_type="task",
            entity_id=task.id,
            old_values=old_values,
            new_values=get_task_audit_values(task),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Task updated successfully.",
            "data": {
                "task": serialize_task(task)
            },
        }), 200

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid task data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "TASK_UPDATE_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": "Task could not be updated.",
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise