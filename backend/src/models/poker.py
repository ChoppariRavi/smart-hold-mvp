from pydantic import BaseModel, Field
from typing import List, Optional

class CardModel(BaseModel):
    suit: str = Field(..., pattern="^[HDCS]$") # Hearts, Diamonds, Clubs, Spades
    value: str = Field(..., pattern="^(2|3|4|5|6|7|8|9|10|J|Q|K|A)$")

class EvaluationRequest(BaseModel):
    hand: List[CardModel] = Field(..., min_length=5, max_length=5)
    userId: Optional[str] = None

class EvaluationResponse(BaseModel):
    rank: str
    payout: int
    isOptimal: bool = True
    coachHint: Optional[str] = None

class GameState(BaseModel):
    game_id: str
    current_hand: List[CardModel]
    remaining_deck: List[CardModel]
    is_complete: bool = False

class DealResponse(BaseModel):
    game_id: str
    hand: List[CardModel]
    coach_suggestion: List[int] # <-- Add this!