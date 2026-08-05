# Build context is the REPO ROOT, not apps/web: the install needs the workspace
# lockfile and libs/shared-types. See render.yaml dockerContext.
# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /repo

# Workspace manifests only, so a source edit does not invalidate the install layer.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY libs/shared-types/package.json libs/shared-types/
RUN npm ci


FROM node:22-alpine AS builder
WORKDIR /repo
# npm workspaces hoist to the root, so this is the whole install.
COPY --from=deps /repo/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Deliberately `npm run build`, not `nx build`. The Nx build target dependsOn
# ^build, which would chain to @graphicle/api:export-openapi and require a
# Python toolchain in this image. api.d.ts is committed exactly so that is not
# needed — the generated file is the input here, not something to regenerate.
# The Nx chain still runs in dev and CI, where uv is present.
RUN npm run build -w @graphicle/web


FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 10001 nodejs && adduser -u 10001 -G nodejs -S nextjs

# `output: "standalone"` emits a self-contained server plus only the modules it
# actually uses — no node_modules copy, no lockfile in the runtime image.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
