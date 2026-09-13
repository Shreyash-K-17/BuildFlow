from datetime import datetime, timezone

from app.extensions import db


class Organization(db.Model):
    __tablename__ = "organizations"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(
        db.String(150),
        nullable=False,
        unique=True,
        index=True
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    users = db.relationship(
        "User",
        back_populates="organization",
        cascade="all, delete-orphan"
    )

    projects = db.relationship(
        "Project",
        back_populates="organization",
        cascade="all, delete-orphan"
    )

    workers = db.relationship(
        "Worker",
        back_populates="organization",
        cascade="all, delete-orphan"
    )

    materials = db.relationship(
        "Material",
        back_populates="organization",
        cascade="all, delete-orphan"
    )

    expenses = db.relationship(
        "Expense",
        back_populates="organization",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Organization {self.name}>"