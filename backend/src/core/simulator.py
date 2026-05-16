import random
from src.core.evaluator import evaluate_hand
# src/core/strategy.py
from typing import List
from collections import Counter
from src.models.poker import CardModel


def calculate_approx_ev(held_cards, remaining_deck, simulations=1000):
    total_payout = 0
    cards_to_draw = 5 - len(held_cards)
    
    if cards_to_draw == 0:
        return PAYTABLE[evaluate_hand(held_cards)]

    for _ in range(simulations):
        draw = random.sample(remaining_deck, cards_to_draw)
        final_hand = held_cards + draw
        rank = evaluate_hand(final_hand)
        total_payout += PAYTABLE[rank]
        
    return total_payout / simulations

def get_suggested_holds(hand: List[CardModel]) -> List[int]:
    """
    Analyzes a 5-card hand and returns the indices of the cards to HOLD
    based on a basic Jacks or Better strategy.
    """
    # Map ranks to numbers for easy comparison
    rank_map = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 
        '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    }
    
    numeric_ranks = [rank_map[c.value] for c in hand]
    suits = [c.suit for c in hand]
    counts = Counter(numeric_ranks)
    
    # --- 1. Check for Pat Hands / Big Draws ---
    # If we already have Three of a Kind or better, hold those cards!
    # For a Pair, let's see if it's a high pair or low pair
    
    # Find pairs, trips, quads
    held_indices = []
    
    # High Cards (J, Q, K, A)
    high_card_indices = [i for i, r in enumerate(numeric_ranks) if r >= 11]
    
    # Check for Pairs
    pairs = [rank for rank, count in counts.items() if count == 2]
    trips = [rank for rank, count in counts.items() if count == 3]
    quads = [rank for rank, count in counts.items() if count == 4]
    
    if quads:
        rank_to_hold = quads[0]
        return [i for i, c in enumerate(numeric_ranks) if c == rank_to_hold]
        
    if trips:
        rank_to_hold = trips[0]
        return [i for i, c in enumerate(numeric_ranks) if c == rank_to_hold]
        
    if len(pairs) == 2:
        # Two Pair - hold both pairs
        return [i for i, c in enumerate(numeric_ranks) if c in pairs]
        
    if len(pairs) == 1:
        # One Pair
        pair_rank = pairs[0]
        # Always hold a high pair (Jacks or Better) or a low pair (to try for trips)
        return [i for i, c in enumerate(numeric_ranks) if c == pair_rank]

    # --- 2. No Pairs? Look for Unsuited High Cards ---
    # If we have unsuited high cards (like the hands you tested earlier), hold them!
    if len(high_card_indices) >= 2:
        # If there are multiple high cards, hold the ones that are closest or suited if possible.
        # For simplicity, let's hold up to 3 high cards, preferring suited if they exist.
        return high_card_indices[:3]
        
    if len(high_card_indices) == 1:
        return high_card_indices

    # --- 3. Garbage Hand ---
    # Discard everything to redraw 5 fresh cards
    return []