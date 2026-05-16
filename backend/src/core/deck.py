import random
from typing import List
from typing import Optional
from src.models.poker import CardModel

class Deck:
    SUITS = ["H", "D", "C", "S"]
    VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]

    def __init__(self, seed: Optional[int] = None):
        self.cards: List[CardModel] = [
            CardModel(suit=s, value=v) for s in self.SUITS for v in self.VALUES
        ]
        self.seed = seed
        self.shuffle()

    def shuffle(self):
        # If a seed is provided, the shuffle will always be identical
        if self.seed is not None:
            random.seed(self.seed)

        """
        In-place Fisher-Yates shuffle.
        """
        n = len(self.cards)
        for i in range(n - 1, 0, -1):
            j = random.randint(0, i)
            self.cards[i], self.cards[j] = self.cards[j], self.cards[i]

        # Optional: Reset the global random seed if you don't want 
        # it affecting other parts of your app later.
        if self.seed is not None:
            random.seed()

    def deal(self, count: int) -> List[CardModel]:
        """
        Removes and returns 'count' cards from the top of the deck.
        """
        if count > len(self.cards):
            raise ValueError("Not enough cards left in the deck.")
        
        dealt_cards = self.cards[:count]
        self.cards = self.cards[count:]
        return dealt_cards