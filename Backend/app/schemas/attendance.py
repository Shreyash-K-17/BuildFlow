from marshmallow import Schema, fields, validate


ATTENDANCE_STATUSES = [
    "present",
    "absent",
    "half_day",
    "leave",
]


class CreateAttendanceSchema(Schema):
    worker_id = fields.Int(
        required=True,
        validate=validate.Range(min=1),
    )

    project_id = fields.Int(
        required=True,
        validate=validate.Range(min=1),
    )

    attendance_date = fields.Date(
        required=True,
    )

    status = fields.Str(
        required=False,
        load_default="present",
        validate=validate.OneOf(ATTENDANCE_STATUSES),
    )

    check_in = fields.Time(
        required=False,
        allow_none=True,
    )

    check_out = fields.Time(
        required=False,
        allow_none=True,
    )

    notes = fields.Str(
        required=False,
        allow_none=True,
    )


class UpdateAttendanceSchema(Schema):
    status = fields.Str(
        required=False,
        validate=validate.OneOf(ATTENDANCE_STATUSES),
    )

    check_in = fields.Time(
        required=False,
        allow_none=True,
    )

    check_out = fields.Time(
        required=False,
        allow_none=True,
    )

    notes = fields.Str(
        required=False,
        allow_none=True,
    )