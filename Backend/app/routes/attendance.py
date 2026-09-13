from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Attendance, Project, Worker
from ..schemas.attendance import (
    CreateAttendanceSchema,
    UpdateAttendanceSchema,
)
from ..services.attendance_service import (
    create_attendance,
    get_project_attendance,
    update_attendance,
)
from ..services.audit_service import create_audit_log
from ..utils.auth import role_required
from ..utils.organization import ensure_same_organization


attendance_bp = Blueprint(
    "attendance",
    __name__,
    url_prefix="/api",
)


create_attendance_schema = CreateAttendanceSchema()
update_attendance_schema = UpdateAttendanceSchema()


def get_attendance_audit_values(attendance):
    return {
        "worker_id": attendance.worker_id,
        "project_id": attendance.project_id,
        "attendance_date": (
            attendance.attendance_date.isoformat()
            if attendance.attendance_date
            else None
        ),
        "status": attendance.status,
        "check_in": (
            attendance.check_in.isoformat()
            if attendance.check_in
            else None
        ),
        "check_out": (
            attendance.check_out.isoformat()
            if attendance.check_out
            else None
        ),
        "notes": attendance.notes,
    }


def serialize_attendance(attendance):
    return {
        "id": attendance.id,
        "worker_id": attendance.worker_id,
        "project_id": attendance.project_id,
        "attendance_date": (
            attendance.attendance_date.isoformat()
        ),
        "status": attendance.status,
        "check_in": (
            attendance.check_in.isoformat()
            if attendance.check_in
            else None
        ),
        "check_out": (
            attendance.check_out.isoformat()
            if attendance.check_out
            else None
        ),
        "notes": attendance.notes,
        "created_at": (
            attendance.created_at.isoformat()
            if attendance.created_at
            else None
        ),
        "updated_at": (
            attendance.updated_at.isoformat()
            if attendance.updated_at
            else None
        ),
    }


@attendance_bp.post("/attendance")
@role_required("admin")
def create_attendance_endpoint(current_user):
    try:
        data = create_attendance_schema.load(
            request.get_json() or {}
        )

        project = db.session.get(
            Project,
            data["project_id"],
        )

        ensure_same_organization(
            project,
            current_user,
        )

        worker = db.session.get(
            Worker,
            data["worker_id"],
        )

        if worker is None:
            return jsonify({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Worker not found.",
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
                    "message": "Worker not found.",
                },
            }), 404

        attendance = create_attendance(
            worker_id=data["worker_id"],
            project_id=data["project_id"],
            attendance_date=data["attendance_date"],
            status=data.get("status", "present"),
            check_in=data.get("check_in"),
            check_out=data.get("check_out"),
            notes=data.get("notes"),
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="create",
            entity_type="attendance",
            entity_id=attendance.id,
            new_values=get_attendance_audit_values(
                attendance
            ),
        )

        return jsonify({
            "success": True,
            "message": "Attendance recorded successfully.",
            "data": {
                "attendance": serialize_attendance(
                    attendance
                )
            },
        }), 201

    except ValidationError as error:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid attendance data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        return jsonify({
            "success": False,
            "error": {
                "code": "ATTENDANCE_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": (
                    "Attendance already exists for "
                    "this worker, project and date."
                ),
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise


@attendance_bp.get("/projects/<int:project_id>/attendance")
@role_required("admin", "worker")
def get_attendance(project_id, current_user):
    project = db.session.get(
        Project,
        project_id,
    )

    ensure_same_organization(
        project,
        current_user,
    )

    records = get_project_attendance(
        project.id
    )

    return jsonify({
        "success": True,
        "data": {
            "attendance": [
                serialize_attendance(record)
                for record in records
            ]
        },
    }), 200


@attendance_bp.put("/attendance/<int:attendance_id>")
@role_required("admin")
def update_attendance_endpoint(
    attendance_id,
    current_user,
):
    try:
        attendance = db.session.get(
            Attendance,
            attendance_id,
        )

        if attendance is None:
            return jsonify({
                "success": False,
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Attendance record not found.",
                },
            }), 404

        project = db.session.get(
            Project,
            attendance.project_id,
        )

        ensure_same_organization(
            project,
            current_user,
        )

        old_values = get_attendance_audit_values(
            attendance
        )

        data = update_attendance_schema.load(
            request.get_json() or {}
        )

        attendance = update_attendance(
            attendance=attendance,
            status=data.get("status"),
            check_in=data.get("check_in"),
            check_out=data.get("check_out"),
            notes=data.get("notes"),
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="update",
            entity_type="attendance",
            entity_id=attendance.id,
            old_values=old_values,
            new_values=get_attendance_audit_values(
                attendance
            ),
        )

        return jsonify({
            "success": True,
            "message": "Attendance updated successfully.",
            "data": {
                "attendance": serialize_attendance(
                    attendance
                )
            },
        }), 200

    except ValidationError as error:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid attendance data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        return jsonify({
            "success": False,
            "error": {
                "code": "ATTENDANCE_UPDATE_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()
        raise

    except Exception:
        db.session.rollback()
        raise