import itertools

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