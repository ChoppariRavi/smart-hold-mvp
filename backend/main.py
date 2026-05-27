# backend/src/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from src.api.routes import router # Import the router from your routes file

app = FastAPI(title="Smart Hold Poker API")

# 1. Setup CORS properly for both Local Dev and Hugging Face Production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://ravichoppari2020-smart-hold-poker.hf.space"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files from the 'public' directory
app.mount("/public", StaticFiles(directory="public"), name="public")

# This "attaches" your routes to the main app
app.include_router(router)

# --- ADD THIS TO THE BOTTOM OF THE FILE ---
# Mount the compiled Next.js static asset folder
# (We will instruct Docker to drop the compiled front-end inside a directory named 'out')
if os.path.exists("out"):
    app.mount("/", StaticFiles(directory="out", html=True), name="static")
    
    @app.exception_handler(404)
    async def custom_404_handler(request, __):
        # Enables client-side routing fallback support for Single Page Applications
        return FileResponse("out/index.html")

@app.get("/")
async def root():
    return {"message": "Poker Engine is Online"}