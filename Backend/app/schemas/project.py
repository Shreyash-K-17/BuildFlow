from marshmallow import Schema, fields, validate, validates, ValidationError


PROJECT_STATUSES = [
    "planning",
    "active",
    "on_hold",
    "completed",
    "cancelled",
]


class CreateProjectSchema(Schema):
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=200),
    )

    description = fields.Str(
        required=False,
        allow_none=True,
    )

    client_name = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.Length(max=150),
    )

    location = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.Length(max=255),
    )

    status = fields.Str(
        required=False,
        load_default="planning",
        validate=validate.OneOf(PROJECT_STATUSES),
    )

    budget = fields.Decimal(
        required=False,
        load_default=0,
        as_string=True,
        validate=validate.Range(min=0),
    )

    start_date = fields.Date(
        required=False,
        allow_none=True,
    )

    expected_end_date = fields.Date(
        required=False,
        allow_none=True,
    )

    actual_end_date = fields.Date(
        required=False,
        allow_none=True,
    )

    @validates("name")
    def validate_name(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("Project name cannot be empty.")


class UpdateProjectSchema(Schema):
    name = fields.Str(
        required=False,
        validate=validate.Length(min=2, max=200),
    )

    description = fields.Str(
        required=False,
        allow_none=True,
    )

    client_name = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.Length(max=150),
    )

    location = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.Length(max=255),
    )

    status = fields.Str(
        required=False,
        validate=validate.OneOf(PROJECT_STATUSES),
    )

    budget = fields.Decimal(
        required=False,
        as_string=True,
        validate=validate.Range(min=0),
    )

    start_date = fields.Date(
        required=False,
        allow_none=True,
    )

    expected_end_date = fields.Date(
        required=False,
        allow_none=True,
    )

    actual_end_date = fields.Date(
        required=False,
        allow_none=True,
    )

    @validates("name")
    def validate_name(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("Project name cannot be empty.")