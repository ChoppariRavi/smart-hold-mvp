from typing import List, Optional, Tuple
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.core.coach import generate_coach_commentary
from src.core.coach import generate_coach_critique
from src.models.poker import EvaluationRequest, EvaluationResponse, CardModel
from src.core.evaluator import evaluate_hand
from src.core.constants import PAYTABLE
from src.core.deck import Deck
import uuid
from typing import Dict
from src.core.strategy import get_all_hold_combinations
from src.core.simulator import get_suggested_holds

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


class SuggestionDetail(BaseModel):
    indices: Tuple[int, ...]
    held: List[CardModel]
    discarded: List[CardModel]
class DealResponse(BaseModel):
    game_id: str
    hand: list[CardModel]
    coach_suggestion: list[int]  # <-- Add this line
    message: str

@router.get("/deal", response_model=DealResponse)
async def deal_hand(seed: Optional[int] = None, bet: int = 1):
    import uuid
   
    deck = Deck(seed=seed)
    current_hand = deck.deal(5)
    game_id = str(uuid.uuid4())
    
    # If it's a brand new player session, start them with $1,000 chips
    if not game_id or game_id not in game_sessions:
        game_id = str(uuid.uuid4())
        balance = 1000
    else:
        balance = game_sessions[game_id]["balance"]

    # Validate bet limits
    if bet < 1 or bet > 5:
        bet = 1

    # Check if player has enough chips to play
    if balance < bet:
        return {"error": "Insufficient funds! Please reset your bankroll.", "game_id": game_id, "balance": balance}

    # Deduct the bet from the bankroll immediately
    balance -= bet
    
    # 1. Directly call your rule-based strategy helper
    # (Make sure to import get_suggested_holds at the top of the file!)
    coach_suggestion = get_suggested_holds(current_hand)

    # Save the state! 
    game_sessions[game_id] = {
        "current_hand": current_hand,
        "initial_hand": current_hand.copy(), # Store the original hand for later reference
        "deck": deck.cards,
         "coach_suggestion": coach_suggestion,
         "balance": balance,
        "current_bet": bet
    }
    
    return {
        "game_id": game_id,
        "hand": current_hand,
        "coach_suggestion": coach_suggestion, # Always a clean, precise List[int]
        "message": "Hand dealt! Use the /draw endpoint to play your hand.",
        "balance": balance,
        "current_bet": bet
    }

@router.post("/draw/{game_id}")
async def draw_cards_by_id(game_id: str, hold_indices: list[int]):
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
    persona: str = "vegas_pro"

@router.post("/draw")
async def draw_cards(request: DrawRequest):
    game_id = request.game_id
    session = game_sessions.get(request.game_id)

    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
        
    remaining_deck = session["deck"]
    session = game_sessions[game_id]
    current_hand = session["current_hand"]

    # 1. Run the optimal choice math BEFORE executing the swap
    optimal_holds = get_suggested_holds(current_hand)

    # Replace cards that were NOT held
    for i in range(5):
        if i not in request.hold_indices:
            # Pop the top card from the remaining deck
            current_hand[i] = remaining_deck.pop(0)
            
    # Final Evaluation
    ranks = [c.value for c in current_hand]
    suits = [c.suit for c in current_hand]
    final_rank = evaluate_hand(ranks, suits)
    
   # --- NEW CREDIT CALCULATION ---
    current_bet = session["current_bet"]
    payout_multiplier = PAYTABLE.get(final_rank, 0)
    total_payout = payout_multiplier * current_bet
    
    # Add winnings back to the session bankroll
    session["balance"] += total_payout

     # Clean up the session (Game is over)
    del game_sessions[request.game_id]

    # --- NEW: CALCULATE STRATEGY ACCURACY SCORE ---
    player_set = set(request.hold_indices)
    coach_set = set(optimal_holds)

    if player_set == coach_set:
        hand_accuracy = 100
    elif not player_set and not coach_set:
        hand_accuracy = 100  # Correctly discarding everything is a perfect play
    else:
        # Calculate overlap accuracy
        matches = len(player_set.intersection(coach_set))
        total_elements = len(player_set.union(coach_set))
        hand_accuracy = int((matches / total_elements) * 100) if total_elements > 0 else 0

    # Track lifetime performance inside this session
    if "accuracy_history" not in session:
        session["accuracy_history"] = []
    
    session["accuracy_history"].append(hand_accuracy)
    session_average = int(sum(session["accuracy_history"]) / len(session["accuracy_history"]))

    # Inside your @app.post("/draw") route, simply call it:
    # coach_commentary = generate_coach_commentary(
    #     persona=request.persona,
    #     initial_hand=session['initial_hand'],
    #     coach_suggestion=optimal_holds,
    #     player_holds=request.hold_indices,
    #     final_hand=current_hand,
    #     final_rank=final_rank
    # )
    coach_commentary = generate_coach_commentary(
        persona=request.persona,
        hand_accuracy=current_hand,
        payout_won=total_payout
    )
    print(f"Coach Commentary: {coach_commentary}") # Debug log to see the AI's response in the console
    # ... [Your existing drawing, ranking, and coach commentary generation code stays here] ...
    
    return {
        "final_hand": current_hand,
        "rank": final_rank,
       "payout_won": total_payout,       # Exact credits won this round
        "balance": session["balance"],     # New absolute total balance
        "coach_commentary": coach_commentary, # <-- Add this field to what you return!
        "hand_accuracy": hand_accuracy,     # Accuracy of the player's hold choices
        "session_average": session_average  # Long-term average accuracy
    }