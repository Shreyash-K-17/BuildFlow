from datetime import datetime, timezone

from app.extensions import db


class Worker(db.Model):
    __tablename__ = "workers"

    id = db.Column(db.Integer, primary_key=True)

    organization_id = db.Column(
        db.Integer,
        db.ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
        index=True,
    )

    name = db.Column(
        db.String(150),
        nullable=False,
    )

    phone = db.Column(
        db.String(20),
        nullable=True,
    )

    email = db.Column(
        db.String(255),
        nullable=True,
    )

    worker_type = db.Column(
        db.String(50),
        nullable=True,
    )

    daily_wage = db.Column(
        db.Numeric(12, 2),
        nullable=True,
    )

    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
    )

    joined_date = db.Column(
        db.Date,
        nullable=True,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    organization = db.relationship(
        "Organization",
        back_populates="workers",
    )

    user = db.relationship(
        "User",
        backref="worker_profile",
        uselist=False,
    )

    attendance_records = db.relationship(
        "Attendance",
        back_populates="worker",
        cascade="all, delete-orphan",
    )

    tasks = db.relationship(
        "Task",
        back_populates="worker",
    )

    __table_args__ = (
        db.CheckConstraint(
            "daily_wage IS NULL OR daily_wage >= 0",
            name="ck_worker_daily_wage_nonnegative",
        ),
    )

    def __repr__(self):
        return f"<Worker {self.name}>"


class Attendance(db.Model):
    __tablename__ = "attendance"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    worker_id = db.Column(
        db.Integer,
        db.ForeignKey("workers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    attendance_date = db.Column(
        db.Date,
        nullable=False,
        index=True,
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="present",
    )

    check_in = db.Column(
        db.Time,
        nullable=True,
    )

    check_out = db.Column(
        db.Time,
        nullable=True,
    )

    notes = db.Column(
        db.Text,
        nullable=True,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    worker = db.relationship(
        "Worker",
        back_populates="attendance_records",
    )

    project = db.relationship(
        "Project",
        backref="attendance_records",
    )

    __table_args__ = (
        db.UniqueConstraint(
            "worker_id",
            "project_id",
            "attendance_date",
            name="uq_worker_project_attendance_date",
        ),

        db.CheckConstraint(
            "status IN ('present', 'absent', 'half_day', 'leave')",
            name="ck_attendance_status",
        ),

        db.CheckConstraint(
            "check_out IS NULL OR check_in IS NULL OR check_out >= check_in",
            name="ck_attendance_checkout_after_checkin",
        ),
    )

    def __repr__(self):
        return (
            f"<Attendance worker={self.worker_id} "
            f"project={self.project_id} "
            f"date={self.attendance_date}>"
        )