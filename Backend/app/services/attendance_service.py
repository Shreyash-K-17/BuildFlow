from ..extensions import db
from ..models import Attendance


def create_attendance(
    worker_id,
    project_id,
    attendance_date,
    status="present",
    check_in=None,
    check_out=None,
    notes=None,
):
    if check_in and check_out and check_out < check_in:
        raise ValueError(
            "Check-out time cannot be before check-in time."
        )

    attendance = Attendance(
        worker_id=worker_id,
        project_id=project_id,
        attendance_date=attendance_date,
        status=status,
        check_in=check_in,
        check_out=check_out,
        notes=notes.strip() if notes else None,
    )

    db.session.add(attendance)
    db.session.flush()
    db.session.refresh(attendance)

    return attendance


def get_project_attendance(project_id, worker_id=None):
    query = Attendance.query.filter_by(
        project_id=project_id
    )

    if worker_id is not None:
        query = query.filter(
            Attendance.worker_id == worker_id
        )

    return query.order_by(
        Attendance.attendance_date.desc(),
        Attendance.id.desc(),
    ).all()


def update_attendance(
    attendance,
    status=None,
    check_in=None,
    check_out=None,
    notes=None,
):
    if status is not None:
        attendance.status = status

    if check_in is not None:
        attendance.check_in = check_in

    if check_out is not None:
        attendance.check_out = check_out

    if notes is not None:
        attendance.notes = (
            notes.strip()
            if notes
            else None
        )

    if (
        attendance.check_in
        and attendance.check_out
        and attendance.check_out < attendance.check_in
    ):
        raise ValueError(
            "Check-out time cannot be before check-in time."
        )

    db.session.flush()
    db.session.refresh(attendance)

    return attendance