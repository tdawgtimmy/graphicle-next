from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute

from graphicle_api import __version__
from graphicle_api.routers import health, search
from graphicle_api.settings import get_settings


def _operation_id(route: APIRoute) -> str:
    """Use the bare handler name as the OpenAPI operationId.

    FastAPI's default mangles it into e.g. `health_health_get`, and that string
    becomes the name of the generated TypeScript type. Handler names are already
    unique within the app, so they make better public identifiers.
    """
    return route.name


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Graphicle API",
        version=__version__,
        summary="Network-of-documents storage, graph analysis, and natural-language query.",
        generate_unique_id_function=_operation_id,
        lifespan=lifespan,
    )

    # Normally empty: the web app proxies /api/py/* to this service, so the
    # browser only ever sees one origin and no CORS negotiation happens. This is
    # the escape hatch for the deployment shape where the API is public.
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(health.router)
    app.include_router(search.router)
    return app


app = create_app()
