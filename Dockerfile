# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.14
FROM python:${PYTHON_VERSION}-slim

# Install uv from its official image.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Copy the lock and project metadata first so dependency installation can be
# reused when only application code changes.
COPY be/pyproject.toml be/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

COPY be/app ./app

# Run as an unprivileged user with a writable home directory for tools such as uv.
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/home/appuser" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    appuser
USER appuser

EXPOSE 8000

CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]