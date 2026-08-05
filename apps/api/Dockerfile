# Build context is the REPO ROOT, not apps/api (see render.yaml dockerContext).
# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Dependency layer first, so application edits do not re-resolve the whole tree.
# --frozen fails loudly if uv.lock is out of date rather than silently drifting.
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

COPY apps/api/src ./src
COPY apps/api/scripts ./scripts

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

ENV PATH="/opt/venv/bin:$PATH"

# Run unprivileged.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# Render injects $PORT; default keeps `docker run` working locally.
CMD ["sh", "-c", "uvicorn graphicle_api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
