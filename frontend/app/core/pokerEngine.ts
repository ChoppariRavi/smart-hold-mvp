export interface Card {
  value: string;
  suit: string;
}

export const RANKS = '23456789TJQKA';
export const SUITS = ['H', 'D', 'C', 'S'];

export const PAYTABLE_BASE: Record<string, number> = {
  ROYAL_FLUSH: 250,
  STRAIGHT_FLUSH: 50,
  FOUR_OF_A_KIND: 25,
  FULL_HOUSE: 9,
  FLUSH: 6,
  STRAIGHT: 4,
  THREE_OF_A_KIND: 3,
  TWO_PAIR: 2,
  JACKS_OR_BETTER: 1,
  HIGH_CARD: 0,
};

const RANK_VALUES: Record<string, number> = Object.fromEntries(
  RANKS.split('').map((r, i) => [r, i])
);

export function parseCard(card: Card | string): string {
  if (typeof card === 'string') {
    const c = card.trim().toUpperCase();
    return c.startsWith('10') ? `T${c[2]}` : c;
  }
  const v = card.value === '10' ? 'T' : card.value.toUpperCase();
  const s = card.suit[0].toUpperCase();
  return `${v}${s}`;
}

export function cardToString(card: Card): string {
  const suitSymbols: Record<string, string> = { H: '♥', D: '♦', C: '♣', S: '♠' };
  const s = suitSymbols[card.suit[0].toUpperCase()] || card.suit;
  return `${card.value}${s}`;
}

export function generateDeck(): Card[] {
  const deck: Card[] = [];
  const valMap: Record<string, string> = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8',
    '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
  };
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push({ value: valMap[r], suit: s });
    }
  }
  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function evaluateHandRank(cards: (Card | string)[]): string {
  const parsed = cards.map(parseCard);
  const ranks = parsed.map((c) => c[0]);
  const suits = parsed.map((c) => c[1]);
  const rVals = ranks.map((r) => RANK_VALUES[r]).sort((a, b) => a - b);

  const isFlush = new Set(suits).size === 1;

  let isStraight = false;
  if (new Set(rVals).size === 5) {
    if (rVals[4] - rVals[0] === 4) {
      isStraight = true;
    } else if (rVals[0] === 0 && rVals[1] === 1 && rVals[2] === 2 && rVals[3] === 3 && rVals[4] === 12) {
      isStraight = true; // A-2-3-4-5 wheel
    }
  }

  if (isFlush && isStraight) {
    return rVals[0] === 8 && rVals[4] === 12 ? 'ROYAL_FLUSH' : 'STRAIGHT_FLUSH';
  }

  const counts: Record<string, number> = {};
  ranks.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  const sortedCounts = Object.values(counts).sort((a, b) => b - a);

  if (sortedCounts[0] === 4) return 'FOUR_OF_A_KIND';
  if (sortedCounts[0] === 3 && sortedCounts[1] === 2) return 'FULL_HOUSE';
  if (isFlush) return 'FLUSH';
  if (isStraight) return 'STRAIGHT';
  if (sortedCounts[0] === 3) return 'THREE_OF_A_KIND';
  if (sortedCounts[0] === 2 && sortedCounts[1] === 2) return 'TWO_PAIR';
  if (sortedCounts[0] === 2) {
    for (const [r, cnt] of Object.entries(counts)) {
      if (cnt === 2 && 'JQKA'.includes(r)) return 'JACKS_OR_BETTER';
    }
  }
  return 'HIGH_CARD';
}

export function calculatePayout(rank: string, bet: number): number {
  if (rank === 'ROYAL_FLUSH' && bet === 5) return 4000;
  return (PAYTABLE_BASE[rank] || 0) * bet;
}

// 32-Combination Optimal Hold Solver
export function getOptimalHolds(hand: Card[]): { holds: number[]; maxEv: number } {
  const parsedHand = hand.map(parseCard);
  const deck: string[] = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      const c = `${r}${s}`;
      if (!parsedHand.includes(c)) deck.push(c);
    }
  }

  let maxEv = -1;
  let bestHolds: number[] = [];

  for (let mask = 0; mask < 32; mask++) {
    const heldIndices: number[] = [];
    for (let bit = 0; bit < 5; bit++) {
      if ((mask & (1 << bit)) !== 0) heldIndices.push(bit);
    }

    const heldCards = heldIndices.map((i) => parsedHand[i]);
    const needed = 5 - heldCards.length;

    let ev = 0;
    if (needed === 0) {
      ev = PAYTABLE_BASE[evaluateHandRank(heldCards)];
    } else {
      let totalPay = 0;
      let totalDraws = 0;

      const combine = (start: number, chosen: string[]) => {
        if (chosen.length === needed) {
          totalPay += PAYTABLE_BASE[evaluateHandRank([...heldCards, ...chosen])];
          totalDraws++;
          return;
        }
        for (let i = start; i < deck.length; i++) {
          chosen.push(deck[i]);
          combine(i + 1, chosen);
          chosen.pop();
        }
      };

      combine(0, []);
      ev = totalPay / totalDraws;
    }

    if (ev > maxEv) {
      maxEv = ev;
      bestHolds = heldIndices;
    }
  }

  return { holds: bestHolds, maxEv };
}

