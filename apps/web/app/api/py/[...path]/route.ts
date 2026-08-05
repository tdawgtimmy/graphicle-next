/**
 * Reverse proxy to the FastAPI service.
 *
 * Why a route handler rather than a `rewrites()` entry in next.config.ts:
 * with `output: "standalone"`, Next resolves the config at BUILD time and bakes
 * the rewrite destination into `required-server-files.json`. A runtime
 * `API_BASE_URL` is then silently ignored, so an image built locally would keep
 * pointing at 127.0.0.1 in production. This reads the variable per request, so
 * one image works in every environment.
 *
 * Keeping the browser on a single origin means no CORS anywhere, and lets the
 * API stay a Render private service with no public surface.
 */
import type { NextRequest } from "next/server"

export const runtime = "nodejs"
// The upstream target is environment-dependent, so this can never be static.
export const dynamic = "force-dynamic"

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000"

/** Hop-by-hop headers that must not be forwarded to the upstream. */
const STRIPPED_REQUEST_HEADERS = ["host", "connection", "keep-alive", "transfer-encoding"]

/**
 * fetch() already decodes the body and recomputes framing; forwarding these
 * verbatim would describe the payload incorrectly to the browser.
 */
const STRIPPED_RESPONSE_HEADERS = ["content-encoding", "content-length", "transfer-encoding"]

/**
 * Render's `fromService` injects a private service address as `host:port` with
 * no scheme, so accept that form and default it to http (internal traffic never
 * leaves the private network).
 */
function normaliseBaseUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `http://${value}`
}

async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const base = normaliseBaseUrl(process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL)
  const target = new URL(`/api/${path.map(encodeURIComponent).join("/")}`, base)
  target.search = request.nextUrl.search

  const headers = new Headers(request.headers)
  for (const header of STRIPPED_REQUEST_HEADERS) headers.delete(header)

  const hasBody = request.method !== "GET" && request.method !== "HEAD"

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Required by Node when the body is a stream.
      ...(hasBody ? { duplex: "half" } : {}),
      redirect: "manual",
      signal: request.signal,
    } as RequestInit)
  } catch (cause) {
    // The API being unreachable is a gateway problem, not a 500 from this app.
    console.error(`Proxy to ${target.href} failed:`, cause)
    return Response.json({ detail: `Cannot reach the API at ${base}.` }, { status: 502 })
  }

  const responseHeaders = new Headers(upstream.headers)
  for (const header of STRIPPED_RESPONSE_HEADERS) responseHeaders.delete(header)

  // Pass the body through as a stream so long-running responses arrive
  // incrementally rather than being buffered here.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

type Context = { params: Promise<{ path: string[] }> }

async function handler(request: NextRequest, context: Context): Promise<Response> {
  const { path } = await context.params
  return proxy(request, path)
}

export {
  handler as DELETE,
  handler as GET,
  handler as PATCH,
  handler as POST,
  handler as PUT,
}
