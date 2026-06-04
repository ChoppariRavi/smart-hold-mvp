# backend/src/core/coach.py
import os
from openai import OpenAI
from typing import List
from src.models.poker import CardModel
from config import Config

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

def generate_coach_commentary(persona: str, initial_hand, coach_suggestion, player_holds, final_hand, final_rank) -> str:
    """Fires the clean request to OpenAI using the isolated persona engine"""
    system_instruction = get_persona_prompt(persona)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": f"Initial hand: {initial_hand}. Recommended holds: {coach_suggestion}. Player holds: {player_holds}. Final hand: {final_hand}. Hand Rank: {final_rank}."}
            ],
            max_tokens=100,
            temperature=0.85
        )
        content = response.choices[0].message.content
        return content.strip() if content else "Coach is calculating..."
    except Exception as e:
        return f"Coach is calculating... (Error: {str(e)})"