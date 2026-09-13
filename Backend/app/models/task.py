from datetime import datetime, timezone

from app.extensions import db


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    phase_id = db.Column(
        db.Integer,
        db.ForeignKey("project_phases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = db.Column(
        db.String(200),
        nullable=False,
    )

    description = db.Column(
        db.Text,
        nullable=True,
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="not_started",
    )

    progress = db.Column(
        db.Integer,
        nullable=False,
        default=0,
    )

    priority = db.Column(
        db.String(20),
        nullable=False,
        default="medium",
    )

    assigned_worker_id = db.Column(
        db.Integer,
        db.ForeignKey("workers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    start_date = db.Column(
        db.Date,
        nullable=True,
    )

    due_date = db.Column(
        db.Date,
        nullable=True,
    )

    completed_at = db.Column(
        db.DateTime(timezone=True),
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

    phase = db.relationship(
        "ProjectPhase",
        back_populates="tasks",
    )

    worker = db.relationship(
        "Worker",
        back_populates="tasks",
    )

    dependencies = db.relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.task_id",
        back_populates="task",
        cascade="all, delete-orphan",
    )

    dependent_tasks = db.relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.depends_on_task_id",
        back_populates="depends_on_task",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        db.CheckConstraint(
            "progress >= 0 AND progress <= 100",
            name="ck_task_progress_range",
        ),

        db.CheckConstraint(
            "status IN ('not_started', 'in_progress', 'on_hold', 'blocked', 'completed')",
            name="ck_task_status",
        ),

        db.CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name="ck_task_priority",
        ),

        db.CheckConstraint(
            "due_date IS NULL "
            "OR start_date IS NULL "
            "OR due_date >= start_date",
            name="ck_task_due_after_start",
        ),

        db.CheckConstraint(
            "completed_at IS NULL OR status = 'completed'",
            name="ck_task_completed_at_status",
        ),
    )

    def __repr__(self):
        return f"<Task {self.title}>"