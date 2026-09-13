from functools import wraps

from flask import jsonify

from ..utils.jwt import jwt_required


def role_required(*allowed_roles):
    def decorator(view):
        @wraps(view)
        @jwt_required
        def wrapped_view(current_user, *args, **kwargs):
            if current_user.role not in allowed_roles:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "You do not have permission to perform this action."
                    }
                }), 403

            return view(
                current_user=current_user,
                *args,
                **kwargs
            )

        return wrapped_view

    return decorator