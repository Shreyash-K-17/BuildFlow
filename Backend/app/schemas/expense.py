from marshmallow import Schema, fields, validate, validates, ValidationError


class CreateExpenseSchema(Schema):

    project_id = fields.Int(
        required=True,
        validate=validate.Range(min=1),
    )

    category = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100),
    )

    description = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=255),
    )

    amount = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.01),
    )

    expense_date = fields.Date(
        required=True,
    )

    @validates("category")
    def validate_category(self, value, **kwargs):
        if not value.strip():
            raise ValidationError(
                "Expense category cannot be empty."
            )


class UpdateExpenseSchema(Schema):

    category = fields.Str(
        required=False,
        validate=validate.Length(min=2, max=100),
    )

    description = fields.Str(
        required=False,
        validate=validate.Length(min=1, max=255),
    )

    amount = fields.Decimal(
        required=False,
        as_string=True,
        validate=validate.Range(min=0.01),
    )

    expense_date = fields.Date(
        required=False,
    )

    @validates("category")
    def validate_category(self, value, **kwargs):
        if not value.strip():
            raise ValidationError(
                "Expense category cannot be empty."
            )