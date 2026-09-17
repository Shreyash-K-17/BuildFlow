from sqlalchemy import func

from ..extensions import db
from ..models import User, Worker


# ============================================================
# CREATE WORKER
# ============================================================

def create_worker(
    organization_id,
    username,
    email,
    password,
    full_name,
    phone=None,
    worker_type=None,
    daily_wage=None,
    joined_date=None,
):
    username = username.strip()
    email = email.strip().lower()
    full_name = full_name.strip()

    # --------------------------------------------------------
    # Check username within organization
    # --------------------------------------------------------

    existing_username = User.query.filter_by(
        organization_id=organization_id,
        username=username,
    ).first()

    if existing_username:
        raise ValueError(
            "Username already exists."
        )

    # --------------------------------------------------------
    # Check email globally across all organizations
    # --------------------------------------------------------

    existing_email = User.query.filter(
        func.lower(User.email) == email,
    ).first()

    if existing_email:
        raise ValueError(
            "Email already exists."
        )

    # --------------------------------------------------------
    # Create worker login account
    # --------------------------------------------------------

    user = User(
        organization_id=organization_id,
        username=username,
        email=email,
        role="worker",
        is_active=True,
    )

    user.set_password(password)

    db.session.add(user)
    db.session.flush()

    # --------------------------------------------------------
    # Create worker profile
    # --------------------------------------------------------

    worker = Worker(
        organization_id=organization_id,
        user_id=user.id,
        name=full_name,
        phone=phone.strip() if phone else None,
        email=email,
        worker_type=(
            worker_type.strip()
            if worker_type
            else None
        ),
        daily_wage=daily_wage,
        is_active=True,
        joined_date=joined_date,
    )

    db.session.add(worker)
    db.session.flush()
    db.session.refresh(worker)

    return worker, user


# ============================================================
# UPDATE WORKER
# ============================================================

UNSET = object()

def update_worker(
    worker,
    username=None,
    email=None,
    full_name=None,
    phone=None,
    worker_type=None,
    daily_wage=None,
    is_active=None,
    joined_date=UNSET,
):
    # --------------------------------------------------------
    # Get linked login account
    # --------------------------------------------------------

    user = None

    if worker.user_id is not None:
        user = db.session.get(
            User,
            worker.user_id,
        )

    # --------------------------------------------------------
    # Username
    # --------------------------------------------------------

    if username is not None:
        username = username.strip()

        if not username:
            raise ValueError(
                "Username cannot be empty."
            )

        if user is None:
            raise ValueError(
                "Worker login account not found."
            )

        existing_username = User.query.filter(
            User.organization_id == worker.organization_id,
            User.username == username,
            User.id != user.id,
        ).first()

        if existing_username:
            raise ValueError(
                "Username already exists."
            )

        user.username = username

    # --------------------------------------------------------
    # Email
    # --------------------------------------------------------

    if email is not None:
        email = email.strip().lower()

        if user is None:
            raise ValueError(
                "Worker login account not found."
            )

        existing_email = User.query.filter(
            func.lower(User.email) == email,
            User.id != user.id,
        ).first()

        if existing_email:
            raise ValueError(
                "Email already exists."
            )

        user.email = email
        worker.email = email

    # --------------------------------------------------------
    # Full name
    # --------------------------------------------------------

    if full_name is not None:
        full_name = full_name.strip()

        if not full_name:
            raise ValueError(
                "Worker name cannot be empty."
            )

        worker.name = full_name

    # --------------------------------------------------------
    # Phone
    # --------------------------------------------------------

    if phone is not None:
        worker.phone = phone.strip()

    # --------------------------------------------------------
    # Worker type
    # --------------------------------------------------------

    if worker_type is not None:
        worker.worker_type = worker_type.strip()

    # --------------------------------------------------------
    # Daily wage
    # --------------------------------------------------------

    if daily_wage is not None:
        if daily_wage < 0:
            raise ValueError(
                "Daily wage cannot be negative."
            )

        worker.daily_wage = daily_wage

    # --------------------------------------------------------
    # Active status
    # --------------------------------------------------------

    if is_active is not None:
        worker.is_active = is_active

        if user is not None:
            user.is_active = is_active

    # --------------------------------------------------------
    # Joined date
    # --------------------------------------------------------

    if joined_date is not UNSET:
        worker.joined_date = joined_date

    db.session.flush()
    db.session.refresh(worker)

    return worker, user
