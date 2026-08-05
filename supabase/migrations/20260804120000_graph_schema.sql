-- Graph schema: a network of documents.
--
-- Hybrid document model. The columns below are deliberately domain-neutral —
-- every domain-specific field (profession, state, specialty, ...) lives in
-- `attributes` jsonb. Once real query patterns are known, promote the handful
-- you filter on constantly into typed columns with an ALTER TABLE plus a
-- backfill; the query compiler already treats promoted columns and jsonb paths
-- the same way, so promoting one is not a breaking change for callers.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- nodes ----

create table if not exists public.nodes (
    id                uuid primary key default gen_random_uuid(),
    type              text        not null,
    label             text        not null,

    -- Document text lives in its own column, not buried in jsonb, so full-text
    -- search works against it and a pgvector embedding column can be added
    -- alongside later without touching the document payload.
    body              text,

    -- The long tail of document attributes.
    attributes        jsonb       not null default '{}'::jsonb,

    -- External enrichment, kept separate from source attributes so provenance
    -- is queryable and a re-fetch never clobbers original data.
    enrichment        jsonb       not null default '{}'::jsonb,
    enrichment_source text,
    enriched_at       timestamptz,

    -- Large raw files (PDFs, etc.) belong in Supabase Storage; this is the key.
    storage_key       text,

    source            text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists nodes_type_idx  on public.nodes (type);
create index if not exists nodes_label_idx on public.nodes (label);

-- jsonb_ops (the default) rather than jsonb_path_ops: it is larger, but it
-- supports key-existence (?, ?&, ?|) as well as containment (@>), and the query
-- compiler needs both.
create index if not exists nodes_attributes_gin on public.nodes using gin (attributes);
create index if not exists nodes_enrichment_gin on public.nodes using gin (enrichment);

create index if not exists nodes_body_fts
    on public.nodes using gin (to_tsvector('english', coalesce(body, '')));

-- Example of the hot-path pattern — a plain btree over a jsonb field, as fast
-- as a real column. Add one per attribute you filter on often:
--   create index nodes_attr_profession_idx on public.nodes ((attributes ->> 'profession'));

-- ---------------------------------------------------------------- edges ----

create table if not exists public.edges (
    id         uuid primary key default gen_random_uuid(),
    source_id  uuid             not null references public.nodes (id) on delete cascade,
    target_id  uuid             not null references public.nodes (id) on delete cascade,
    type       text             not null,
    weight     double precision not null default 1.0,
    attributes jsonb            not null default '{}'::jsonb,
    created_at timestamptz      not null default now()
);

-- One edge per (source, target, type); re-ingesting is an upsert, not a duplicate.
create unique index if not exists edges_unique_idx
    on public.edges (source_id, target_id, type);

-- Indexed in both directions: traversal and degree run either way.
create index if not exists edges_source_idx on public.edges (source_id);
create index if not exists edges_target_idx on public.edges (target_id);
create index if not exists edges_type_idx   on public.edges (type);

-- --------------------------------------------------------- node_metrics ----

-- Precomputed topology. Recomputed by igraph in the API when the graph changes
-- (see services/analysis.py). This exists so structural questions such as
-- "who has the most direct connections?" are an indexed sort that composes with
-- attribute filters in a single statement. Needed regardless of datastore:
-- betweenness is O(V*E) wherever it runs.
create table if not exists public.node_metrics (
    node_id      uuid primary key references public.nodes (id) on delete cascade,
    degree       integer not null default 0,
    in_degree    integer not null default 0,
    out_degree   integer not null default 0,
    betweenness  double precision,
    pagerank     double precision,
    community_id integer,
    computed_at  timestamptz not null default now()
);

create index if not exists node_metrics_degree_idx
    on public.node_metrics (degree desc);
create index if not exists node_metrics_pagerank_idx
    on public.node_metrics (pagerank desc nulls last);
create index if not exists node_metrics_betweenness_idx
    on public.node_metrics (betweenness desc nulls last);
create index if not exists node_metrics_community_idx
    on public.node_metrics (community_id);

-- ------------------------------------------------------------- updated_at --

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists nodes_set_updated_at on public.nodes;
create trigger nodes_set_updated_at
    before update on public.nodes
    for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------- RLS --

-- Deny-by-default. The API reaches Postgres over a direct connection as the
-- owner role, which is not subject to RLS, so this costs it nothing. It means
-- that if these tables are ever exposed through PostgREST, anon and
-- authenticated get nothing until a policy is written deliberately.
alter table public.nodes        enable row level security;
alter table public.edges        enable row level security;
alter table public.node_metrics enable row level security;
