from sqlalchemy import func

from ..extensions import db
from ..models import (
    Attendance,
    Expense,
    Material,
    Project,
    ProjectPhase,
    Task,
    Worker,
)


def get_dashboard_data(organization_id):
    # =========================================================
    # PROJECTS
    # =========================================================

    project_query = Project.query.filter_by(
        organization_id=organization_id
    )

    project_count = project_query.count()

    planning_projects = (
        project_query
        .filter(Project.status == "planning")
        .count()
    )

    active_projects = (
        project_query
        .filter(Project.status == "active")
        .count()
    )

    on_hold_projects = (
        project_query
        .filter(Project.status == "on_hold")
        .count()
    )

    completed_projects = (
        project_query
        .filter(Project.status == "completed")
        .count()
    )

    cancelled_projects = (
        project_query
        .filter(Project.status == "cancelled")
        .count()
    )

    total_budget = (
        db.session.query(
            func.coalesce(
                func.sum(Project.budget),
                0,
            )
        )
        .filter(
            Project.organization_id == organization_id
        )
        .scalar()
    )

    # =========================================================
    # TASKS
    # =========================================================

    task_query = (
        db.session.query(Task)
        .join(
            ProjectPhase,
            Task.phase_id == ProjectPhase.id,
        )
        .join(
            Project,
            ProjectPhase.project_id == Project.id,
        )
        .filter(
            Project.organization_id == organization_id
        )
    )

    total_tasks = task_query.count()

    not_started_tasks = (
        task_query
        .filter(Task.status == "not_started")
        .count()
    )

    in_progress_tasks = (
        task_query
        .filter(Task.status == "in_progress")
        .count()
    )

    blocked_tasks = (
        task_query
        .filter(Task.status == "blocked")
        .count()
    )

    on_hold_tasks = (
        task_query
        .filter(Task.status == "on_hold")
        .count()
    )

    completed_tasks = (
        task_query
        .filter(Task.status == "completed")
        .count()
    )

    # =========================================================
    # OVERALL TASK PROGRESS
    # =========================================================

    average_progress = (
        db.session.query(
            func.coalesce(
                func.avg(Task.progress),
                0,
            )
        )
        .join(
            ProjectPhase,
            Task.phase_id == ProjectPhase.id,
        )
        .join(
            Project,
            ProjectPhase.project_id == Project.id,
        )
        .filter(
            Project.organization_id == organization_id
        )
        .scalar()
    )

    # =========================================================
    # WORKFORCE
    # =========================================================

    active_workers = (
        Worker.query
        .filter_by(
            organization_id=organization_id,
            is_active=True,
        )
        .count()
    )

    # =========================================================
    # ATTENDANCE
    # =========================================================

    attendance_query = (
        db.session.query(Attendance)
        .join(
            Worker,
            Attendance.worker_id == Worker.id,
        )
        .filter(
            Worker.organization_id == organization_id
        )
    )

    present_count = (
        attendance_query
        .filter(Attendance.status == "present")
        .count()
    )

    absent_count = (
        attendance_query
        .filter(Attendance.status == "absent")
        .count()
    )

    half_day_count = (
        attendance_query
        .filter(Attendance.status == "half_day")
        .count()
    )

    leave_count = (
        attendance_query
        .filter(Attendance.status == "leave")
        .count()
    )

    # =========================================================
    # MATERIALS
    # =========================================================

    materials = (
        Material.query
        .filter_by(
            organization_id=organization_id,
            is_active=True,
        )
        .order_by(
            Material.name.asc()
        )
        .all()
    )

    low_stock_materials = [
        {
            "id": material.id,
            "name": material.name,
            "current_stock": str(
                material.current_stock
            ),
            "minimum_stock": str(
                material.minimum_stock
            ),
            "unit": material.unit,
        }
        for material in materials
        if material.current_stock <= material.minimum_stock
    ]

    # =========================================================
    # FINANCE
    # =========================================================

    total_expenses = (
        db.session.query(
            func.coalesce(
                func.sum(Expense.amount),
                0,
            )
        )
        .filter(
            Expense.organization_id == organization_id
        )
        .scalar()
    )

    remaining_budget = (
        total_budget - total_expenses
    )

    if total_budget > 0:
        budget_utilization = (
            total_expenses / total_budget
        ) * 100
    else:
        budget_utilization = 0

    # =========================================================
    # RETURN DASHBOARD
    # =========================================================

    return {
        "projects": {
            "total": project_count,
            "planning": planning_projects,
            "active": active_projects,
            "on_hold": on_hold_projects,
            "completed": completed_projects,
            "cancelled": cancelled_projects,
            "total_budget": str(total_budget),
        },

        "tasks": {
            "total": total_tasks,
            "not_started": not_started_tasks,
            "in_progress": in_progress_tasks,
            "blocked": blocked_tasks,
            "on_hold": on_hold_tasks,
            "completed": completed_tasks,
            "average_progress": round(
                float(average_progress),
                2,
            ),
        },

        "workforce": {
            "active_workers": active_workers,
            "attendance": {
                "present": present_count,
                "absent": absent_count,
                "half_day": half_day_count,
                "leave": leave_count,
            },
        },

        "materials": {
            "total_active": len(materials),
            "low_stock_count": len(
                low_stock_materials
            ),
            "low_stock_materials": low_stock_materials,
        },

        "finance": {
            "total_budget": str(total_budget),
            "total_expenses": str(total_expenses),
            "remaining_budget": str(
                remaining_budget
            ),
            "budget_utilization": round(
                float(budget_utilization),
                2,
            ),
        },
    }