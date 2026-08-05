"""The structured query contract.

This is the LLM's output type. The model never writes SQL — it fills in this
object, and `services/compile.py` turns it into a statement. That gives three
things: no injection surface, a compiler that is testable with hand-written
queries and no LLM, and a store-agnostic boundary (swapping datastores rewrites
the compiler, not the agent).
"""

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field

from graphicle_api.models.graph import Edge, Node

MAX_LIMIT = 500
DEFAULT_LIMIT = 50


class FilterOperator(StrEnum):
    EQ = "eq"
    NEQ = "neq"
    CONTAINS = "contains"
    IN = "in"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    EXISTS = "exists"


class Filter(BaseModel):
    """One predicate against a node.

    `field` is resolved in this order:

    1. `attributes.x` / `enrichment.x` — an explicit path into that document
    2. a promoted node column (`type`, `label`, `source`, ...)
    3. a topology measure (`degree`, `pagerank`, ...)
    4. otherwise, a key in `attributes`

    So `profession` and `attributes.profession` mean the same thing today, and
    keep meaning the same thing after `profession` is promoted to a real column.
    """

    field: str = Field(description="Attribute name, promoted column, or topology measure.")
    op: FilterOperator = FilterOperator.EQ
    value: str | float | bool | list[str] | None = Field(
        default=None,
        description="Omitted for `exists`. A list is required for `in`.",
    )


class Sort(BaseModel):
    field: str = Field(description="Topology measure or node column to order by.")
    direction: Literal["asc", "desc"] = "desc"


class GraphQuery(BaseModel):
    """A filter/sort over the document network.

    Both worked examples land here:

    - "Show me all doctors in Maine" -> two attribute filters, no sort
    - "Who has the most direct connections?" -> no filters, sort by degree desc

    They differ only in which fields are populated, which is exactly why this
    shape is worth having.
    """

    node_types: list[str] = Field(
        default_factory=list,
        description="Restrict to these node types. Empty means all types.",
    )
    filters: list[Filter] = Field(default_factory=list)
    text: str | None = Field(
        default=None,
        description="Full-text search over document body. Use only for genuinely "
        "free-text intent, not for values better expressed as a filter.",
    )
    sort: Sort | None = None
    limit: int = Field(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT)


class SearchRequest(BaseModel):
    question: str = Field(min_length=1, description="A natural-language question.")


class SearchResponse(BaseModel):
    """Results plus the interpretation that produced them.

    `interpreted` is returned so the UI can show what the question was understood
    to mean — the difference between a search box and an explainable one.
    """

    question: str
    interpreted: GraphQuery
    nodes: list[Node] = Field(default_factory=list)
    edges: list[Edge] = Field(default_factory=list)
    truncated: bool = False
