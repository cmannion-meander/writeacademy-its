"""
Shared authentication dependency for all WriteAcademy API routers.
Extracted from main.py so new routers can import without circular deps.

Set DISABLE_AUTH=true (default) to skip API key checks — useful for
hackathon demos and Cloud Run deployments behind --allow-unauthenticated.
"""

import os
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

_API_KEY = os.getenv("WRITEACADEMY_API_KEY", "")
_DISABLE_AUTH = os.getenv("DISABLE_AUTH", "true").lower() in ("true", "1", "yes")


async def get_api_key(api_key: str | None = Security(api_key_header)) -> None:
    if _DISABLE_AUTH:
        return
    if not _API_KEY or api_key != _API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
