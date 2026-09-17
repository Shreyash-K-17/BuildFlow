from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from ..extensions import db
from ..models import Expense, Project
from ..schemas.expense import (
    CreateExpenseSchema,
    UpdateExpenseSchema,
)
from ..services.expense_service import (
    create_expense,
    get_project_expenses,
    update_expense,
)
from ..services.audit_service import create_audit_log
from ..utils.auth import role_required
from ..utils.organization import ensure_same_organization


expenses_bp = Blueprint(
    "expenses",
    __name__,
    url_prefix="/api",
)


create_schema = CreateExpenseSchema()
update_schema = UpdateExpenseSchema()


def get_expense_audit_values(expense):
    return {
        "project_id": expense.project_id,
        "category": expense.category,
        "description": expense.description,
        "amount": str(expense.amount),
        "expense_date": (
            expense.expense_date.isoformat()
            if expense.expense_date
            else None
        ),
    }


def serialize_expense(expense):
    return {
        "id": expense.id,
        "organization_id": expense.organization_id,
        "project_id": expense.project_id,
        "category": expense.category,
        "description": expense.description,
        "amount": str(expense.amount),
        "expense_date": (
            expense.expense_date.isoformat()
            if expense.expense_date
            else None
        ),
        "created_at": (
            expense.created_at.isoformat()
            if expense.created_at
            else None
        ),
        "updated_at": (
            expense.updated_at.isoformat()
            if expense.updated_at
            else None
        ),
    }


@expenses_bp.post("/expenses")
@role_required("admin")
def create_expense_endpoint(current_user):
    try:
        data = create_schema.load(
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

        expense = create_expense(
            organization_id=current_user.organization_id,
            project_id=project.id,
            category=data["category"],
            amount=data["amount"],
            description=data.get("description"),
            expense_date=data["expense_date"],
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="create",
            entity_type="expense",
            entity_id=expense.id,
            new_values=get_expense_audit_values(expense),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Expense created successfully.",
            "data": {
                "expense": serialize_expense(expense)
            },
        }), 201

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "EXPENSE_ERROR",
                "message": str(error),
            },
        }), 400

    except Exception:
        db.session.rollback()
        raise


@expenses_bp.get(
    "/projects/<int:project_id>/expenses"
)
@role_required("admin")
def get_project_expenses_endpoint(
    project_id,
    current_user,
):
    project = db.session.get(
        Project,
        project_id,
    )

    ensure_same_organization(
        project,
        current_user,
    )

    expenses = get_project_expenses(
        project.id
    )

    total = sum(
        expense.amount
        for expense in expenses
    )

    return jsonify({
        "success": True,
        "data": {
            "project_id": project.id,
            "total_expenses": str(total),
            "expenses": [
                serialize_expense(expense)
                for expense in expenses
            ],
        },
    }), 200


@expenses_bp.put(
    "/expenses/<int:expense_id>"
)
@role_required("admin")
def update_expense_endpoint(
    expense_id,
    current_user,
):
    expense = db.session.get(
        Expense,
        expense_id,
    )

    if expense is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "Expense not found.",
            },
        }), 404

    ensure_same_organization(
        expense,
        current_user,
    )

    try:
        old_values = get_expense_audit_values(expense)

        data = update_schema.load(
            request.get_json() or {}
        )

        expense = update_expense(
            expense,
            category=data.get("category"),
            amount=data.get("amount"),
            description=data.get("description"),
            expense_date=data.get("expense_date"),
        )

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="update",
            entity_type="expense",
            entity_id=expense.id,
            old_values=old_values,
            new_values=get_expense_audit_values(expense),
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Expense updated successfully.",
            "data": {
                "expense": serialize_expense(expense)
            },
        }), 200

    except ValidationError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": error.messages,
            },
        }), 400

    except ValueError as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "EXPENSE_ERROR",
                "message": str(error),
            },
        }), 400

    except Exception:
        db.session.rollback()
        raise


@expenses_bp.delete(
    "/expenses/<int:expense_id>"
)
@role_required("admin")
def delete_expense_endpoint(
    expense_id,
    current_user,
):
    expense = db.session.get(
        Expense,
        expense_id,
    )

    if expense is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "Expense not found.",
            },
        }), 404

    ensure_same_organization(
        expense,
        current_user,
    )

    try:
        old_values = get_expense_audit_values(expense)

        create_audit_log(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="delete",
            entity_type="expense",
            entity_id=expense.id,
            old_values=old_values,
        )

        db.session.delete(expense)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Expense deleted successfully.",
        }), 200

    except Exception:
        db.session.rollback()
        raise