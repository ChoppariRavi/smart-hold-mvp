# config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Keys - Never hardcode these!
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o")
    
    # Flask Security
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-key-123")
    
    # Game Constants
    BLACKJACK_PAYOUT = 1.5
    DEALER_STAND_THRESHOLD = 17