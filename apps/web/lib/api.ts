/**
 * Typed client for the FastAPI backend.
 *
 * Every type here is generated from the API's OpenAPI schema, which is itself
 * generated from the Pydantic models — so a field renamed in Python becomes a
 * TypeScript error here rather than a runtime surprise. Regenerate with:
 *
 *     nx run shared-types:build
 */
import type { components } from "@graphicle/shared-types"

type Schemas = components["schemas"]

export type GraphQuery = Schemas["GraphQuery"]
export type SearchResponse = Schemas["SearchResponse"]
export type Filter = Schemas["Filter"]
export type FilterOperator = Schemas["FilterOperator"]
export type Sort = Schemas["Sort"]
export type NodeMetrics = Schemas["NodeMetrics"]

// Aliased: the API's `Node` and `Edge` would otherwise shadow the DOM globals.
export type GraphNode = Schemas["Node"]
export type GraphEdge = Schemas["Edge"]

/** Matches the rewrite in next.config.ts — same-origin, so no CORS. */
const API_PREFIX = "/api/py"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string
  ) {
    super(`API ${status}: ${detail}`)
    this.name = "ApiError"
  }
}

async function post<TBody, TResult>(
  path: string,
  body: TBody,
  signal?: AbortSignal
): Promise<TResult> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    // FastAPI puts the message in `detail`; fall back to the status text when
    // the failure came from somewhere else (a proxy, a network error page).
    const detail = await response
      .json()
      .then((payload) =>
        typeof payload?.detail === "string" ? payload.detail : response.statusText
      )
      .catch(() => response.statusText)

    throw new ApiError(response.status, detail)
  }

  return (await response.json()) as TResult
}

/**
 * Ask a question in natural language.
 *
 * The response carries `interpreted` — the structured query the question was
 * understood to mean. Show it, and let the user correct it via {@link runQuery}.
 */
export function search(question: string, signal?: AbortSignal): Promise<SearchResponse> {
  return post<{ question: string }, SearchResponse>("/search", { question }, signal)
}

/**
 * Run a structured query directly, with no LLM call.
 *
 * Use for saved queries, faceted filtering, and re-running an edited
 * interpretation — same compiler and same results as {@link search}.
 */
export function runQuery(query: GraphQuery, signal?: AbortSignal): Promise<SearchResponse> {
  return post<GraphQuery, SearchResponse>("/graph/query", query, signal)
}
