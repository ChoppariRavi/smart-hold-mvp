from collections import Counter
# backend/src/core/evaluator.py
from typing import List, Dict, Any, Union

RANKS = '23456789TJQKA'
RANK_VALUES = {r: i for i, r in enumerate(RANKS)}

BASE_PAYTABLE_PER_COIN = {
    'ROYAL_FLUSH': 250,
    'STRAIGHT_FLUSH': 50,
    'FOUR_OF_A_KIND': 25,
    'FULL_HOUSE': 9,
    'FLUSH': 6,
    'STRAIGHT': 4,
    'THREE_OF_A_KIND': 3,
    'TWO_PAIR': 2,
    'JACKS_OR_BETTER': 1,
    'HIGH_CARD': 0,
    'NOTHING': 0
}

def parse_card(card: Union[Dict[str, Any], str, Any]) -> str:
    """Normalizes any card representation to a standard 2-char string, e.g. 'TH', 'AS'."""
    if isinstance(card, str):
        c = card.strip().upper()
        if c.startswith('10'):
            return f"T{c[2:]}"
        return c
    if isinstance(card, dict):
        v = str(card.get("value", "")).upper()
        s = str(card.get("suit", ""))[0].upper()
    else:
        v = str(getattr(card, "value", "")).upper()
        s = str(getattr(card, "suit", ""))[0].upper()
    v = 'T' if v in ['10', 'T'] else v
    return f"{v}{s}"

# def evaluate_hand(hand: List[Any]) -> str:
#     """Evaluates a 5-card hand and returns its qualifying 9/6 Jacks or Better rank."""
#     parsed_hand = [parse_card(c) for c in hand]
#     if len(parsed_hand) != 5:
#         raise ValueError(f"Hand must contain exactly 5 cards, got {len(parsed_hand)}")

#     ranks = [c[0] for c in parsed_hand]
#     suits = [c[1] for c in parsed_hand]
#     r_vals = sorted([RANK_VALUES[r] for r in ranks])

#     is_flush = (len(set(suits)) == 1)
    
#     is_straight = False
#     if len(set(r_vals)) == 5:
#         if r_vals[4] - r_vals[0] == 4:
#             is_straight = True
#         elif r_vals == [0, 1, 2, 3, 12]:  # A-2-3-4-5 wheel straight
#             is_straight = True

#     if is_flush and is_straight:
#         return 'ROYAL_FLUSH' if r_vals == [8, 9, 10, 11, 12] else 'STRAIGHT_FLUSH'

#     counts: Dict[str, int] = {}
#     for r in ranks:
#         counts[r] = counts.get(r, 0) + 1
#     sorted_counts = sorted(counts.values(), reverse=True)

#     if sorted_counts == [4, 1]:
#         return 'FOUR_OF_A_KIND'
#     if sorted_counts == [3, 2]:
#         return 'FULL_HOUSE'
#     if is_flush:
#         return 'FLUSH'
#     if is_straight:
#         return 'STRAIGHT'
#     if sorted_counts == [3, 1, 1]:
#         return 'THREE_OF_A_KIND'
#     if sorted_counts == [2, 2, 1]:
#         return 'TWO_PAIR'
#     if sorted_counts == [2, 1, 1, 1]:
#         for r, c in counts.items():
#             if c == 2 and r in 'JQKA':
#                 return 'JACKS_OR_BETTER'
#         return 'HIGH_CARD'

#     return 'HIGH_CARD'

def calculate_payout(rank: str, bet: int = 1) -> int:
    """
    Computes payout for 1x to 5x bets.
    Standard 9/6 rule: 5x Royal Flush awards a 4,000 credit bonus (800 per coin).
    """
    if bet < 1 or bet > 5:
        raise ValueError(f"Bet multiplier must be between 1 and 5, received {bet}")

    if rank == 'ROYAL_FLUSH' and bet == 5:
        return 4000

    base_multiplier = BASE_PAYTABLE_PER_COIN.get(rank, 0)
    return base_multiplier * bet

def evaluate_hand(hand_ranks, hand_suits):
    """
    hand_ranks: List of strings ['2', '10', 'J', 'A'] or ints [2, 10, 11, 14]
    hand_suits: List of strings ['H', 'D', 'C', 'S']
    """
    # 1. Map string ranks to integers for math operations
    rank_map = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 
        '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    }
    
    # Convert to ints if they are strings, otherwise keep as is
    numeric_ranks = sorted([
        rank_map[r] if isinstance(r, str) else r 
        for r in hand_ranks
    ])
    
    # 2. Basic Stats
    counts_map = Counter(numeric_ranks)
    counts = sorted(counts_map.values(), reverse=True)
    is_flush = len(set(hand_suits)) == 1
    
    # Straight logic: 5 unique cards and range of 4 (e.g., 5,6,7,8,9)
    is_straight = len(set(numeric_ranks)) == 5 and (numeric_ranks[-1] - numeric_ranks[0] == 4)

    # 3. Special Case: Low Ace Straight (A, 2, 3, 4, 5)
    if set(numeric_ranks) == {14, 2, 3, 4, 5}:
        is_straight = True

    # 4. Hand Ranking Logic (Order matters!)
    if is_flush and is_straight and numeric_ranks[0] == 10: 
        return "ROYAL_FLUSH"
    
    if is_flush and is_straight: 
        return "STRAIGHT_FLUSH"
    
    if counts == [4, 1]: 
        return "FOUR_OF_A_KIND"
    
    if counts == [3, 2]: 
        return "FULL_HOUSE"
    
    if is_flush: 
        return "FLUSH"
    
    if is_straight: 
        return "STRAIGHT"
    
    if counts == [3, 1, 1]: 
        return "THREE_OF_A_KIND"
    
    if counts == [2, 2, 1]: 
        return "TWO_PAIR"
    
    # Jacks or Better: One pair where the rank is 11 (J) or higher
    if counts == [2, 1, 1, 1]:
        pair_rank = [rank for rank, count in counts_map.items() if count == 2][0]
        if pair_rank >= 11:
            return "JACKS_OR_BETTER"
    
    return "NOTHING"