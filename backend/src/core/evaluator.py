from collections import Counter

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