from datetime import datetime, timezone

from app.extensions import db


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    organization_id = db.Column(
        db.Integer,
        db.ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = db.Column(
        db.String(200),
        nullable=False,
    )

    description = db.Column(
        db.Text,
        nullable=True,
    )

    client_name = db.Column(
        db.String(150),
        nullable=True,
    )

    location = db.Column(
        db.String(255),
        nullable=True,
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="planning",
    )

    budget = db.Column(
        db.Numeric(14, 2),
        nullable=False,
        default=0,
    )

    start_date = db.Column(
        db.Date,
        nullable=True,
    )

    expected_end_date = db.Column(
        db.Date,
        nullable=True,
    )

    actual_end_date = db.Column(
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
        back_populates="projects",
    )

    phases = db.relationship(
        "ProjectPhase",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    inventory_transactions = db.relationship(
        "InventoryTransaction",
        back_populates="project",
    )

    expenses = db.relationship(
        "Expense",
        back_populates="project",
    )

    __table_args__ = (
        db.CheckConstraint(
            "status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')",
            name="ck_project_status",
        ),

        db.CheckConstraint(
            "budget >= 0",
            name="ck_project_budget_nonnegative",
        ),

        db.CheckConstraint(
            "expected_end_date IS NULL "
            "OR start_date IS NULL "
            "OR expected_end_date >= start_date",
            name="ck_project_expected_end_after_start",
        ),

        db.CheckConstraint(
            "actual_end_date IS NULL "
            "OR start_date IS NULL "
            "OR actual_end_date >= start_date",
            name="ck_project_actual_end_after_start",
        ),
    )

    def __repr__(self):
        return f"<Project {self.name}>"