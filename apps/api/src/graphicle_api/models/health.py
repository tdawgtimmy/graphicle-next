from typing import Literal

from pydantic import BaseModel, Field


class Health(BaseModel):
    """Liveness payload. Also Render's health check target."""

    status: Literal["ok"] = "ok"
    environment: str = Field(description="Deployment environment name.")
    version: str = Field(description="API package version.")
