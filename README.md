---
title: Smart Hold Poker
emoji: 🃏
colorFrom: green
colorTo: gray
sdk: docker
pinned: false
---

# Smart-Hold Video Poker MVP

An AI-Assisted video poker coaching application using a **FastAPI** backend game engine and a **Next.js** static frontend dashboard, fully orchestrated via Docker on Hugging Face Spaces.

Run Application:
uv run uvicorn main:app --reload --app-dir .

uv run python -m unittest discover -s backend/tests -p "test_*.py" -v