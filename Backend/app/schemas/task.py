from marshmallow import Schema, fields, validate, validates, ValidationError


TASK_STATUSES = [
    "not_started",
    "in_progress",
    "on_hold",
    "blocked",
    "completed",
]

TASK_PRIORITIES = [
    "low",
    "medium",
    "high",
    "urgent",
]


class CreateTaskSchema(Schema):
    title = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=200),
    )

    description = fields.Str(
        required=False,
        allow_none=True,
    )

    status = fields.Str(
        required=False,
        load_default="not_started",
        validate=validate.OneOf(TASK_STATUSES),
    )

    progress = fields.Int(
        required=False,
        load_default=0,
        validate=validate.Range(min=0, max=100),
    )

    priority = fields.Str(
        required=False,
        load_default="medium",
        validate=validate.OneOf(TASK_PRIORITIES),
    )

    assigned_worker_id = fields.Int(
        required=False,
        allow_none=True,
        validate=validate.Range(min=1),
    )

    start_date = fields.Date(
        required=False,
        allow_none=True,
    )

    due_date = fields.Date(
        required=False,
        allow_none=True,
    )

    @validates("title")
    def validate_title(self, value, **kwargs):
        if not value.strip():
            raise ValidationError(
                "Task title cannot be empty."
            )


class UpdateTaskSchema(Schema):
    title = fields.Str(
        required=False,
        validate=validate.Length(min=2, max=200),
    )

    description = fields.Str(
        required=False,
        allow_none=True,
    )

    status = fields.Str(
        required=False,
        validate=validate.OneOf(TASK_STATUSES),
    )

    progress = fields.Int(
        required=False,
        validate=validate.Range(min=0, max=100),
    )

    priority = fields.Str(
        required=False,
        validate=validate.OneOf(TASK_PRIORITIES),
    )

    assigned_worker_id = fields.Int(
        required=False,
        allow_none=True,
        validate=validate.Range(min=1),
    )

    start_date = fields.Date(
        required=False,
        allow_none=True,
    )

    due_date = fields.Date(
        required=False,
        allow_none=True,
    )

    @validates("title")
    def validate_title(self, value, **kwargs):
        if not value.strip():
            raise ValidationError(
                "Task title cannot be empty."
            )