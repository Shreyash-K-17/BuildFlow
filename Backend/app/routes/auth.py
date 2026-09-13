from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import User
from ..schemas.auth import LoginSchema, RegisterSchema
from ..services.auth_service import authenticate_user, register_admin
from ..utils.jwt import jwt_required


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)

register_schema = RegisterSchema()
login_schema = LoginSchema()


@auth_bp.post("/register")
def register():
    try:
        data = register_schema.load(request.get_json() or {})

        user, organization, token = register_admin(
            organization_name=data["organization_name"],
            username=data["username"],
            email=data["email"],
            password=data["password"],
        )

        return jsonify({
            "success": True,
            "message": "Admin account created successfully.",
            "data": {
                "access_token": token,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role,
                    "organization_id": organization.id,
                }
            }
        }), 201

    except ValidationError as error:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid registration data.",
                "details": error.messages,
            }
        }), 400

    except ValueError as error:
        return jsonify({
            "success": False,
            "error": {
                "code": "REGISTRATION_ERROR",
                "message": str(error),
            }
        }), 409

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "error": {
                "code": "CONFLICT",
                "message": "An account or organization with these details already exists."
            }
        }), 409


@auth_bp.post("/login")
def login():
    try:
        data = login_schema.load(request.get_json() or {})

    except ValidationError as error:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid login data.",
                "details": error.messages,
            }
        }), 400

    result = authenticate_user(
        email=data["email"],
        password=data["password"],
    )

    if result is None:
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password."
            }
        }), 401

    user, token = result

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "data": {
            "access_token": token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "organization_id": user.organization_id,
            }
        }
    }), 200


@auth_bp.get("/me")
@jwt_required
def me(current_user: User):
    return jsonify({
        "success": True,
        "data": {
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email,
                "role": current_user.role,
                "organization_id": current_user.organization_id,
                "is_active": current_user.is_active,
            }
        }
    }), 200