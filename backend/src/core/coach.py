# backend/src/core/coach.py
import os
from openai import OpenAI
from typing import List
from src.models.poker import CardModel
from config import Config

# backend/coach.py
import random

# Initialize the OpenAI client (grabs OPENAI_API_KEY from environment)
client = OpenAI(api_key=Config.OPENAI_API_KEY)

def generate_coach_critique(
    initial_hand: List[CardModel], 
    optimal_holds: List[int], 
    player_holds: List[int], 
    final_hand: List[CardModel], 
    hand_rank: str
) -> str:
    """
    Compares the player's choices against the optimal computer choice
    and returns a tailored, witty, or instructive strategy critique.
    """
    # 1. Human-readable card formats for the LLM
    initial_str = ", ".join([f"{c.value}{c.suit}" for c in initial_hand])
    final_str = ", ".join([f"{c.value}{c.suit}" for c in final_hand])
    
    optimal_cards = ", ".join([f"{initial_hand[i].value}{initial_hand[i].suit}" for i in optimal_holds]) if optimal_holds else "Discard All"
    player_cards = ", ".join([f"{initial_hand[i].value}{initial_hand[i].suit}" for i in player_holds]) if player_holds else "Discard All"

    # 2. Determine the accuracy of the player's move
    followed_strategy = set(optimal_holds) == set(player_holds)
    
    # 3. Construct the prompt instruction profile
    system_instruction = (
        "You are an expert, slightly cynical, but highly encouraging Las Vegas Video Poker Coach. "
        "Your job is to critique the player's choice in 'Jacks or Better' video poker. "
        "Keep your responses sharp, punchy, and limited to 2-3 sentences. Use casino terminology."
    )
    
    user_message = f"""
    Initial Hand Dealt: [{initial_str}]
    Mathematically Optimal Cards to Hold (Indices): {optimal_holds} -> [{optimal_cards}]
    What the Player Actually Held (Indices): {player_holds} -> [{player_cards}]
    Did the player follow optimal strategy? {followed_strategy}
    
    The resulting drawn Final Hand: [{final_str}]
    Final Evaluated Payout Hand Rank: {hand_rank}
    
    Provide a quick, engaging performance critique of their holding decision.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini", # Cost-effective, lightning fast for structured feedback
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_message}
            ],
            max_tokens=100,
            temperature=0.7
        )
        content = response.choices[0].message.content
        return content.strip() if content else "Coach is thinking..."
    except Exception as e:
        return f"Coach is reading the layout... (AI Error: {str(e)})"
    

def get_persona_prompt(persona: str) -> str:
    prompts = {
        "vegas_pro": (
            "You are a sarcastic, cigar-chomping Vegas video poker veteran coaching a player. "
            "Use heavy casino slang (e.g., 'grinder', 'whale', 'variance', 'bad beat', 'juiced'). "
            "If the player made a mathematically incorrect hold decision, ruthlessly mock their choice with biting wit. "
            "If they made the perfect play, give them a backhanded compliment or act unimpressed. Keep responses under 3 sentences."
        ),
        "math_prof": (
            "You are an elite academic Mathematics Professor specializing in combinatorics, game theory, and probability. "
            "Analyze the player's move strictly through Expected Value (EV), variance isolation, and optimal strategy percentages. "
            "Do not use casual slang; be highly analytical, precise, and educational. Keep responses under 3 sentences."
        ),
        "hype_man": (
            "You are an over-the-top, high-energy Twitch streamer and hype-man coaching the player. "
            "Use modern internet and gaming slang (e.g., 'LET'S GOOO', 'W play', 'huge brain', 'gg', 'clutch'). "
            "Be incredibly enthusiastic. Even if they make a bad play, spin it positively and keep their energy at a maximum. Keep responses under 3 sentences."
        )
    }
    return prompts.get(persona, prompts["vegas_pro"])


COMMENTARY_TEMPLATES = {
    "vegas_pro": {
        "perfect_win": [
            "Look at that—you actually played the math and got paid. Don't let it go to your head, kid.",
            "Textbook play and the variance paid off. Take the chips before the house notices.",
            "Solid hold. Even a blind squirrel finds a nut once in a while on the Strip."
        ],
        "perfect_loss": [
            "Textbook hold, but the deck froze up on you. That's Vegas for you—variance is a cruel beast.",
            "You made the 100% correct play and got a nothing burger. Don't tilt, the math was right.",
            "Played it like a seasoned grinder, just took a bad beat on the draw. Deal another."
        ],
        "blunder": [
            "What was that hold? You tossed the winning combination straight into the muck!",
            "Holding those cards is a great way to end up washing dishes in the casino kitchen.",
            "Total punt. You completely ignored the optimal hold and the dealer ate your bet."
        ],
        "mediocre": [
            "You got part of the play right, but you left EV on the felt.",
            "Sloppy hold. You kept the right piece but dragged garbage along with it."
        ]
    },
    "math_prof": {
        "perfect_win": [
            "Optimal decision verified (100% GTO). Positive expected value realized on the draw.",
            "Holding the mathematically dominant subset maximized your return frequency here.",
            "Flawless combinatoric choice resulting in positive variance. Excellent execution."
        ],
        "perfect_loss": [
            "GTO accuracy was 100%. While the payout was 0, your decision maximized long-term EV.",
            "A statistically optimal hold with an unfortunate sample outcome. Long-run regression favors this play.",
            "Expected value was maximized. Short-term variance simply did not materialize in a payout."
        ],
        "blunder": [
            "Sub-optimal play (0% GTO). That hold subset drastically degrades long-term return.",
            "Mathematical error: you discarded cards with significant combinatoric value.",
            "Major EV leakage detected. That decision carries a severely negative expectation over standard distributions."
        ],
        "mediocre": [
            "Partially optimal, but retaining extraneous cards diluted your hand's total expectation.",
            "Incomplete subset chosen. You captured some equity while sacrificing optimal frequency."
        ]
    },
    "hype_man": {
        "perfect_win": [
            "LET'S GOOO! 100% big brain hold and we cashed out! Pure skill!",
            "W play right there! Textbook moves and the deck delivered! We're up!",
            "HUGE BRAIN PLAY! That’s how you run the table! Keep that streak alive!"
        ],
        "perfect_loss": [
            "Unlucky draw, but that hold was clean! 100% accuracy, we bounce back next hand!",
            "Deck did you dirty, but the play was elite! Shrug it off, run it back!",
            "Tough break on the cards, but the decision was top-tier! The next one is ours!"
        ],
        "blunder": [
            "Oof, absolute misclick moment! Threw away the good cards, but we adapt and reset!",
            "Not the play, my friend! We gave away free equity there, but lock in for the next deal!",
            "Down bad on that hold! Shake it off, check the AI pick next time, and let's get it back!"
        ],
        "mediocre": [
            "Halfway there! Good instinct on the main card, just gotta trim the extra dead weight!",
            "Not bad, but we can make it cleaner! Stick to the prime cards next round!"
        ]
    }
}

def generate_coach_commentary(persona: str, hand_accuracy: int, payout_won: int) -> str:
    """Generates instant, deterministic commentary with zero API costs."""
    role_templates = COMMENTARY_TEMPLATES.get(persona, COMMENTARY_TEMPLATES["vegas_pro"])
    
    if hand_accuracy == 100:
        category = "perfect_win" if payout_won > 0 else "perfect_loss"
    elif hand_accuracy == 0:
        category = "blunder"
    else:
        category = "mediocre"
        
    return random.choice(role_templates[category])