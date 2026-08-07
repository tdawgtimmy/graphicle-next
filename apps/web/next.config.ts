import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle, so the runtime Docker image does
  // not need node_modules or the workspace lockfile.
  output: "standalone",

  // Note: /api/py/* is proxied to the FastAPI service by the route handler at
  // app/api/py/[...path]/route.ts, NOT by a rewrite here. `output: "standalone"`
  // resolves this config at build time and bakes rewrite destinations into the
  // image, which would make the runtime API_BASE_URL silently ineffective.
};

export default nextConfig;
