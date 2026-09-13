from datetime import datetime, timezone

from app.extensions import db


class TaskDependency(db.Model):
    __tablename__ = "task_dependencies"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    task_id = db.Column(
        db.Integer,
        db.ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    depends_on_task_id = db.Column(
        db.Integer,
        db.ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    task = db.relationship(
        "Task",
        foreign_keys=[task_id],
        back_populates="dependencies",
    )

    depends_on_task = db.relationship(
        "Task",
        foreign_keys=[depends_on_task_id],
        back_populates="dependent_tasks",
    )

    __table_args__ = (
        db.UniqueConstraint(
            "task_id",
            "depends_on_task_id",
            name="uq_task_dependency",
        ),

        db.CheckConstraint(
            "task_id <> depends_on_task_id",
            name="ck_task_no_self_dependency",
        ),
    )

    def __repr__(self):
        return f"<TaskDependency {self.task_id} -> {self.depends_on_task_id}>"