from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import InventoryTransaction, Material, Project
from ..schemas.material import (
    CreateInventoryTransactionSchema,
    CreateMaterialSchema,
    UpdateMaterialSchema,
)
from ..services.inventory_service import (
    create_inventory_transaction,
    create_material,
    get_materials,
    get_paginated_inventory_transactions,
    update_material,
)
from ..services.audit_service import create_audit_log
from ..utils.auth import role_required
from ..utils.organization import ensure_same_organization


inventory_bp = Blueprint(
    "inventory",
    __name__,
    url_prefix="/api",
)


create_material_schema = CreateMaterialSchema()
update_material_schema = UpdateMaterialSchema()
create_transaction_schema = CreateInventoryTransactionSchema()

def get_material_audit_values(material):
    return {
        "name": material.name,
        "unit": material.unit,
        "current_stock": str(material.current_stock),
        "minimum_stock": str(material.minimum_stock),
        "unit_cost": (
            str(material.unit_cost)
            if material.unit_cost is not None
            else None
        ),
    }


def get_transaction_audit_values(transaction, current_stock=None):
    values = {
        "material_id": transaction.material_id,
        "project_id": transaction.project_id,
        "transaction_type": transaction.transaction_type,
        "quantity": str(transaction.quantity),
        "unit_cost": (
            str(transaction.unit_cost)
            if transaction.unit_cost is not None
            else None
        ),
        "notes": transaction.notes,
    }

    if current_stock is not None:
        values["current_stock_after"] = str(current_stock)

    return values


def serialize_material(material):
    return {
        "id": material.id,
        "organization_id": material.organization_id,
        "name": material.name,
        "unit": material.unit,
        "current_stock": str(material.current_stock),
        "minimum_stock": str(material.minimum_stock),
        "unit_cost": (
            str(material.unit_cost)
            if material.unit_cost is not None
            else None
        ),
        "low_stock": (
            material.current_stock <= material.minimum_stock
        ),
        "created_at": (
            material.created_at.isoformat()
            if material.created_at
            else None
        ),
        "updated_at": (
            material.updated_at.isoformat()
            if material.updated_at
            else None
        ),
    }


def serialize_transaction(transaction):
    return {
        "id": transaction.id,
        "material_id": transaction.material_id,
        "project_id": transaction.project_id,
        "transaction_type": transaction.transaction_type,
        "quantity": str(transaction.quantity),
        "unit_cost": (
            str(transaction.unit_cost)
            if transaction.unit_cost is not None
            else None
        ),
        "notes": transaction.notes,
        "created_at": (
            transaction.created_at.isoformat()
            if transaction.created_at
            else None
        ),
    }


@inventory_bp.post("/materials")
@role_required("admin")
def create_material_endpoint(current_user):
    try:
        data = create_material_schema.load(
            request.get_json() or {}
        )

        material = create_material(
            organization_id=current_user.organization_id,
            name=data["name"],
            unit=data["unit"],
            current_stock=data.get("current_stock", 0),
            minimum_stock=data.get("minimum_stock", 0),
            unit_cost=data.get("unit_cost"),
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="create",
            entity_type="material",
            entity_id=material.id,
            new_values=get_material_audit_values(material),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Material created successfully.",
            "data": {
                "material": serialize_material(material)
            },
        }), 201

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid material data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "MATERIAL_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": "Material already exists.",
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise


@inventory_bp.get("/materials")
@role_required("admin", "worker")
def get_materials_endpoint(current_user):
    materials = get_materials(
        current_user.organization_id
    )

    return jsonify({
        "success": True,
        "data": {
            "materials": [
                serialize_material(material)
                for material in materials
            ]
        },
    }), 200


@inventory_bp.put("/materials/<int:material_id>")
@role_required("admin")
def update_material_endpoint(
    material_id,
    current_user,
):
    try:
        material = db.session.get(
            Material,
            material_id,
        )

        material = ensure_same_organization(
            material,
            current_user,
        )

        old_values = get_material_audit_values(material)

        data = update_material_schema.load(
            request.get_json() or {}
        )

        material = update_material(
            material=material,
            name=data.get("name"),
            unit=data.get("unit"),
            minimum_stock=data.get("minimum_stock"),
            unit_cost=data.get("unit_cost"),
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="update",
            entity_type="material",
            entity_id=material.id,
            old_values=old_values,
            new_values=get_material_audit_values(material),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Material updated successfully.",
            "data": {
                "material": serialize_material(material)
            },
        }), 200

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid material data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "MATERIAL_UPDATE_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()
        raise

    except Exception:
        db.session.rollback()
        raise


@inventory_bp.post("/inventory/transactions")
@role_required("admin")
def create_transaction_endpoint(current_user):
    try:
        data = create_transaction_schema.load(
            request.get_json() or {}
        )

        project_id = data.get("project_id")

        if project_id is not None:
            project = db.session.get(
                Project,
                project_id,
            )

            ensure_same_organization(
                project,
                current_user,
            )

        transaction, material = create_inventory_transaction(
            organization_id=current_user.organization_id,
            material_id=data["material_id"],
            project_id=project_id,
            transaction_type=data["transaction_type"],
            quantity=data["quantity"],
            unit_cost=data.get("unit_cost"),
            notes=data.get("notes"),
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="create",
            entity_type="inventory_transaction",
            entity_id=transaction.id,
            new_values=get_transaction_audit_values(
                transaction,
                current_stock=material.current_stock,
            ),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Inventory transaction recorded successfully.",
            "data": {
                "transaction": serialize_transaction(
                    transaction
                ),
                "current_stock": str(
                    material.current_stock
                ),
            },
        }), 201

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid inventory data.",
                "details": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "INVENTORY_ERROR",
                "message": str(error),
            },
        }), 409

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": "Inventory transaction failed.",
            },
        }), 409

    except Exception:
        db.session.rollback()
        raise


@inventory_bp.get("/materials/<int:material_id>/transactions")
@role_required("admin", "worker")
def get_material_transactions(
    material_id,
    current_user,
):
    material = db.session.get(
        Material,
        material_id,
    )

    material = ensure_same_organization(
        material,
        current_user,
    )

    raw_page = request.args.get("page", 1)
    raw_per_page = request.args.get("per_page", 25)

    try:
        page = int(raw_page)
        per_page = int(raw_per_page)
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid pagination parameters: page and per_page must be integers.",
            },
        }), 400

    if page < 1:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "page must be greater than or equal to 1.",
            },
        }), 400

    if per_page < 1:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "per_page must be greater than or equal to 1.",
            },
        }), 400

    if per_page > 100:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "per_page cannot exceed 100.",
            },
        }), 400

    transactions, total, pages = get_paginated_inventory_transactions(
        material_id=material.id,
        page=page,
        per_page=per_page,
    )

    return jsonify({
        "success": True,
        "data": {
            "transactions": [
                serialize_transaction(transaction)
                for transaction in transactions
            ],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": pages,
            },
        },
    }), 200