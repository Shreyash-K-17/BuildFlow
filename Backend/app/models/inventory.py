from datetime import datetime, timezone

from app.extensions import db


class InventoryTransaction(db.Model):
    __tablename__ = "inventory_transactions"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    material_id = db.Column(
        db.Integer,
        db.ForeignKey("materials.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    project_id = db.Column(
        db.Integer,
        db.ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    transaction_type = db.Column(
        db.String(30),
        nullable=False,
    )

    quantity = db.Column(
        db.Numeric(14, 3),
        nullable=False,
    )

    unit_cost = db.Column(
        db.Numeric(14, 2),
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

    material = db.relationship(
        "Material",
        back_populates="inventory_transactions",
    )

    project = db.relationship(
        "Project",
        back_populates="inventory_transactions",
    )

    __table_args__ = (
        db.CheckConstraint(
            "transaction_type IN ('purchase', 'return', 'consumption', 'adjustment_in', 'adjustment_out')",
            name="ck_inventory_transaction_type",
        ),

        db.CheckConstraint(
            "quantity > 0",
            name="ck_inventory_quantity_positive",
        ),

        db.CheckConstraint(
            "unit_cost IS NULL OR unit_cost >= 0",
            name="ck_inventory_unit_cost_nonnegative",
        ),
    )

    def __repr__(self):
        return (
            f"<InventoryTransaction "
            f"material={self.material_id} "
            f"type={self.transaction_type} "
            f"quantity={self.quantity}>"
        )