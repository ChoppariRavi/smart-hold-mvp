# backend/src/main.py
from fastapi import FastAPI
from src.api.routes import router # Import the router from your routes file

app = FastAPI(title="Smart Hold Poker API")

# This "attaches" your routes to the main app
app.include_router(router)

@app.get("/")
async def root():
    return {"message": "Poker Engine is Online"}