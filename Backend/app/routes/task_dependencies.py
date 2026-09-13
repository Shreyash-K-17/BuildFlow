from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Project, ProjectPhase, Task, TaskDependency
from ..services.task_dependency_service import (
    create_dependency,
    get_dependencies,
    delete_dependency,
)
from ..utils.auth import role_required
from ..utils.organization import ensure_same_organization


task_dependencies_bp = Blueprint(
    "task_dependencies",
    __name__,
    url_prefix="/api",
)


def get_task_with_project(task_id, current_user):
    task = db.session.get(Task, task_id)

    if task is None:
        return None, None

    phase = db.session.get(
        ProjectPhase,
        task.phase_id,
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

    return task, project


def serialize_dependency(dependency):
    return {
        "id": dependency.id,
        "task_id": dependency.task_id,
        "depends_on_task_id": dependency.depends_on_task_id,
    }


@task_dependencies_bp.post(
    "/tasks/<int:task_id>/dependencies"
)
@role_required("admin")
def create_dependency_endpoint(task_id, current_user):
    try:
        task, project = get_task_with_project(
            task_id,
            current_user,
        )

        if task is None:
            return jsonify({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Task not found.",
                },
            }), 404

        data = request.get_json() or {}

        depends_on_task_id = data.get(
            "depends_on_task_id"
        )

        if not isinstance(depends_on_task_id, int):
            return jsonify({
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": (
                        "depends_on_task_id must be an integer."
                    ),
                },
            }), 400

        depends_on_task = db.session.get(
            Task,
            depends_on_task_id,
        )

        if depends_on_task is None:
            return jsonify({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Dependency task not found.",
                },
            }), 404

        dependency = create_dependency(
            task,
            depends_on_task,
        )

        return jsonify({
            "success": True,
            "message": "Task dependency created successfully.",
            "data": {
                "dependency": serialize_dependency(
                    dependency
                )
            },
        }), 201

    except ValueError as error:
        return jsonify({
            "success": False,
            "error": {
                "code": "DEPENDENCY_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": "Dependency could not be created.",
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise


@task_dependencies_bp.get(
    "/tasks/<int:task_id>/dependencies"
)
@role_required("admin", "worker")
def get_task_dependencies(task_id, current_user):
    task, project = get_task_with_project(
        task_id,
        current_user,
    )

    if task is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "Task not found.",
            },
        }), 404

    dependencies = get_dependencies(task.id)

    return jsonify({
        "success": True,
        "data": {
            "dependencies": [
                serialize_dependency(dependency)
                for dependency in dependencies
            ]
        },
    }), 200


@task_dependencies_bp.delete(
    "/tasks/<int:task_id>/dependencies/<int:dependency_id>"
)
@role_required("admin")
def delete_task_dependency(
    task_id,
    dependency_id,
    current_user,
):
    task, project = get_task_with_project(
        task_id,
        current_user,
    )

    if task is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "Task not found.",
            },
        }), 404

    dependency = db.session.get(
        TaskDependency,
        dependency_id,
    )

    if dependency is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "Dependency not found.",
            },
        }), 404

    if dependency.task_id != task.id:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "Dependency not found.",
            },
        }), 404

    delete_dependency(dependency)

    return jsonify({
        "success": True,
        "message": "Task dependency deleted successfully.",
    }), 200