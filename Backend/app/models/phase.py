from datetime import datetime, timezone

from app.extensions import db


class ProjectPhase(db.Model):
    __tablename__ = "project_phases"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = db.Column(
        db.String(150),
        nullable=False,
    )

    description = db.Column(
        db.Text,
        nullable=True,
    )

    phase_order = db.Column(
        db.Integer,
        nullable=False,
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

    project = db.relationship(
        "Project",
        back_populates="phases",
    )

    tasks = db.relationship(
        "Task",
        back_populates="phase",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        db.CheckConstraint(
            "phase_order > 0",
            name="ck_phase_order_positive",
        ),
    )

    def __repr__(self):
        return f"<ProjectPhase {self.name}>"