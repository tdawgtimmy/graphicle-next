"""Postgres access for the document network."""

from collections.abc import Sequence
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncConnection

from graphicle_api.db.tables import edges, node_metrics, nodes
from graphicle_api.models.graph import Edge, Node, NodeMetrics, Subgraph
from graphicle_api.services.analysis import ComputedMetrics

#: nodes LEFT JOIN node_metrics — a node with no computed metrics is still a
#: valid result, it just reports `metrics: null`.
NODE_SELECT = sa.select(
    nodes.c.id,
    nodes.c.type,
    nodes.c.label,
    nodes.c.body,
    nodes.c.attributes,
    nodes.c.enrichment,
    nodes.c.enrichment_source,
    nodes.c.enriched_at,
    nodes.c.source,
    node_metrics.c.degree,
    node_metrics.c.in_degree,
    node_metrics.c.out_degree,
    node_metrics.c.betweenness,
    node_metrics.c.pagerank,
    node_metrics.c.community_id,
    node_metrics.c.computed_at,
).select_from(nodes.outerjoin(node_metrics, node_metrics.c.node_id == nodes.c.id))


def row_to_node(row: sa.Row) -> Node:
    metrics = (
        NodeMetrics(
            degree=row.degree,
            in_degree=row.in_degree,
            out_degree=row.out_degree,
            betweenness=row.betweenness,
            pagerank=row.pagerank,
            community_id=row.community_id,
            computed_at=row.computed_at,
        )
        if row.degree is not None
        else None
    )
    return Node(
        id=row.id,
        type=row.type,
        label=row.label,
        body=row.body,
        attributes=row.attributes or {},
        enrichment=row.enrichment or {},
        enrichment_source=row.enrichment_source,
        enriched_at=row.enriched_at,
        source=row.source,
        metrics=metrics,
    )


async def load_whole_graph(
    connection: AsyncConnection,
) -> tuple[list[UUID], list[tuple[UUID, UUID, float]]]:
    """Load every node id and edge, for a full metrics recompute."""
    node_rows = await connection.execute(sa.select(nodes.c.id))
    node_ids = [row.id for row in node_rows]

    edge_rows = await connection.execute(
        sa.select(edges.c.source_id, edges.c.target_id, edges.c.weight)
    )
    edge_list = [(row.source_id, row.target_id, row.weight) for row in edge_rows]

    return node_ids, edge_list


async def write_metrics(connection: AsyncConnection, metrics: Sequence[ComputedMetrics]) -> int:
    """Upsert computed topology into `node_metrics`."""
    if not metrics:
        return 0

    payload = [
        {
            "node_id": m.node_id,
            "degree": m.degree,
            "in_degree": m.in_degree,
            "out_degree": m.out_degree,
            "betweenness": m.betweenness,
            "pagerank": m.pagerank,
            "community_id": m.community_id,
            "computed_at": sa.func.now(),
        }
        for m in metrics
    ]

    statement = pg_insert(node_metrics).values(payload)
    statement = statement.on_conflict_do_update(
        index_elements=[node_metrics.c.node_id],
        set_={
            "degree": statement.excluded.degree,
            "in_degree": statement.excluded.in_degree,
            "out_degree": statement.excluded.out_degree,
            "betweenness": statement.excluded.betweenness,
            "pagerank": statement.excluded.pagerank,
            "community_id": statement.excluded.community_id,
            "computed_at": statement.excluded.computed_at,
        },
    )
    await connection.execute(statement)
    return len(payload)


async def fetch_edges_between(connection: AsyncConnection, node_ids: Sequence[UUID]) -> list[Edge]:
    """Edges with *both* endpoints inside the given set.

    Half-connected edges are excluded deliberately: a client laying the result
    out cannot draw an edge to a node it was not given.
    """
    if not node_ids:
        return []

    ids = list(node_ids)
    rows = await connection.execute(
        sa.select(edges.c.source_id, edges.c.target_id, edges.c.type, edges.c.weight).where(
            edges.c.source_id.in_(ids) & edges.c.target_id.in_(ids)
        )
    )
    return [
        Edge(source_id=r.source_id, target_id=r.target_id, type=r.type, weight=r.weight)
        for r in rows
    ]


async def fetch_subgraph(
    connection: AsyncConnection, statement: sa.Select, *, limit: int
) -> Subgraph:
    """Run a compiled node query and return it with its connecting edges.

    Fetches one row past `limit` to distinguish "exactly limit results" from
    "there are more", which the client needs in order to say so.
    """
    rows = (await connection.execute(statement.limit(limit + 1))).all()

    truncated = len(rows) > limit
    if truncated:
        rows = rows[:limit]

    node_list = [row_to_node(row) for row in rows]
    edge_list = await fetch_edges_between(connection, [n.id for n in node_list])

    return Subgraph(nodes=node_list, edges=edge_list, truncated=truncated)
