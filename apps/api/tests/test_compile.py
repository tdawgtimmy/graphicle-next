"""Compiler tests.

No LLM and no database: GraphQuery objects are hand-built and the emitted SQL is
inspected. This is where the security properties get pinned down.
"""

import pytest
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from graphicle_api.models.query import Filter, FilterOperator, GraphQuery, Sort
from graphicle_api.services.compile import UnknownFieldError, compile_query, resolve_field


def sql_of(query: GraphQuery) -> str:
    return str(compile_query(query).compile(dialect=postgresql.dialect()))


def params_of(query: GraphQuery) -> dict:
    return compile_query(query).compile(dialect=postgresql.dialect()).params


# --------------------------------------------------------- worked examples ---


def test_doctors_in_maine() -> None:
    """ "Show me all doctors in Maine" — a pure attribute filter, no traversal."""
    query = GraphQuery(
        filters=[
            Filter(field="profession", op=FilterOperator.EQ, value="doctor"),
            Filter(field="state", op=FilterOperator.EQ, value="ME"),
        ],
    )

    sql = sql_of(query)
    assert "attributes ->>" in sql
    assert set(params_of(query).values()) >= {"doctor", "ME", "profession", "state"}


def test_most_direct_connections() -> None:
    """ "Who has the most direct connections?" — degree desc, no filters."""
    query = GraphQuery(sort=Sort(field="degree", direction="desc"))

    sql = sql_of(query)
    assert "ORDER BY node_metrics.degree DESC" in sql
    assert "NULLS LAST" in sql
    assert "WHERE" not in sql


def test_the_two_examples_differ_only_in_populated_fields() -> None:
    filtered = GraphQuery(filters=[Filter(field="profession", value="doctor")])
    sorted_by_degree = GraphQuery(sort=Sort(field="degree"))

    assert filtered.sort is None
    assert sorted_by_degree.filters == []
    # Both are the same type and both compile.
    assert sql_of(filtered) != sql_of(sorted_by_degree)


def test_combined_attribute_and_topology_query() -> None:
    """The mixed shape: "the doctor in Maine with the most connections".

    One statement over one store — the case that would be a cross-database join
    if topology and attributes lived apart.
    """
    query = GraphQuery(
        filters=[
            Filter(field="profession", value="doctor"),
            Filter(field="state", value="ME"),
        ],
        sort=Sort(field="degree", direction="desc"),
        limit=1,
    )

    sql = sql_of(query)
    assert "LEFT OUTER JOIN node_metrics" in sql
    assert "attributes ->>" in sql
    assert "ORDER BY node_metrics.degree DESC" in sql


# ---------------------------------------------------------------- security ---


def test_field_names_are_bound_not_interpolated() -> None:
    """A hostile field name must land in params, never in SQL text."""
    hostile = "x'); drop table nodes; --"
    query = GraphQuery(filters=[Filter(field=hostile, value="v")])

    compiled = compile_query(query).compile(dialect=postgresql.dialect())

    assert "drop table" not in str(compiled).lower()
    assert hostile in compiled.params.values()


def test_hostile_value_is_bound() -> None:
    hostile = "'; delete from nodes; --"
    query = GraphQuery(filters=[Filter(field="label", value=hostile)])

    compiled = compile_query(query).compile(dialect=postgresql.dialect())

    assert "delete from nodes" not in str(compiled).lower()
    assert hostile in compiled.params.values()


def test_unknown_container_is_rejected() -> None:
    with pytest.raises(UnknownFieldError, match="Unknown container"):
        resolve_field("secrets.password")


def test_contains_escapes_like_wildcards() -> None:
    """A % in the search term must be a literal, not a wildcard."""
    query = GraphQuery(filters=[Filter(field="label", op=FilterOperator.CONTAINS, value="50%_off")])

    assert r"%50\%\_off%" in params_of(query).values()


# ------------------------------------------------------- field resolution ---


def test_promoted_column_wins_over_attribute() -> None:
    assert str(resolve_field("label")) == "nodes.label"


def test_metric_resolves_to_node_metrics() -> None:
    assert str(resolve_field("degree")) == "node_metrics.degree"


def test_bare_and_explicit_attribute_paths_agree() -> None:
    """Promoting an attribute later must not change what a stored query means."""
    bare = str(resolve_field("profession").compile(dialect=postgresql.dialect()))
    explicit = str(resolve_field("attributes.profession").compile(dialect=postgresql.dialect()))
    assert bare == explicit


def test_enrichment_path_is_addressable() -> None:
    sql = str(resolve_field("enrichment.npi").compile(dialect=postgresql.dialect()))
    assert "enrichment ->>" in sql


# ---------------------------------------------------------------- operators ---


def test_numeric_comparison_casts_jsonb_text() -> None:
    """Without a cast, jsonb ->> compares lexically and "9" > "10"."""
    query = GraphQuery(filters=[Filter(field="patient_count", op=FilterOperator.GT, value=10)])

    assert "CAST" in sql_of(query).upper()


def test_numeric_operator_rejects_non_numeric_value() -> None:
    query = GraphQuery(filters=[Filter(field="patient_count", op=FilterOperator.GT, value="many")])

    with pytest.raises(UnknownFieldError, match="needs a number"):
        compile_query(query)


def test_in_requires_a_non_empty_list() -> None:
    query = GraphQuery(filters=[Filter(field="state", op=FilterOperator.IN, value="ME")])

    with pytest.raises(UnknownFieldError, match="non-empty list"):
        compile_query(query)


def test_in_operator_compiles() -> None:
    query = GraphQuery(
        filters=[Filter(field="state", op=FilterOperator.IN, value=["ME", "NH", "VT"])]
    )

    assert "IN " in sql_of(query)


def test_exists_needs_no_value() -> None:
    query = GraphQuery(filters=[Filter(field="enrichment.npi", op=FilterOperator.EXISTS)])

    assert "IS NOT NULL" in sql_of(query)


def test_eq_without_value_is_rejected() -> None:
    query = GraphQuery(filters=[Filter(field="label", op=FilterOperator.EQ)])

    with pytest.raises(UnknownFieldError, match="needs a value"):
        compile_query(query)


def test_node_type_restriction() -> None:
    query = GraphQuery(node_types=["document", "person"])

    assert "nodes.type IN " in sql_of(query)


def test_full_text_search_uses_tsquery() -> None:
    query = GraphQuery(text="cardiology referral")

    sql = sql_of(query)
    assert "to_tsvector" in sql
    assert "plainto_tsquery" in sql


def test_default_ordering_is_stable() -> None:
    """Unordered results still need a deterministic order for pagination."""
    assert "ORDER BY nodes.label ASC" in sql_of(GraphQuery())


def test_sort_adds_a_tiebreaker() -> None:
    sql = sql_of(GraphQuery(sort=Sort(field="pagerank", direction="asc")))

    assert "node_metrics.pagerank ASC NULLS LAST" in sql
    assert "nodes.label ASC" in sql


def test_limit_is_bounded_by_the_model() -> None:
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        GraphQuery(limit=100_000)


def test_compiled_statement_is_a_select() -> None:
    assert isinstance(compile_query(GraphQuery()), sa.Select)
