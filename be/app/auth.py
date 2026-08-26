import os

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

bearer = HTTPBearer(auto_error=False)

supabase_url = os.environ["SUPABASE_URL"].rstrip("/")

jwks_client = PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json")


def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign-in required")
    token = credentials.credentials
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    claims = jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256"],
        audience="authenticated",
        issuer=f"{supabase_url}/auth/v1",
        options={"require": ["exp", "sub", "iss", "aud"]},
    )
    return claims
