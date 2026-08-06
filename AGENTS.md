<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workspace layout

Nx monorepo on npm workspaces. Nx project names come from `package.json`, so they
are scoped:

| Path                | Project                   | What it is                              |
| ------------------- | ------------------------- | --------------------------------------- |
| `apps/web`          | `@graphicle/web`          | Next.js 16 app (shadcn, Storybook)      |
| `apps/api`          | `@graphicle/api`          | FastAPI backend, `uv`-managed           |
| `libs/shared-types` | `@graphicle/shared-types` | TypeScript types generated from the API |
| `supabase/`         | —                         | Migrations and local CLI config         |

Common commands, from the repo root:

```
nx dev @graphicle/web            # localhost:3000
nx serve @graphicle/api          # localhost:8000/docs
nx run-many -t lint typecheck test
nx run @graphicle/api:recompute-metrics
```

# Types cross the Python/TypeScript boundary by generation

**Pydantic models in `apps/api/src/graphicle_api/models/` are the source of truth
for every shared type.** Do not hand-write a TypeScript interface that mirrors an
API response — it will drift.

The chain: Pydantic model → FastAPI OpenAPI schema → `openapi-typescript` →
`libs/shared-types/src/api.d.ts` → imported by `apps/web`. Nx wires it up, so
`nx run @graphicle/shared-types:build` regenerates and `typecheck`/`build` pull it
in automatically.

`api.d.ts` is **generated but committed**, so the web app builds without a Python
toolchain (the web Dockerfile relies on this). After changing an API model,
regenerate and commit the result; `nx run @graphicle/shared-types:check-current`
fails if it is stale.

FastAPI is configured with `generate_unique_id_function`, so operation ids are
clean (`operations["health"]`, not `health_health_get`). Keep route handler names
meaningful — they become the public TypeScript names.

# The LLM never writes SQL

`agents/query.py` outputs a `GraphQuery` (a Pydantic model);
`services/compile.py` turns that into SQL. Preserve this boundary — it is what
makes the query path injection-free, testable without an LLM, and portable to a
different datastore.

When adding a filter operator or sortable field, add it to `GraphQuery` and the
compiler, and cover it in `tests/test_compile.py`, which asserts on emitted SQL
and needs neither a database nor an API key.

Provider is a settings string (`LLM_MODEL=anthropic:claude-opus-5`) via Pydantic
AI, so do not import a vendor SDK directly in route or service code.

# Graph data

Node columns are deliberately domain-neutral; domain fields live in the
`attributes` JSONB document. In a query, a bare field name and its explicit path
resolve identically (`profession` == `attributes.profession`), so promoting a hot
attribute to a real column later does not change what an existing query means.

Topology (`degree`, `betweenness`, `pagerank`, `community_id`) is precomputed
into `node_metrics` by igraph and joined at query time — that is what lets a
single statement mix attribute filters with structural sorts. Recompute after
changing graph data.

# Web talks to the API through a proxy, not a rewrite

`apps/web/app/api/py/[...path]/route.ts` proxies `/api/py/*` to the FastAPI
service, reading `API_BASE_URL` per request. Do **not** convert this to a
`rewrites()` entry in `next.config.ts`: with `output: "standalone"` Next resolves
that config at build time and bakes the destination into the image, so the
runtime variable is silently ignored.

One origin for the browser means there is no CORS configuration in this stack,
and the API can stay a Render private service. Keep it that way.

# shadcn Storybook stories

`components.json` lives in `apps/web`, so run shadcn commands from there.

When installing a shadcn/ui component that has a Storybook story available, install the story too from the `@lloyd` registry (https://registry.lloydrichards.dev, `base` variant) instead of hand-writing one.

The registry alias is already configured in `components.json`:

```json
"registries": {
  "@lloyd": "https://registry.lloydrichards.dev/v3/base/{name}.json"
}
```

Install stories with:

```
npx shadcn@latest add @lloyd/<component-name>-story
```

e.g. `npx shadcn@latest add @lloyd/button-story`. Check the registry (or run with `--dry-run` first) to confirm a story exists for a given component before assuming the name — not every shadcn component has one.

# Storybook MCP support

When working on UI components, always use the `storybook` MCP tools to access Storybook's component and documentation knowledge before answering or taking any action.

- **CRITICAL: Never hallucinate component properties!** Before using ANY property on a component from a design system (including common-sounding ones like `shadow`, etc.), you MUST use the MCP tools to check if the property is actually documented for that component.
- Query `list-all-documentation` to get a list of all components
- Query `get-documentation` for that component to see all available properties and examples
- Only use properties that are explicitly documented or shown in example stories
- If a property isn't documented, do not assume properties based on naming conventions or common patterns from other libraries. Check back with the user in these cases.
- Use the `get-storybook-story-instructions` tool to fetch the latest instructions for creating or updating stories. This will ensure you follow current conventions and recommendations.
- Check your work by running `run-story-tests`.

Remember: A story name might not reflect the property name correctly, so always verify properties through documentation or example stories before using them.
