from datetime import datetime, timezone

from app.extensions import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

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

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    action = db.Column(
        db.String(50),
        nullable=False,
    )

    entity_type = db.Column(
        db.String(50),
        nullable=False,
    )

    entity_id = db.Column(
        db.Integer,
        nullable=True,
    )

    old_values = db.Column(
        db.JSON,
        nullable=True,
    )

    new_values = db.Column(
        db.JSON,
        nullable=True,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    organization = db.relationship(
        "Organization",
    )

    user = db.relationship(
        "User",
    )

    def __repr__(self):
        return (
            f"<AuditLog "
            f"{self.action} "
            f"{self.entity_type}:{self.entity_id}>"
        )