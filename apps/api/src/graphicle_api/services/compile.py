"""Compile a GraphQuery into a SQLAlchemy statement.

Security model: nothing from the query object is ever interpolated into SQL
text. Field names are resolved against allowlists or become *bound* jsonb keys;
values are always bound parameters. A hostile `field` or `value` can therefore
produce an UnknownFieldError or a wrong-but-safe result, never arbitrary SQL.
"""

import sqlalchemy as sa

from graphicle_api.db.tables import (
    METRIC_COLUMNS,
    PROMOTED_NODE_COLUMNS,
    node_metrics,
    nodes,
)
from graphicle_api.models.query import Filter, FilterOperator, GraphQuery
from graphicle_api.services.store import NODE_SELECT

#: jsonb documents a field may be addressed inside explicitly, as `<container>.<key>`.
JSON_CONTAINERS = {"attributes": nodes.c.attributes, "enrichment": nodes.c.enrichment}

_NUMERIC_OPERATORS = {
    FilterOperator.GT,
    FilterOperator.GTE,
    FilterOperator.LT,
    FilterOperator.LTE,
}


class UnknownFieldError(ValueError):
    """Raised when a query names a field that cannot be resolved."""


def _escape_like(value: str) -> str:
    """Neutralise LIKE wildcards in a user/model-supplied substring.

    Without this, a value containing % or _ silently becomes a wildcard search.
    """
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def resolve_field(field: str) -> sa.ColumnElement:
    """Map a query field name onto a column or jsonb path.

    Bare names prefer real columns, then topology measures, then fall back to a
    key in `attributes` — so promoting an attribute to a column later does not
    change what a stored query means.
    """
    container_name, _, key = field.partition(".")
    if key:
        container = JSON_CONTAINERS.get(container_name)
        if container is None:
            raise UnknownFieldError(
                f"Unknown container {container_name!r}; expected one of {sorted(JSON_CONTAINERS)}."
            )
        # SQLAlchemy binds `key` as a parameter — it is not SQL text.
        return container[key].astext

    if field in PROMOTED_NODE_COLUMNS:
        return nodes.c[field]
    if field in METRIC_COLUMNS:
        return node_metrics.c[field]
    return nodes.c.attributes[field].astext


def _filter_clause(predicate: Filter) -> sa.ColumnElement[bool]:
    column = resolve_field(predicate.field)
    operator = predicate.op
    value = predicate.value

    if operator is FilterOperator.EXISTS:
        return column.isnot(None)

    if operator is FilterOperator.IN:
        if not isinstance(value, list) or not value:
            raise UnknownFieldError(f"Operator 'in' on {predicate.field!r} needs a non-empty list.")
        return column.in_(value)

    if value is None:
        raise UnknownFieldError(f"Operator {operator!r} on {predicate.field!r} needs a value.")

    if operator is FilterOperator.CONTAINS:
        return column.ilike(f"%{_escape_like(str(value))}%", escape="\\")

    if operator in _NUMERIC_OPERATORS:
        # jsonb ->> yields text, which would compare lexically ("9" > "10").
        # Cast when the comparand is numeric so ordering means what it says.
        if isinstance(value, bool) or not isinstance(value, int | float):
            raise UnknownFieldError(
                f"Operator {operator.value!r} on {predicate.field!r} needs a number."
            )
        if not isinstance(column, sa.Column):
            column = sa.cast(column, sa.Numeric)
        comparison = {
            FilterOperator.GT: column > value,
            FilterOperator.GTE: column >= value,
            FilterOperator.LT: column < value,
            FilterOperator.LTE: column <= value,
        }
        return comparison[operator]

    if operator is FilterOperator.NEQ:
        return column.isnot(value) if isinstance(value, bool) else column != value

    return column == value


def _order_by(query: GraphQuery) -> list[sa.UnaryExpression]:
    if query.sort is None:
        return [nodes.c.label.asc()]

    column = resolve_field(query.sort.field)
    ordering = column.desc() if query.sort.direction == "desc" else column.asc()

    # NULLs last in both directions: a node with no computed metrics should never
    # head a "most connections" list, nor a "fewest" one.
    return [ordering.nullslast(), nodes.c.label.asc()]


def compile_query(query: GraphQuery) -> sa.Select:
    """Build the node-selection statement. The caller applies LIMIT."""
    statement = NODE_SELECT

    clauses: list[sa.ColumnElement[bool]] = []

    if query.node_types:
        clauses.append(nodes.c.type.in_(query.node_types))

    clauses.extend(_filter_clause(predicate) for predicate in query.filters)

    if query.text:
        clauses.append(
            sa.func.to_tsvector("english", sa.func.coalesce(nodes.c.body, "")).op("@@")(
                sa.func.plainto_tsquery("english", query.text)
            )
        )

    if clauses:
        statement = statement.where(sa.and_(*clauses))

    return statement.order_by(*_order_by(query))
