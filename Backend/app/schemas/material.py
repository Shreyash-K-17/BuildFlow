from marshmallow import Schema, fields, validate, validates, ValidationError


class CreateMaterialSchema(Schema):
    name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=150),
    )

    unit = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=30),
    )

    current_stock = fields.Decimal(
        required=False,
        load_default=0,
        as_string=True,
        validate=validate.Range(min=0),
    )

    minimum_stock = fields.Decimal(
        required=False,
        load_default=0,
        as_string=True,
        validate=validate.Range(min=0),
    )

    unit_cost = fields.Decimal(
        required=False,
        allow_none=True,
        as_string=True,
        validate=validate.Range(min=0),
    )

    @validates("name")
    def validate_name(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("Material name cannot be empty.")

    @validates("unit")
    def validate_unit(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("Material unit cannot be empty.")


class UpdateMaterialSchema(Schema):
    name = fields.Str(
        required=False,
        validate=validate.Length(min=2, max=150),
    )

    unit = fields.Str(
        required=False,
        validate=validate.Length(min=1, max=30),
    )

    minimum_stock = fields.Decimal(
        required=False,
        as_string=True,
        validate=validate.Range(min=0),
    )

    unit_cost = fields.Decimal(
        required=False,
        allow_none=True,
        as_string=True,
        validate=validate.Range(min=0),
    )


class CreateInventoryTransactionSchema(Schema):
    material_id = fields.Int(
        required=True,
        validate=validate.Range(min=1),
    )

    project_id = fields.Int(
        required=False,
        allow_none=True,
        validate=validate.Range(min=1),
    )

    transaction_type = fields.Str(
        required=True,
        validate=validate.OneOf([
            "purchase",
            "return",
            "consumption",
            "adjustment_in",
            "adjustment_out",
        ]),
    )

    quantity = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.01),
    )

    unit_cost = fields.Decimal(
        required=False,
        allow_none=True,
        as_string=True,
        validate=validate.Range(min=0),
    )

    notes = fields.Str(
        required=False,
        allow_none=True,
    )