from ..extensions import db
from ..models import Expense


def create_expense(
    organization_id,
    project_id,
    category,
    amount,
    description=None,
    expense_date=None,
):
    category = category.strip()

    if not category:
        raise ValueError(
            "Expense category cannot be empty."
        )

    if not description or not description.strip():
        raise ValueError(
            "Expense description cannot be empty."
        )

    if amount <= 0:
        raise ValueError(
            "Expense amount must be greater than zero."
        )

    expense = Expense(
        organization_id=organization_id,
        project_id=project_id,
        category=category,
        description=description.strip(),
        amount=amount,
        expense_date=expense_date,
    )

    db.session.add(expense)
    db.session.flush()
    db.session.refresh(expense)

    return expense


def get_project_expenses(project_id):
    return Expense.query.filter_by(
        project_id=project_id
    ).order_by(
        Expense.expense_date.desc(),
        Expense.id.desc(),
    ).all()


def update_expense(
    expense,
    category=None,
    amount=None,
    description=None,
    expense_date=None,
):
    if category is not None:
        category = category.strip()

        if not category:
            raise ValueError(
                "Expense category cannot be empty."
            )

        expense.category = category

    if amount is not None:
        if amount <= 0:
            raise ValueError(
                "Expense amount must be greater than zero."
            )

        expense.amount = amount

    if description is not None:
        expense.description = (
            description.strip()
            if description
            else None
        )

    if expense_date is not None:
        expense.expense_date = expense_date

    db.session.flush()
    db.session.refresh(expense)

    return expense