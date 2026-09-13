from flask import abort


def organization_scoped_query(query, model, current_user):
    """
    Restrict a SQLAlchemy query to the current user's organization.

    The model must have an organization_id column.
    """
    if not hasattr(model, "organization_id"):
        raise ValueError(
            f"{model.__name__} does not have an organization_id field."
        )

    return query.filter(
        model.organization_id == current_user.organization_id
    )


def ensure_same_organization(record, current_user):
    """
    Verify that a database record belongs to the current user's organization.

    Returns the record if access is allowed.
    Raises 404 if the record belongs to another organization.
    """
    if record is None:
        abort(404)

    if record.organization_id != current_user.organization_id:
        abort(404)

    return record