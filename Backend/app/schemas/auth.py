from marshmallow import Schema, fields, validate, validates, ValidationError


class RegisterSchema(Schema):
    organization_name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=150)
    )

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

    @validates("username")
    def validate_username(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("Username cannot be empty.")

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


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)