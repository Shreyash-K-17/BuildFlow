from datetime import datetime, timezone

from app.extensions import db


class Material(db.Model):
    __tablename__ = "materials"

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
        db.String(150),
        nullable=False,
    )

    category = db.Column(
        db.String(100),
        nullable=True,
    )

    unit = db.Column(
        db.String(30),
        nullable=False,
    )

    current_stock = db.Column(
        db.Numeric(14, 3),
        nullable=False,
        default=0,
    )

    minimum_stock = db.Column(
        db.Numeric(14, 3),
        nullable=False,
        default=0,
    )

    unit_cost = db.Column(
        db.Numeric(14, 2),
        nullable=True,
    )

    supplier_name = db.Column(
        db.String(150),
        nullable=True,
    )

    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
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
        back_populates="materials",
    )

    inventory_transactions = db.relationship(
        "InventoryTransaction",
        back_populates="material",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        db.UniqueConstraint(
            "organization_id",
            "name",
            name="uq_material_organization_name",
        ),

        db.CheckConstraint(
            "current_stock >= 0",
            name="ck_material_current_stock_nonnegative",
        ),

        db.CheckConstraint(
            "minimum_stock >= 0",
            name="ck_material_minimum_stock_nonnegative",
        ),

        db.CheckConstraint(
            "unit_cost IS NULL OR unit_cost >= 0",
            name="ck_material_unit_cost_nonnegative",
        ),
    )

    def __repr__(self):
        return f"<Material {self.name}>"