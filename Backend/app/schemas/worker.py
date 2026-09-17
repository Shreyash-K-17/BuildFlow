from marshmallow import (
    Schema,
    fields,
    validate,
    validates,
    ValidationError,
)


# ============================================================
# CREATE WORKER SCHEMA
# ============================================================

class CreateWorkerSchema(Schema):
    username = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=80)
    )

    email = fields.Email(
        required=True,
        validate=validate.Length(max=255)
    )

    password = fields.Str(
        required=True,
        load_only=True,
        validate=validate.Length(min=8, max=128)
    )

    full_name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=150)
    )

    phone = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.Length(max=20)
    )

    worker_type = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.Length(max=50)
    )

    daily_wage = fields.Decimal(
        required=False,
        allow_none=True,
        as_string=True
    )

    joined_date = fields.Date(
        required=False,
        allow_none=True
    )

    @validates("username")
    def validate_username(self, value, **kwargs):
        if not value.strip():
            raise ValidationError(
                "Username cannot be empty."
            )

    @validates("full_name")
    def validate_full_name(self, value, **kwargs):
        if not value.strip():
            raise ValidationError(
                "Worker name cannot be empty."
            )

    @validates("password")
    def validate_password(self, value, **kwargs):
        if not any(char.isupper() for char in value):
            raise ValidationError(
                "Password must contain at least one uppercase letter."
            )

        if not any(char.islower() for char in value):
            raise ValidationError(
                "Password must contain at least one lowercase letter."
            )

        if not any(char.isdigit() for char in value):
            raise ValidationError(
                "Password must contain at least one number."
            )


# ============================================================
# UPDATE WORKER SCHEMA
# ============================================================

class UpdateWorkerSchema(Schema):
    username = fields.Str(
        required=False,
        validate=validate.Length(min=3, max=80)
    )

    email = fields.Email(
        required=False,
        validate=validate.Length(max=255)
    )

    full_name = fields.Str(
        required=False,
        validate=validate.Length(min=2, max=150)
    )

    phone = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.Length(max=20)
    )

    worker_type = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.Length(max=50)
    )

    daily_wage = fields.Decimal(
        required=False,
        allow_none=True,
        as_string=True
    )

    is_active = fields.Bool(
        required=False
    )

    joined_date = fields.Date(
        required=False,
        allow_none=True
    )

    @validates("username")
    def validate_username(self, value, **kwargs):
        if not value.strip():
            raise ValidationError(
                "Username cannot be empty."
            )
