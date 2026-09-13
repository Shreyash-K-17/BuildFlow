def test_audit_logs_are_returned_newest_first(
    client,
    auth_headers,
):
    first_response = client.post(
        "/api/workers",
        json={
            "username": "firstauditworker",
            "email": "firstauditworker@test.com",
            "password": "WorkerPass123!",
            "full_name": "First Audit Worker",
            "phone": "9876543211",
            "worker_type": "Mason",
            "daily_wage": 800,
        },
        headers=auth_headers,
    )

    assert first_response.status_code == 201

    second_response = client.post(
        "/api/workers",
        json={
            "username": "secondauditworker",
            "email": "secondauditworker@test.com",
            "password": "WorkerPass123!",
            "full_name": "Second Audit Worker",
            "phone": "9876543212",
            "worker_type": "Carpenter",
            "daily_wage": 900,
        },
        headers=auth_headers,
    )

    assert second_response.status_code == 201

    first_worker_id = (
        first_response
        .get_json()["data"]["worker"]["id"]
    )

    second_worker_id = (
        second_response
        .get_json()["data"]["worker"]["id"]
    )

    response = client.get(
        "/api/audit-logs",
        headers=auth_headers,
    )

    assert response.status_code == 200

    audit_logs = (
        response
        .get_json()["data"]["audit_logs"]
    )

    relevant_logs = [
        audit
        for audit in audit_logs
        if audit["entity_type"] == "worker"
        and audit["action"] == "create"
        and audit["entity_id"] in (
            first_worker_id,
            second_worker_id,
        )
    ]

    assert len(relevant_logs) == 2

    # The second worker was created later, so its
    # audit record must appear first.
    assert relevant_logs[0]["entity_id"] == second_worker_id
    assert relevant_logs[1]["entity_id"] == first_worker_id