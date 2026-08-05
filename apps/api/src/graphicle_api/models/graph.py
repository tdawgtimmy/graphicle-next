from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class NodeMetrics(BaseModel):
    """Precomputed topology for one node, read from `node_metrics`."""

    degree: int = Field(description="Total incident edges.")
    in_degree: int = 0
    out_degree: int = 0
    betweenness: float | None = Field(
        default=None,
        description="Null when the last recompute skipped betweenness, which is O(V*E).",
    )
    pagerank: float | None = None
    community_id: int | None = None
    computed_at: datetime | None = None


class Node(BaseModel):
    """A document in the network."""

    id: UUID
    type: str
    label: str
    body: str | None = None
    attributes: dict[str, Any] = Field(
        default_factory=dict,
        description="Domain fields. Kept as a document rather than fixed columns.",
    )
    enrichment: dict[str, Any] = Field(
        default_factory=dict,
        description="Externally fetched data, kept separate from source attributes.",
    )
    enrichment_source: str | None = None
    enriched_at: datetime | None = None
    source: str | None = None
    metrics: NodeMetrics | None = None


class Edge(BaseModel):
    """A directed relationship between two documents."""

    source_id: UUID
    target_id: UUID
    type: str
    weight: float = 1.0


class Subgraph(BaseModel):
    """A filtered slice of the network, shaped for client-side layout."""

    nodes: list[Node] = Field(default_factory=list)
    edges: list[Edge] = Field(default_factory=list)
    truncated: bool = Field(
        default=False,
        description="True when the result hit the row limit and more matches exist.",
    )
