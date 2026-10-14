# backend/tests/test_evaluator.py
import unittest
from src.core.evaluator import evaluate_hand, calculate_payout

# -------------------------------------------------------------
# Hand Evaluation Unit Tests: Royal Flush down to High Card
# -------------------------------------------------------------

class TestHandEvaluations(unittest.TestCase):
    def test_hand_evaluations(self):
        cases = [
    # 1. Royal Flush
    (["AS", "KS", "QS", "JS", "TS"], "ROYAL_FLUSH"),
    (["TH", "JH", "QH", "KH", "AH"], "ROYAL_FLUSH"),

    # 2. Straight Flush (Standard and Wheel A-2-3-4-5)
    (["9H", "8H", "7H", "6H", "5H"], "STRAIGHT_FLUSH"),
    (["5D", "4D", "3D", "2D", "AD"], "STRAIGHT_FLUSH"),

    # 3. Four of a Kind
    (["7C", "7D", "7H", "7S", "2K"], "FOUR_OF_A_KIND"),
    (["AC", "AD", "AH", "AS", "9S"], "FOUR_OF_A_KIND"),

    # 4. Full House
    (["KC", "KD", "KH", "4S", "4C"], "FULL_HOUSE"),
    (["2S", "2H", "3D", "3C", "3S"], "FULL_HOUSE"),

    # 5. Flush
    (["2D", "6D", "8D", "JD", "AD"], "FLUSH"),
    (["3C", "5C", "9C", "TC", "KC"], "FLUSH"),

    # 6. Straight (Standard and Ace-low Wheel)
    (["9S", "8D", "7C", "6H", "5S"], "STRAIGHT"),
    (["5S", "4D", "3C", "2H", "AS"], "STRAIGHT"),
    (["TC", "JD", "QC", "KS", "AH"], "STRAIGHT"),

    # 7. Three of a Kind
    (["QC", "QD", "QS", "3H", "8D"], "THREE_OF_A_KIND"),
    (["2C", "2D", "2H", "9S", "KD"], "THREE_OF_A_KIND"),

    # 8. Two Pair
    (["TC", "TD", "4S", "4H", "AH"], "TWO_PAIR"),
    (["AA", "AC", "2D", "2H", "7S"], "TWO_PAIR"),

    # 9. Jacks or Better (Qualifying High Pairs: J, Q, K, A)
    (["JC", "JD", "2S", "5H", "9C"], "JACKS_OR_BETTER"),
    (["QC", "QD", "4S", "7H", "3C"], "JACKS_OR_BETTER"),
    (["KC", "KD", "2S", "5H", "9C"], "JACKS_OR_BETTER"),
    (["AC", "AD", "2S", "5H", "9C"], "JACKS_OR_BETTER"),

    # 10. Non-Qualifying Low Pairs (Treated as High Card in Jacks or Better)
    (["TC", "TD", "2S", "5H", "9C"], "HIGH_CARD"),
    (["2S", "2C", "4D", "6H", "8S"], "HIGH_CARD"),
    (["9H", "9D", "AS", "KC", "QD"], "HIGH_CARD"),

    # 11. High Card (Nothing)
    (["AS", "KD", "8C", "4H", "2S"], "HIGH_CARD"),
    (["7D", "5C", "4S", "3H", "2D"], "HIGH_CARD")
        ]
        for hand, expected_rank in cases:
            with self.subTest(hand=hand):
                self.assertEqual(evaluate_hand(hand, [card[1] for card in hand]), expected_rank)


    def test_hand_evaluation_dict_inputs(self):
        """Validates that object-based/dict-based card structures parse identically."""
        dict_hand = [
            {"value": "A", "suit": "S"},
            {"value": "K", "suit": "S"},
            {"value": "Q", "suit": "S"},
            {"value": "J", "suit": "S"},
            {"value": "10", "suit": "S"}
        ]
        self.assertEqual(evaluate_hand(dict_hand, [card["suit"] for card in dict_hand]), "ROYAL_FLUSH")


# -------------------------------------------------------------
# Payout Multiplier Unit Tests: 1x to 5x Bets
# -------------------------------------------------------------

class TestPayoutMultipliers(unittest.TestCase):
    def test_payout_multipliers(self):
        cases = [
    # Royal Flush (Special 4,000 credit bonus at 5x max bet)
    ("ROYAL_FLUSH", 1, 250),
    ("ROYAL_FLUSH", 2, 500),
    ("ROYAL_FLUSH", 3, 750),
    ("ROYAL_FLUSH", 4, 1000),
    ("ROYAL_FLUSH", 5, 4000),

    # Straight Flush (50x base)
    ("STRAIGHT_FLUSH", 1, 50),
    ("STRAIGHT_FLUSH", 2, 100),
    ("STRAIGHT_FLUSH", 3, 150),
    ("STRAIGHT_FLUSH", 4, 200),
    ("STRAIGHT_FLUSH", 5, 250),

    # Four of a Kind (25x base)
    ("FOUR_OF_A_KIND", 1, 25),
    ("FOUR_OF_A_KIND", 5, 125),

    # Full House (9x base - standard 9/6 schedule)
    ("FULL_HOUSE", 1, 9),
    ("FULL_HOUSE", 2, 18),
    ("FULL_HOUSE", 3, 27),
    ("FULL_HOUSE", 4, 36),
    ("FULL_HOUSE", 5, 45),

    # Flush (6x base - standard 9/6 schedule)
    ("FLUSH", 1, 6),
    ("FLUSH", 2, 12),
    ("FLUSH", 3, 18),
    ("FLUSH", 4, 24),
    ("FLUSH", 5, 30),

    # Straight (4x base)
    ("STRAIGHT", 1, 4),
    ("STRAIGHT", 5, 20),

    # Three of a Kind (3x base)
    ("THREE_OF_A_KIND", 1, 3),
    ("THREE_OF_A_KIND", 5, 15),

    # Two Pair (2x base)
    ("TWO_PAIR", 1, 2),
    ("TWO_PAIR", 5, 10),

    # Jacks or Better (1x base)
    ("JACKS_OR_BETTER", 1, 1),
    ("JACKS_OR_BETTER", 2, 2),
    ("JACKS_OR_BETTER", 3, 3),
    ("JACKS_OR_BETTER", 4, 4),
    ("JACKS_OR_BETTER", 5, 5),

    # Non-qualifying outcomes
    ("HIGH_CARD", 1, 0),
    ("HIGH_CARD", 5, 0),
    ("NOTHING", 1, 0),
    ("NOTHING", 5, 0)
        ]
        for rank, bet, expected_payout in cases:
            with self.subTest(rank=rank, bet=bet):
                self.assertEqual(calculate_payout(rank, bet), expected_payout)


    def test_invalid_bets(self):
        with self.assertRaises(ValueError):
            calculate_payout("FULL_HOUSE", 0)
        with self.assertRaises(ValueError):
            calculate_payout("FULL_HOUSE", 6)