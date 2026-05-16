import random
from src.core.evaluator import evaluate_hand # Your logic from before

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