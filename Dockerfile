# === STAGE 1: Build the Next.js Frontend ===
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# === STAGE 2: Build the FastAPI Backend & Assemble Showcase ===
FROM python:3.12-slim
WORKDIR /app/backend

# Install system dependencies and copy uv package installer
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set up the Hugging Face sandbox user space (UID 1000 required by HF)
RUN useradd -m -u 1000 appuser

# Copy python configuration blueprints while we are still root
COPY backend/pyproject.toml backend/uv.lock* ./

# Run this while root (No permission issues)
RUN uv pip install --system --link-mode=copy -r pyproject.toml

# Switch down to the sandbox profile required by Hugging Face
USER appuser

# Setup execution paths cleanly
ENV PATH="/home/appuser/.local/bin:${PATH}"
ENV PYTHONPATH="/app/backend:${PYTHONPATH}"

# --- FIX 1: Copy everything inside backend directly into /app/backend ---
# This ensures main.py, src/, and any other modules are placed exactly in the working root
COPY --chown=appuser:appuser backend/ ./

# Pull the static compiled frontend bundle from Stage 1 into the execution root (/app/backend/out)
COPY --from=frontend-builder --chown=appuser:appuser /app/frontend/out ./out

# Hugging Face Spaces listen natively on port 7860
EXPOSE 7860

# --- FIX 2: Launch main:app right from the current directory ---
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]