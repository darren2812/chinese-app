import os
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError, PyJWKClientError

bearer = HTTPBearer(auto_error=False)

supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
if not supabase_url.startswith("https://"):
    raise RuntimeError("SUPABASE_URL must be a valid HTTPS URL")

jwks_client = PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json")


def unauthorized(detail: str = "Invalid or expired access token."):
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict[str, Any]:
    if credentials is None:
        raise unauthorized("Sign-in required")
    token = credentials.credentials
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            issuer=f"{supabase_url}/auth/v1",
            options={"require": ["exp", "sub", "iss", "aud"]},
        )
    except jwt.ExpiredSignatureError:
        raise unauthorized("Access token has expired")
    except PyJWKClientConnectionError:
        raise HTTPException(
            status_code=503, detail="Authentication service unavailable"
        )
    except PyJWKClientError:
        # Could be unknown key ID or a malformed JWKS response.
        raise unauthorized()
    except jwt.InvalidTokenError:
        raise unauthorized()
