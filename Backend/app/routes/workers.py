from flask import Blueprint, abort, jsonify, request
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Worker
from ..schemas.worker import (
    CreateWorkerSchema,
    UpdateWorkerSchema,
)
from ..services.worker_service import (
    UNSET,
    create_worker,
    update_worker,
)
from ..services.audit_service import create_audit_log
from ..utils.auth import role_required
from ..utils.organization import (
    ensure_same_organization,
    organization_scoped_query,
)


workers_bp = Blueprint(
    "workers",
    __name__,
    url_prefix="/api/workers",
)

create_worker_schema = CreateWorkerSchema()
update_worker_schema = UpdateWorkerSchema()


# ============================================================
# AUDIT HELPER
# ============================================================

def get_worker_audit_values(worker):
    return {
        "name": worker.name,
        "phone": worker.phone,
        "email": worker.email,
        "worker_type": worker.worker_type,
        "daily_wage": (
            str(worker.daily_wage)
            if worker.daily_wage is not None
            else None
        ),
        "is_active": worker.is_active,
        "joined_date": (
            worker.joined_date.isoformat()
            if worker.joined_date
            else None
        ),
        "user_id": worker.user_id,
    }


def serialize_worker(worker):
    return {
        "id": worker.id,
        "name": worker.name,
        "phone": worker.phone,
        "email": worker.email,
        "worker_type": worker.worker_type,
        "daily_wage": (
            str(worker.daily_wage)
            if worker.daily_wage is not None
            else None
        ),
        "is_active": worker.is_active,
        "joined_date": (
            worker.joined_date.isoformat()
            if worker.joined_date
            else None
        ),
        "user_id": worker.user_id,
        "organization_id": worker.organization_id,
    }


# ============================================================
# CREATE WORKER
# Admin only
# ============================================================

@workers_bp.post("")
@role_required("admin")
def create_worker_endpoint(current_user):
    try:
        data = create_worker_schema.load(
            request.get_json() or {}
        )

        worker, user = create_worker(
            organization_id=current_user.organization_id,
            username=data["username"],
            email=data["email"],
            password=data["password"],
            full_name=data["full_name"],
            phone=data.get("phone"),
            worker_type=data.get("worker_type"),
            daily_wage=data.get("daily_wage"),
            joined_date=data.get("joined_date"),
        )

        # ----------------------------------------------------
        # AUDIT LOG
        # ----------------------------------------------------

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="create",
            entity_type="worker",
            entity_id=worker.id,
            new_values=get_worker_audit_values(worker),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Worker created successfully.",
            "data": {
                "worker": serialize_worker(worker)
            },
        }), 201

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid worker data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "WORKER_CREATION_ERROR",
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
                    "A worker account with these details "
                    "already exists."
                ),
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise


# ============================================================
# GET ALL WORKERS
# Admin + Worker
# Organization scoped
# ============================================================

@workers_bp.get("")
@role_required("admin", "worker")
def get_workers(current_user):
    query = organization_scoped_query(
        Worker.query,
        Worker,
        current_user,
    )

    if current_user.role == "worker":
        query = query.filter(
            Worker.user_id == current_user.id
        )

    workers = query.order_by(
        Worker.id.asc()
    ).all()

    return jsonify({
        "success": True,
        "data": {
            "workers": [
                serialize_worker(worker)
                for worker in workers
            ]
        },
    }), 200


# ============================================================
# GET SINGLE WORKER
# Admin + Worker
# Organization scoped
# ============================================================

@workers_bp.get("/<int:worker_id>")
@role_required("admin", "worker")
def get_worker(worker_id, current_user):
    worker = db.session.get(
        Worker,
        worker_id,
    )

    worker = ensure_same_organization(
        worker,
        current_user,
    )

    if current_user.role == "worker" and worker.user_id != current_user.id:
        abort(404)

    return jsonify({
        "success": True,
        "data": {
            "worker": serialize_worker(worker)
        },
    }), 200


# ============================================================
# UPDATE WORKER
# Admin only
# Organization scoped
# ============================================================

@workers_bp.put("/<int:worker_id>")
@role_required("admin")
def update_worker_endpoint(worker_id, current_user):
    try:
        # ----------------------------------------------------
        # Find worker
        # ----------------------------------------------------

        worker = db.session.get(
            Worker,
            worker_id,
        )

        worker = ensure_same_organization(
            worker,
            current_user,
        )

        # ----------------------------------------------------
        # Validate request
        # ----------------------------------------------------

        data = update_worker_schema.load(
            request.get_json() or {}
        )

        # ----------------------------------------------------
        # Capture old values BEFORE update
        # ----------------------------------------------------

        old_values = get_worker_audit_values(worker)

        # ----------------------------------------------------
        # Update worker
        # ----------------------------------------------------

        joined_date_param = (
            data["joined_date"]
            if "joined_date" in data
            else UNSET
        )

        worker, user = update_worker(
            worker=worker,
            username=data.get("username"),
            email=data.get("email"),
            full_name=data.get("full_name"),
            phone=data.get("phone"),
            worker_type=data.get("worker_type"),
            daily_wage=data.get("daily_wage"),
            is_active=data.get("is_active"),
            joined_date=joined_date_param,
        )

        # ----------------------------------------------------
        # Create audit log
        # ----------------------------------------------------

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="update",
            entity_type="worker",
            entity_id=worker.id,
            old_values=old_values,
            new_values=get_worker_audit_values(worker),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Worker updated successfully.",
            "data": {
                "worker": serialize_worker(worker)
            },
        }), 200

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid worker data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "WORKER_UPDATE_ERROR",
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
                    "A worker account with these details "
                    "already exists."
                ),
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise
