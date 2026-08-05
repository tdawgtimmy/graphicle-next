from fastapi import APIRouter

from graphicle_api import __version__
from graphicle_api.models.health import Health
from graphicle_api.settings import get_settings

router = APIRouter(tags=["system"])


@router.get("/health", response_model=Health, summary="Liveness check")
async def health() -> Health:
    settings = get_settings()
    return Health(environment=settings.environment, version=__version__)
