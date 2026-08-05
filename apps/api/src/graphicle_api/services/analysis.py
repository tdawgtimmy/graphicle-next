"""Structural analysis of the document network.

Deliberately pure: it takes node ids and edge tuples and returns metrics, with
no database involvement. That keeps the graph algorithms unit-testable without
a Postgres instance, and keeps the storage layer free of igraph concepts.

igraph is C-backed and comfortable to a few million edges in-process, which is
well past what a browser can render — so it covers anything intended to be
visualised. The output is written to `node_metrics` so structural questions
become indexed sorts that compose with attribute filters.
"""

import random
from collections.abc import Sequence
from dataclasses import dataclass
from uuid import UUID

import igraph as ig

#: Louvain is randomised; fix the RNG so repeated runs over unchanged data do not
#: churn community ids (and so tests are deterministic).
_COMMUNITY_SEED = 0


@dataclass(frozen=True, slots=True)
class ComputedMetrics:
    node_id: UUID
    degree: int
    in_degree: int
    out_degree: int
    betweenness: float | None
    pagerank: float | None
    community_id: int | None


def compute_metrics(
    node_ids: Sequence[UUID],
    edges: Sequence[tuple[UUID, UUID, float]],
    *,
    directed: bool = True,
    include_betweenness: bool = True,
) -> list[ComputedMetrics]:
    """Compute per-node topology.

    `include_betweenness` exists because betweenness is O(V*E) — the one measure
    worth skipping on large graphs or frequent recomputes. It is O(V*E) wherever
    it runs; a graph database would not make it cheap.

    Edges referencing nodes outside `node_ids` are dropped rather than creating
    phantom vertices, so callers can safely pass a filtered slice.
    """
    if not node_ids:
        return []

    index = {node_id: position for position, node_id in enumerate(node_ids)}

    pairs: list[tuple[int, int]] = []
    weights: list[float] = []
    for source, target, weight in edges:
        if source in index and target in index:
            pairs.append((index[source], index[target]))
            weights.append(weight)

    graph = ig.Graph(n=len(node_ids), edges=pairs, directed=directed)
    if pairs:
        graph.es["weight"] = weights

    degree = graph.degree(mode="all")
    in_degree = graph.degree(mode="in") if directed else list(degree)
    out_degree = graph.degree(mode="out") if directed else list(degree)

    # Betweenness is computed UNWEIGHTED on purpose. igraph treats betweenness
    # weights as edge *distances* (higher = further apart), but our `weight`
    # means relationship strength (higher = closer). Passing it directly would
    # silently invert the meaning, so we use hop counts instead. If a real
    # distance measure is ever needed, pass 1/weight explicitly.
    betweenness: list[float | None]
    if include_betweenness:
        betweenness = list(graph.betweenness(directed=directed))
    else:
        betweenness = [None] * len(node_ids)

    # PageRank does treat weights as connection strength, so weighting is correct.
    pagerank = graph.pagerank(weights=weights if pairs else None, directed=directed)

    communities = _detect_communities(graph, has_edges=bool(pairs))

    return [
        ComputedMetrics(
            node_id=node_id,
            degree=degree[position],
            in_degree=in_degree[position],
            out_degree=out_degree[position],
            betweenness=betweenness[position],
            pagerank=pagerank[position],
            community_id=communities[position],
        )
        for position, node_id in enumerate(node_ids)
    ]


def _detect_communities(graph: ig.Graph, *, has_edges: bool) -> list[int]:
    """Louvain community detection.

    Louvain is undirected-only, so a directed graph is collapsed first, summing
    the weights of reciprocal edges.
    """
    if not has_edges:
        # Every node is its own community; Louvain on an edgeless graph is a
        # no-op but igraph's behaviour there is not worth relying on.
        return list(range(graph.vcount()))

    ig.set_random_number_generator(random.Random(_COMMUNITY_SEED))

    undirected = (
        graph.as_undirected(mode="collapse", combine_edges={"weight": "sum"})
        if graph.is_directed()
        else graph
    )
    clustering = undirected.community_multilevel(weights="weight")
    return list(clustering.membership)
