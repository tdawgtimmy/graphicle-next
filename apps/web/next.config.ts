import type { NextConfig } from "next"

// Where the FastAPI service lives. Locally that is the uvicorn dev server; on
// Render it is the API service's internal hostname, injected by render.yaml.
const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8000"

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle, so the runtime Docker image does
  // not need node_modules or the workspace lockfile.
  output: "standalone",

  async rewrites() {
    return [
      // The browser only ever talks to this origin; Next proxies to the API.
      // That means no CORS anywhere, and the API needs no public surface.
      // /health is deliberately not proxied — it is Render's internal check.
      {
        source: "/api/py/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