// Deterministic Persona Coach (Runs in < 1ms)
const COACH_TEMPLATES: Record<string, Record<string, string[]>> = {
  vegas_pro: {
    perfect_win: [
      "Textbook play holding {held}. You played pure math and caught the draw (+{payout} credits). Don't let it go to your head.",
      "Flawless 100% GTO hold with {held}. Cash the chips before the pit boss calls a cooler.",
    ],
    perfect_loss: [
      "100% textbook hold on {held}. Variance froze you out this round. Don't tilt—the math works over 10,000 hands.",
      "Played like a seasoned Strip grinder. Zero mistakes holding {held}; deal the next one.",
    ],
    blunder: [
      "What was that? You held {held} when the math screamed {optimal}! You're handing chips to the cage.",
      "Holding {held} is a fast-track ticket to the dish room. The book said {optimal}. Lock in!",
    ],
    mediocre: [
      "Sloppy hold. You kept {held}, but the sharp play was {optimal}. You're leaking EV on the felt.",
      "Partial credit for {held}, but you missed {optimal}. Clean up those holds.",
    ],
  },
  math_prof: {
    perfect_win: [
      "Optimal decision verified (100% GTO). Holding {held} maximized EV, yielding +{payout} credits.",
      "Flawless combinatoric selection with {held}. You captured the theoretical distribution ceiling.",
    ],
    perfect_loss: [
      "GTO accuracy was 100%. While the payout was 0, holding {held} maximized expected return. Trust the law of large numbers.",
      "Statistically dominant hold on {held} with an unfavorable sample outcome. Do not regress to superstition.",
    ],
    blunder: [
      "Severe mathematical discrepancy ({acc}% accuracy). Holding {held} vs optimal {optimal} drastically deteriorates expected yield.",
      "Negative EV leakage: discarding {optimal} for {held} transfers equity directly to the house.",
    ],
    mediocre: [
      "Sub-optimal resolution ({acc}% accuracy). Retaining {held} diluted equity relative to {optimal}.",
    ],
  },
  hype_man: {
    perfect_win: [
      "LET'S GOOO! 100% big brain hold with {held} and WE CASHED +{payout} CREDITS! Absolute masterclass!",
      "W PLAY RIGHT THERE! Locked in {held} like a sniper and cashed out! Keep cooking!",
    ],
    perfect_loss: [
      "Deck did us dirty, but holding {held} was 100% ELITE! Shrug it off, we run that back all day!",
      "Zero credits on that draw, but 100% GTO accuracy! Keep that energy!",
    ],
    blunder: [
      "NOOO! You kept {held}?! The solver was begging for {optimal}! Total misclick moment, reset and lock in!",
      "Down bad on that hold! You tossed {optimal} straight out the window! Check the GTO hint next time!",
    ],
    mediocre: [
      "Halfway there! Good instinct holding {held}, but the secret sauce was {optimal}!",
    ],
  },
};

export function getCoachCommentary(
  persona: string,
  acc: number,
  payout: number,
  held: Card[],
  optimal: Card[]
): string {
  const pKey = COACH_TEMPLATES[persona] ? persona : 'vegas_pro';
  const category = acc >= 95 ? (payout > 0 ? 'perfect_win' : 'perfect_loss') : acc <= 35 ? 'blunder' : 'mediocre';
  const templates = COACH_TEMPLATES[pKey][category];
  const template = templates[Math.floor(Math.random() * templates.length)];

  const heldStr = held.length ? `[${held.map(cardToString).join(', ')}]` : 'Nothing (Discard All)';
  const optStr = optimal.length ? `[${optimal.map(cardToString).join(', ')}]` : 'Nothing (Discard All)';

  return template
    .replace('{held}', heldStr)
    .replace('{optimal}', optStr)
    .replace('{payout}', payout.toString())
    .replace('{acc}', acc.toString());
}