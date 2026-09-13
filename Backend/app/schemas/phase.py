from marshmallow import Schema, fields, validate, validates, ValidationError


class CreatePhaseSchema(Schema):
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=150),
    )

    description = fields.Str(
        required=False,
        allow_none=True,
    )

    phase_order = fields.Int(
        required=True,
        validate=validate.Range(min=1),
    )

    @validates("name")
    def validate_name(self, value, **kwargs):
        if not value.strip():
            raise ValidationError(
                "Phase name cannot be empty."
            )


class UpdatePhaseSchema(Schema):
    name = fields.Str(
        required=False,
        validate=validate.Length(min=2, max=150),
    )

    description = fields.Str(
        required=False,
        allow_none=True,
    )

    phase_order = fields.Int(
        required=False,
        validate=validate.Range(min=1),
    )

    @validates("name")
    def validate_name(self, value, **kwargs):
        if not value.strip():
            raise ValidationError(
                "Phase name cannot be empty."
            )