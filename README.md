# Chinese App

This repository contains two independent applications:

- `web/` — React, TypeScript, and Vite frontend
- `be/` — FastAPI backend managed with uv

## Frontend

```powershell
cd web
npm install
npm run dev
```

## Backend

```powershell
cd be
uv sync
uv run fastapi dev app/main.py
```

In VS Code, select `be/.venv/Scripts/python.exe` as the Python interpreter.
