"""Allow `uvicorn app.main:app` to load the existing top-level app."""

from importlib import import_module


# Reuse the current backend entrypoint instead of duplicating app setup.
app = import_module("main").app
