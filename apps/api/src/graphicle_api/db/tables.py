"""SQLAlchemy Core table definitions mirroring supabase/migrations.

Core rather than the ORM: the query compiler builds statements programmatically
from a GraphQuery, which is what the expression language is for. Keeping these
in sync with the migrations is manual and deliberate — the migrations are the
source of truth for the database, these are the source of truth for query
building.
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

metadata = sa.MetaData()

nodes = sa.Table(
    "nodes",
    metadata,
    sa.Column("id", UUID(as_uuid=True), primary_key=True),
    sa.Column("type", sa.Text, nullable=False),
    sa.Column("label", sa.Text, nullable=False),
    sa.Column("body", sa.Text),
    sa.Column("attributes", JSONB, nullable=False),
    sa.Column("enrichment", JSONB, nullable=False),
    sa.Column("enrichment_source", sa.Text),
    sa.Column("enriched_at", sa.DateTime(timezone=True)),
    sa.Column("storage_key", sa.Text),
    sa.Column("source", sa.Text),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
)

edges = sa.Table(
    "edges",
    metadata,
    sa.Column("id", UUID(as_uuid=True), primary_key=True),
    sa.Column("source_id", UUID(as_uuid=True), sa.ForeignKey("nodes.id"), nullable=False),
    sa.Column("target_id", UUID(as_uuid=True), sa.ForeignKey("nodes.id"), nullable=False),
    sa.Column("type", sa.Text, nullable=False),
    sa.Column("weight", sa.Float, nullable=False),
    sa.Column("attributes", JSONB, nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
)

node_metrics = sa.Table(
    "node_metrics",
    metadata,
    sa.Column("node_id", UUID(as_uuid=True), sa.ForeignKey("nodes.id"), primary_key=True),
    sa.Column("degree", sa.Integer, nullable=False),
    sa.Column("in_degree", sa.Integer, nullable=False),
    sa.Column("out_degree", sa.Integer, nullable=False),
    sa.Column("betweenness", sa.Float),
    sa.Column("pagerank", sa.Float),
    sa.Column("community_id", sa.Integer),
    sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
)

#: Columns on `nodes` that a GraphQuery may filter or sort by directly.
#: Anything not listed here is treated as a path into `attributes`/`enrichment`,
#: so promoting an attribute to a real column later is additive, not breaking.
PROMOTED_NODE_COLUMNS: frozenset[str] = frozenset(
    {"id", "type", "label", "body", "source", "created_at", "updated_at"}
)

#: Sortable topology measures, resolved against `node_metrics`.
METRIC_COLUMNS: frozenset[str] = frozenset(
    {"degree", "in_degree", "out_degree", "betweenness", "pagerank", "community_id"}
)
