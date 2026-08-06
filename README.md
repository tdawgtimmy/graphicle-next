# Graphicle

Graphicle is a visual analytics system for exploring large, multivariate networks. It blends unit visualization (scatterplots, packed grids) with network visualization (force-directed layouts) so that analysts can move fluidly between "what does this entity look like" and "what is it connected to," instead of switching tools.

This repo is a from-scratch rebuild of the system described in our IEEE TVCG paper (see [Background](#background)), targeting a modern web stack and adding a natural-language query layer on top of the original interaction model.

## Background

Graphicle originated as a research system built with Rahul C. Basole at Georgia Tech, evaluated with pharmaceutical field teams exploring a dataset of 23,207 neurologists and 44,256 referral relationships. The paper characterizes a design space between direct, packed, and network unit visualizations, defines the forms of context (filtered, container, structural) that arise when blending them, and demonstrates the approach through clustered grids, clustered networks, and force-clustered layouts.

This project carries forward that interaction model — units-on-a-canvas, scented filters, context bars, multi-focus/multi-scale exploration — and rebuilds it as a modern full-stack app, with an LLM-backed natural-language query agent replacing hand-built filter queries as one of the entry points into the data.

If you use this work, please cite:

```bibtex
@article{major2020graphicle,
  title   = {Graphicle: Exploring Units, Networks, and Context in a Blended Visualization Approach},
  author  = {Major, Timothy and Basole, Rahul C.},
  journal = {IEEE Transactions on Visualization and Computer Graphics},
  year    = {2020}
}
```

## Architecture

Nx monorepo on npm workspaces:

| Path                | Project                   | What it is                                                       |
| ------------------- | ------------------------- | ---------------------------------------------------------------- |
| `apps/web`          | `@graphicle/web`          | Next.js 16 app (React 19, shadcn/ui, Storybook)                  |
| `apps/api`          | `@graphicle/api`          | FastAPI backend — graph storage, igraph analysis, NL query agent |
| `libs/shared-types` | `@graphicle/shared-types` | TypeScript types generated from the API's OpenAPI schema         |
| `supabase/`         | —                         | Postgres schema migrations and local CLI config                  |

The browser only talks to Next.js, which proxies `/api/py/*` to FastAPI. Graph data lives in Postgres with topology (degree, betweenness, pagerank, community) precomputed via `igraph`; natural-language search goes through an LLM agent ([Pydantic AI](https://ai.pydantic.dev)) that produces a structured query, not raw SQL.

## Getting started

**Prerequisites:** Node.js 20+, [uv](https://docs.astral.sh/uv/), the [Supabase CLI](https://supabase.com/docs/guides/cli), and Docker (for local Supabase).

```bash
# install JS dependencies (installs Nx and workspace packages)
npm install

# start local Postgres via Supabase
npx supabase start

# copy env files and fill in secrets (Anthropic API key, etc.)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Run the apps:

```bash
nx dev @graphicle/web       # http://localhost:3000
nx serve @graphicle/api     # http://localhost:8000/docs
```

After changing a Postgres-backed model, recompute derived graph metrics:

```bash
nx run @graphicle/api:recompute-metrics
```

## Development

```bash
nx run-many -t lint typecheck test    # across all projects
nx run @graphicle/web:storybook       # component development, localhost:6006
```

After changing a Pydantic model in `apps/api/src/graphicle_api/models/`, regenerate the shared TypeScript types:

```bash
nx run @graphicle/shared-types:build
```

`libs/shared-types/src/api.d.ts` is generated but committed, so the web app builds without a Python toolchain. `nx run @graphicle/shared-types:check-current` fails CI if it drifts from the API.

## Deployment

`render.yaml` defines a two-service [Render](https://render.com) blueprint: a public Next.js web service and a private FastAPI service reachable only through the web app's proxy. Both build from the repo root so each Dockerfile can reach files outside its own app directory (the workspace lockfile, `uv.lock`).

## Status

Under early development.
