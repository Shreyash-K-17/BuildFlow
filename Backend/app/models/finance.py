from datetime import datetime, timezone

from app.extensions import db


class Expense(db.Model):
    __tablename__ = "expenses"

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

    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    category = db.Column(
        db.String(50),
        nullable=False,
    )

    description = db.Column(
        db.String(255),
        nullable=False,
    )

    amount = db.Column(
        db.Numeric(14, 2),
        nullable=False,
    )

    expense_date = db.Column(
        db.Date,
        nullable=False,
    )

    payment_method = db.Column(
        db.String(30),
        nullable=True,
    )

    reference = db.Column(
        db.String(150),
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

    organization = db.relationship(
        "Organization",
        back_populates="expenses",
    )

    project = db.relationship(
        "Project",
        back_populates="expenses",
    )

    __table_args__ = (
        db.Index(
            "ix_expenses_project_date_id",
            "project_id",
            expense_date.desc(),
            id.desc(),
        ),
        db.CheckConstraint(
            "amount > 0",
            name="ck_expense_amount_positive",
        ),
    )

    def __repr__(self):
        return f"<Expense {self.description}: {self.amount}>"