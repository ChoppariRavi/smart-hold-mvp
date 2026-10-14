import itertools
import itertools
from typing import List, Dict, Any, Tuple

RANKS = '23456789TJQKA'
SUITS = 'SHDC'
DECK = [f"{r}{s}" for r in RANKS for s in SUITS]

PAYTABLE = {
    'ROYAL_FLUSH': 800,
    'STRAIGHT_FLUSH': 50,
    'FOUR_OF_A_KIND': 25,
    'FULL_HOUSE': 9,
    'FLUSH': 6,
    'STRAIGHT': 4,
    'THREE_OF_A_KIND': 3,
    'TWO_PAIR': 2,
    'JACKS_OR_BETTER': 1,
    'NOTHING': 0
}

RANK_VALUES = {r: i for i, r in enumerate(RANKS)}

def parse_card(card: Any) -> str:
    """Normalizes dict or object representation into 'RS' (e.g., 'TH', 'AS')."""
    if isinstance(card, dict):
        v = str(card.get("value", ""))
        s = str(card.get("suit", ""))[0].upper()
    else:
        v = str(getattr(card, "value", ""))
        s = str(getattr(card, "suit", ""))[0].upper()
    v = 'T' if v == '10' else v
    return f"{v}{s}"

def evaluate_hand_rank(hand: List[str]) -> str:
    ranks = [c[0] for c in hand]
    suits = [c[1] for c in hand]
    r_vals = sorted([RANK_VALUES[r] for r in ranks])
    
    is_flush = (len(set(suits)) == 1)
    is_straight = False
    if len(set(r_vals)) == 5:
        if r_vals[4] - r_vals[0] == 4:
            is_straight = True
        elif r_vals == [0, 1, 2, 3, 12]:  # A-2-3-4-5 wheel
            is_straight = True

    if is_flush and is_straight:
        return 'ROYAL_FLUSH' if r_vals == [8, 9, 10, 11, 12] else 'STRAIGHT_FLUSH'

    counts = {}
    for r in ranks:
        counts[r] = counts.get(r, 0) + 1
    sorted_counts = sorted(counts.values(), reverse=True)

    if sorted_counts == [4, 1]:
        return 'FOUR_OF_A_KIND'
    if sorted_counts == [3, 2]:
        return 'FULL_HOUSE'
    if is_flush:
        return 'FLUSH'
    if is_straight:
        return 'STRAIGHT'
    if sorted_counts == [3, 1, 1]:
        return 'THREE_OF_A_KIND'
    if sorted_counts == [2, 2, 1]:
        return 'TWO_PAIR'
    if sorted_counts == [2, 1, 1, 1]:
        for r, c in counts.items():
            if c == 2 and r in 'JQKA':
                return 'JACKS_OR_BETTER'
    return 'NOTHING'

def get_suggested_holds(hand: List[Any]) -> List[int]:
    """
    Computes exact EV across all 32 hold combinations against the remaining 47-card deck.
    Guarantees mathematically optimal holds for all edge cases.
    """
    normalized_hand = [parse_card(c) for c in hand]
    remaining_deck = [c for c in DECK if c not in normalized_hand]
    
    best_indices: List[int] = []
    best_ev = -1.0
    
    for k in range(6):
        for combo_indices in itertools.combinations(range(5), k):
            held = [normalized_hand[i] for i in combo_indices]
            cards_needed = 5 - len(held)
            
            if cards_needed == 0:
                ev = float(PAYTABLE[evaluate_hand_rank(held)])
            else:
                total_payout = sum(
                    PAYTABLE[evaluate_hand_rank(held + list(drawn))]
                    for drawn in itertools.combinations(remaining_deck, cards_needed)
                )
                total_draws = itertools.combinations(remaining_deck, cards_needed)
                # comb(47, cards_needed)
                from math import comb
                ev = total_payout / comb(47, cards_needed)
                
            if ev > best_ev:
                best_ev = ev
                best_indices = list(combo_indices)
                
    return sorted(best_indices)

def get_all_hold_combinations(hand):
    """
    Returns all 32 possible hold combinations for a 5-card hand.
    Each combination is a tuple of (held_cards, discarded_cards).
    """
    combinations = []
    # 0 to 5 represents how many cards you choose to hold
    for r in range(6):
        for held_indices in itertools.combinations(range(5), r):
            held = [hand[i] for i in held_indices]
            discarded = [hand[i] for i in range(5) if i not in held_indices]
            combinations.append({
                "indices": held_indices,
                "held": held,
                "discarded": discarded
            })
    return combinations