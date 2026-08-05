"""Route tests for the deterministic half of search.

`/api/graph/query` takes a GraphQuery directly, so these exercise the full
request -> compile -> fetch -> response path with no LLM. The database is stubbed
so the suite needs no Postgres.
"""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from graphicle_api.db.session import get_connection
from graphicle_api.main import create_app


class FakeResult:
    def __init__(self, rows: list[Any]) -> None:
        self._rows = rows

    def all(self) -> list[Any]:
        return self._rows

    def __iter__(self) -> Iterator[Any]:
        return iter(self._rows)


class FakeConnection:
    """Records executed statements and returns no rows."""

    def __init__(self) -> None:
        self.statements: list[Any] = []

    async def execute(self, statement: Any) -> FakeResult:
        self.statements.append(statement)
        return FakeResult([])


@pytest.fixture
def client() -> Iterator[tuple[TestClient, FakeConnection]]:
    connection = FakeConnection()
    app = create_app()

    async def override():
        yield connection

    app.dependency_overrides[get_connection] = override
    with TestClient(app) as test_client:
        yield test_client, connection
    app.dependency_overrides.clear()


def test_structured_query_returns_interpretation(client) -> None:
    test_client, _ = client

    response = test_client.post(
        "/api/graph/query",
        json={
            "filters": [
                {"field": "profession", "op": "eq", "value": "doctor"},
                {"field": "state", "op": "eq", "value": "ME"},
            ],
            "limit": 10,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["nodes"] == []
    assert body["truncated"] is False
    # The interpretation round-trips, which is what lets the UI edit and re-run.
    assert body["interpreted"]["filters"][0]["field"] == "profession"
    assert body["interpreted"]["limit"] == 10


def test_superlative_query_sorts_by_degree(client) -> None:
    test_client, connection = client

    response = test_client.post(
        "/api/graph/query",
        json={"sort": {"field": "degree", "direction": "desc"}, "limit": 1},
    )

    assert response.status_code == 200
    sql = str(connection.statements[0])
    assert "ORDER BY node_metrics.degree DESC" in sql


def test_fetches_one_row_past_the_limit(client) -> None:
    """Needed to tell "exactly limit results" from "there are more"."""
    test_client, connection = client

    test_client.post("/api/graph/query", json={"limit": 25})

    assert "LIMIT" in str(connection.statements[0])
    assert connection.statements[0].compile().params["param_1"] == 26


def test_unresolvable_field_is_a_422_not_a_500(client) -> None:
    test_client, _ = client

    response = test_client.post(
        "/api/graph/query",
        json={"filters": [{"field": "secrets.password", "op": "eq", "value": "x"}]},
    )

    assert response.status_code == 422
    assert "Unknown container" in response.json()["detail"]


def test_limit_above_the_cap_is_rejected(client) -> None:
    test_client, _ = client

    response = test_client.post("/api/graph/query", json={"limit": 100000})

    assert response.status_code == 422


def test_search_and_structured_query_share_a_response_shape() -> None:
    """Both routes return SearchResponse, so the generated TS type is shared."""
    schema = create_app().openapi()
    responses = schema["paths"]["/api/search"]["post"]["responses"]["200"]
    structured = schema["paths"]["/api/graph/query"]["post"]["responses"]["200"]

    assert (
        responses["content"]["application/json"]["schema"]
        == structured["content"]["application/json"]["schema"]
    )
