from sqlalchemy import case, func

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
    # 1. PROJECTS
    # =========================================================

    (
        project_count,
        planning_projects,
        active_projects,
        on_hold_projects,
        completed_projects,
        cancelled_projects,
        total_budget,
    ) = (
        db.session.query(
            func.count(Project.id),
            func.count(case((Project.status == "planning", 1))),
            func.count(case((Project.status == "active", 1))),
            func.count(case((Project.status == "on_hold", 1))),
            func.count(case((Project.status == "completed", 1))),
            func.count(case((Project.status == "cancelled", 1))),
            func.coalesce(func.sum(Project.budget), 0),
        )
        .filter(Project.organization_id == organization_id)
        .one()
    )

    # =========================================================
    # 2. TASKS & PROGRESS
    # =========================================================

    (
        total_tasks,
        not_started_tasks,
        in_progress_tasks,
        blocked_tasks,
        on_hold_tasks,
        completed_tasks,
        average_progress,
    ) = (
        db.session.query(
            func.count(Task.id),
            func.count(case((Task.status == "not_started", 1))),
            func.count(case((Task.status == "in_progress", 1))),
            func.count(case((Task.status == "blocked", 1))),
            func.count(case((Task.status == "on_hold", 1))),
            func.count(case((Task.status == "completed", 1))),
            func.coalesce(func.avg(Task.progress), 0),
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
        .one()
    )

    # =========================================================
    # 3. WORKFORCE
    # =========================================================

    active_workers = (
        db.session.query(func.count(Worker.id))
        .filter(
            Worker.organization_id == organization_id,
            Worker.is_active == True,
        )
        .scalar()
        or 0
    )

    # =========================================================
    # 4. ATTENDANCE
    # =========================================================

    (
        present_count,
        absent_count,
        half_day_count,
        leave_count,
    ) = (
        db.session.query(
            func.count(case((Attendance.status == "present", 1))),
            func.count(case((Attendance.status == "absent", 1))),
            func.count(case((Attendance.status == "half_day", 1))),
            func.count(case((Attendance.status == "leave", 1))),
        )
        .join(
            Worker,
            Attendance.worker_id == Worker.id,
        )
        .filter(
            Worker.organization_id == organization_id
        )
        .one()
    )

    # =========================================================
    # 5. MATERIALS
    # =========================================================

    materials = (
        db.session.query(
            Material.id,
            Material.name,
            Material.current_stock,
            Material.minimum_stock,
            Material.unit,
        )
        .filter(
            Material.organization_id == organization_id,
            Material.is_active == True,
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
    # 6. FINANCE
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