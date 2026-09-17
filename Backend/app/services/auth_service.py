from sqlalchemy import func

from ..extensions import db
from ..models import Organization, User
from ..utils.jwt import create_access_token


def register_admin(
    organization_name,
    username,
    email,
    password,
):
    organization_name = organization_name.strip()
    username = username.strip()
    email = email.strip().lower()

    existing_organization = Organization.query.filter(
        func.lower(Organization.name) == organization_name.lower()
    ).first()

    if existing_organization:
        raise ValueError("An organization with this name already exists.")

    existing_email = User.query.filter(
        func.lower(User.email) == email
    ).first()

    if existing_email:
        raise ValueError("An account with this email already exists.")

    organization = Organization(
        name=organization_name
    )

    db.session.add(organization)
    db.session.flush()

    existing_username = User.query.filter_by(
        organization_id=organization.id,
        username=username
    ).first()

    if existing_username:
        raise ValueError("Username already exists.")

    user = User(
        organization_id=organization.id,
        username=username,
        email=email,
        role="admin",
        is_active=True,
    )

    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = create_access_token(user)

    return user, organization, token


def authenticate_user(email, password):
    email = email.strip().lower()

    user = User.query.filter(
        func.lower(User.email) == email
    ).first()

    if user is None or not user.is_active:
        return None

    if not user.check_password(password):
        return None

    token = create_access_token(user)

    return user, token