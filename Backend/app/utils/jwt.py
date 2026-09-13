from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, jsonify, request

from ..extensions import db
from ..models import User


ACCESS_TOKEN_EXPIRES = timedelta(hours=8)


def create_access_token(user):
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user.id),
        "organization_id": user.organization_id,
        "role": user.role,
        "iat": now,
        "exp": now + ACCESS_TOKEN_EXPIRES,
        "type": "access",
    }

    return jwt.encode(
        payload,
        current_app.config["SECRET_KEY"],
        algorithm="HS256",
    )


def decode_access_token(token):
    return jwt.decode(
        token,
        current_app.config["SECRET_KEY"],
        algorithms=["HS256"],
    )


def jwt_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        authorization = request.headers.get("Authorization", "")

        if not authorization.startswith("Bearer "):
            return jsonify({
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "A valid Bearer token is required."
                }
            }), 401

        token = authorization.split(" ", 1)[1].strip()

        if not token:
            return jsonify({
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "A valid Bearer token is required."
                }
            }), 401

        try:
            payload = decode_access_token(token)

            if payload.get("type") != "access":
                raise jwt.InvalidTokenError("Invalid token type")

            user_id = int(payload["sub"])

        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError, KeyError):
            return jsonify({
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Invalid or expired access token."
                }
            }), 401

        user = db.session.get(User, user_id)

        if user is None or not user.is_active:
            return jsonify({
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "User account is inactive or does not exist."
                }
            }), 401

        return view(current_user=user, *args, **kwargs)

    return wrapped_view