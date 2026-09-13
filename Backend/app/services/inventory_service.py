from ..extensions import db
from ..models import InventoryTransaction, Material


INCREASE_TYPES = {
    "purchase",
    "return",
    "adjustment_in",
}

DECREASE_TYPES = {
    "consumption",
    "adjustment_out",
}


def create_material(
    organization_id,
    name,
    unit,
    current_stock=0,
    minimum_stock=0,
    unit_cost=None,
):
    name = name.strip()
    unit = unit.strip()

    if not name:
        raise ValueError("Material name cannot be empty.")

    if not unit:
        raise ValueError("Material unit cannot be empty.")

    material = Material(
        organization_id=organization_id,
        name=name,
        unit=unit,
        current_stock=current_stock,
        minimum_stock=minimum_stock,
        unit_cost=unit_cost,
    )

    db.session.add(material)
    db.session.commit()

    return material


def get_materials(organization_id):
    return Material.query.filter_by(
        organization_id=organization_id
    ).order_by(
        Material.id.asc()
    ).all()


def update_material(
    material,
    name=None,
    unit=None,
    minimum_stock=None,
    unit_cost=None,
):
    if name is not None:
        name = name.strip()

        if not name:
            raise ValueError(
                "Material name cannot be empty."
            )

        material.name = name

    if unit is not None:
        unit = unit.strip()

        if not unit:
            raise ValueError(
                "Material unit cannot be empty."
            )

        material.unit = unit

    if minimum_stock is not None:
        material.minimum_stock = minimum_stock

    if unit_cost is not None:
        material.unit_cost = unit_cost

    db.session.commit()

    return material


def create_inventory_transaction(
    material,
    project_id,
    transaction_type,
    quantity,
    unit_cost=None,
    notes=None,
):
    if quantity <= 0:
        raise ValueError(
            "Quantity must be greater than zero."
        )

    if transaction_type in DECREASE_TYPES:
        if material.current_stock < quantity:
            raise ValueError(
                "Insufficient material stock."
            )

        material.current_stock -= quantity

    elif transaction_type in INCREASE_TYPES:
        material.current_stock += quantity

    else:
        raise ValueError(
            "Invalid inventory transaction type."
        )

    transaction = InventoryTransaction(
        material_id=material.id,
        project_id=project_id,
        transaction_type=transaction_type,
        quantity=quantity,
        unit_cost=unit_cost,
        notes=notes.strip() if notes else None,
    )

    db.session.add(transaction)
    db.session.commit()

    return transaction