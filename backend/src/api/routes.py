from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.models.poker import EvaluationRequest, EvaluationResponse, CardModel
from src.core.evaluator import evaluate_hand
from src.core.constants import PAYTABLE
from src.core.deck import Deck
import uuid
from typing import Dict

# In-memory store: { game_id: {"hand": [], "deck": []} }
game_sessions: Dict[str, dict] = {}

router = APIRouter()

@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_poker_hand(request: EvaluationRequest):
    # 1. Convert Pydantic models to lists for your evaluator logic
    ranks = [c.value for c in request.hand]
    suits = [c.suit for c in request.hand]
    
    # 2. Run the math logic
    try:
        # Convert values like 'J' to 11 for the evaluator if needed
        # (Assuming your evaluator handles strings or you map them here)
        result_rank = evaluate_hand(ranks, suits)
        payout = PAYTABLE.get(result_rank, 0)
        
        return EvaluationResponse(
            rank=result_rank,
            payout=payout,
            coachHint="Nice hand! You played this optimally."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DealResponse(BaseModel):
    game_id: str
    hand: list[CardModel]

@router.get("/deal", response_model=DealResponse)
async def deal_new_hand(seed: Optional[int] = None):
    deck = Deck(seed=seed)
    hand = deck.deal(5)
    game_id = str(uuid.uuid4())
    
    # Save the state! 
    # deck.cards now contains the remaining 47 cards
    game_sessions[game_id] = {
        "current_hand": hand,
        "deck": deck.cards 
    }
    
    return {
        "game_id": game_id,
        "hand": hand
    }

@router.post("/draw/{game_id}")
async def draw_cards_old(game_id: str, hold_indices: list[int]):
    if game_id not in game_sessions:
        raise HTTPException(status_code=404, detail="Game not found")
    
    session = game_sessions[game_id]
    hand = session["current_hand"]
    deck = session["deck"]
    
    # Replace cards not in hold_indices
    for i in range(5):
        if i not in hold_indices:
            hand[i] = deck.pop(0) # Take from the top of the remaining deck
            
    # Now evaluate the final hand
    result = evaluate_hand([c.value for c in hand], [c.suit for c in hand])
    
    return {"final_hand": hand, "result": result}

class DrawRequest(BaseModel):
    game_id: str
    hold_indices: list[int] # e.g., [0, 1, 4] to keep the 1st, 2nd, and 5th cards

@router.post("/draw")
async def draw_cards(request: DrawRequest):
    session = game_sessions.get(request.game_id)
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    current_hand = session["current_hand"]
    remaining_deck = session["deck"]
    
    # Replace cards that were NOT held
    for i in range(5):
        if i not in request.hold_indices:
            # Pop the top card from the remaining deck
            current_hand[i] = remaining_deck.pop(0)
            
    # Final Evaluation
    ranks = [c.value for c in current_hand]
    suits = [c.suit for c in current_hand]
    final_rank = evaluate_hand(ranks, suits)
    
    # Clean up the session (Game is over)
    del game_sessions[request.game_id]
    
    return {
        "final_hand": current_hand,
        "rank": final_rank,
        "payout": PAYTABLE.get(final_rank, 0)
    }