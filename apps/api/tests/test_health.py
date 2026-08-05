from fastapi.testclient import TestClient

from graphicle_api.main import create_app


def test_health_reports_ok() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"]


def test_openapi_uses_clean_operation_ids() -> None:
    """Guards the generated TypeScript names against FastAPI's mangled defaults."""
    schema = create_app().openapi()
    assert schema["paths"]["/health"]["get"]["operationId"] == "health"
