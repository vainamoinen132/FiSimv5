// characters.js

/**************************************
 * characters.js
 *
 * Unified version combining all character definitions,
 * injury tracking, relationship logic, and fighting styles.
 **************************************/

// ─── Relationship Tier Definitions ───────────────────────────
export const REL_THRESHOLDS = {
  LOVER:       { min: 85, label: "Lover"       },
  BEST_FRIEND: { min: 70, label: "Best Friend" },
  FRIEND:      { min: 50, label: "Friend"      },
  NEUTRAL:     { min: 30, label: "Neutral"     },
  ENEMY:       { min:   0, label: "Enemy"       }
};

/**
 * Given a numeric relationship value [0–100], return its tier label.
 */
export function getTierLabel(val) {
  for (let threshold of [
    REL_THRESHOLDS.LOVER,
    REL_THRESHOLDS.BEST_FRIEND,
    REL_THRESHOLDS.FRIEND,
    REL_THRESHOLDS.NEUTRAL,
    REL_THRESHOLDS.ENEMY
  ]) {
    if (val >= threshold.min) return threshold.label;
  }
  return "Unknown";
}

// ─── Characters Array ────────────────────────────────────────
export const characters = [
  {
    "name": "Tulin",
    "age": 34,
    "height": 170,
    "weight": 56,
    "sexual_orientation": "bisexual",
    "background": "Yoga and tennis player, fit and attractive",
    "fighting_attributes": {
      "strength": 70,
      "agility": 75,
      "stamina": 65,
      "technique": 70,
      "reflexes": 75,
      "punching": 70,
      "kicking": 70,
      "endurance": 75
    },
    "physical_attributes": {
      "attractiveness": 80,
      "seduction": 75,
      "flirtiness": 70
    },
    "mental_attributes": {
      "dominance": 50,
      "loyalty": 60,
      "stability": 55,
      "craziness": 60,
      "jealousy": 30,
      "monogamy": 40,
      "cheating": 60
    },
    "championships": 0,
    "traits": ["Strategist"],
    // injury tracking
    "injuryLevel": null,    // "light", "moderate", "severe" or null
    "injuryDuration": 0     // how many days remaining
  },
  {
    "name": "Sevgi",
    "age": 29,
    "height": 165,
    "weight": 60,
    "sexual_orientation": "lesbian",
    "background": "Semi-pro boxer, aggressive and dominant",
    "fighting_attributes": {
      "strength": 80,
      "agility": 65,
      "stamina": 70,
      "technique": 70,
      "reflexes": 65,
      "punching": 85,
      "kicking": 70,
      "endurance": 85
    },
    "physical_attributes": {
      "attractiveness": 60,
      "seduction": 65,
      "flirtiness": 80
    },
    "mental_attributes": {
      "dominance": 85,
      "loyalty": 80,
      "stability": 45,
      "craziness": 80,
      "jealousy": 90,
      "monogamy": 80,
      "cheating": 30
    },
    "championships": 0,
    "traits": ["Dominant"],
    "injuryLevel": null,
    "injuryDuration": 0
  },
  {
    "name": "Selma",
    "age": 31,
    "height": 170,
    "weight": 62,
    "sexual_orientation": "lesbian",
    "background": "Fitness instructor and sports coach, muscular and dominant",
    "fighting_attributes": {
      "strength": 90,
      "agility": 70,
      "stamina": 80,
      "technique": 70,
      "reflexes": 60,
      "punching": 75,
      "kicking": 75,
      "endurance": 85
    },
    "physical_attributes": {
      "attractiveness": 70,
      "seduction": 80,
      "flirtiness": 80
    },
    "mental_attributes": {
      "dominance": 85,
      "loyalty": 75,
      "stability": 70,
      "craziness": 30,
      "jealousy": 40,
      "monogamy": 70,
      "cheating": 30
    },
    "championships": 0,
    "traits": ["High Pain Tolerance"],
    "injuryLevel": null,
    "injuryDuration": 0
  },
  {
    "name": "Seher",
    "age": 34,
    "height": 160,
    "weight": 46,
    "sexual_orientation": "bisexual",
    "background": "Swimmer, strong and competitive",
    "fighting_attributes": {
      "strength": 70,
      "agility": 75,
      "stamina": 75,
      "technique": 70,
      "reflexes": 70,
      "punching": 60,
      "kicking": 65,
      "endurance": 85
    },
    "physical_attributes": {
      "attractiveness": 65,
      "seduction": 70,
      "flirtiness": 65
    },
    "mental_attributes": {
      "dominance": 50,
      "loyalty": 50,
      "stability": 40,
      "craziness": 75,
      "jealousy": 30,
      "monogamy": 40,
      "cheating": 60
    },
    "championships": 0,
    "traits": ["Mindful Defender"],
    "injuryLevel": null,
    "injuryDuration": 0
  },
  {
    "name": "Merve",
    "age": 28,
    "height": 174,
    "weight": 62,
    "sexual_orientation": "lesbian",
    "background": "Former bodybuilder, quite dominant, athletic but not overly muscular",
    "fighting_attributes": {
      "strength": 75,
      "agility": 65,
      "stamina": 70,
      "technique": 75,
      "reflexes": 70,
      "punching": 70,
      "kicking": 70,
      "endurance": 75
    },
    "physical_attributes": {
      "attractiveness": 60,
      "seduction": 80,
      "flirtiness": 80
    },
    "mental_attributes": {
      "dominance": 80,
      "loyalty": 35,
      "stability": 70,
      "craziness": 70,
      "jealousy": 60,
      "monogamy": 30,
      "cheating": 85
    },
    "championships": 0,
    "traits": ["Showgirl"],
    "injuryLevel": null,
    "injuryDuration": 0
  },
  {
    "name": "Mehtap",
    "age": 39,
    "height": 179,
    "weight": 57,
    "sexual_orientation": "bisexual",
    "background": "Amateur swimmer and walker, not very strong, thin legs",
    "fighting_attributes": {
      "strength": 50,
      "agility": 65,
      "stamina": 75,
      "technique": 55,
      "reflexes": 65,
      "punching": 55,
      "kicking": 55,
      "endurance": 80
    },
    "physical_attributes": {
      "attractiveness": 60,
      "seduction": 40,
      "flirtiness": 45
    },
    "mental_attributes": {
      "dominance": 30,
      "loyalty": 55,
      "stability": 80,
      "craziness": 35,
      "jealousy": 30,
      "monogamy": 40,
      "cheating": 20
    },
    "championships": 0,
    "traits": ["Submissive"],
    "injuryLevel": null,
    "injuryDuration": 0
  },
  {
    "name": "Gulsah",
    "age": 39,
    "height": 170,
    "weight": 60,
    "sexual_orientation": "heterosexual",
    "background": "Pilates trainer, excellent stamina",
    "fighting_attributes": {
      "strength": 80,
      "agility": 85,
      "stamina": 90,
      "technique": 65,
      "reflexes": 75,
      "punching": 55,
      "kicking": 65,
      "endurance": 85
    },
    "physical_attributes": {
      "attractiveness": 70,
      "seduction": 60,
      "flirtiness": 65
    },
    "mental_attributes": {
      "dominance": 55,
      "loyalty": 65,
      "stability": 70,
      "craziness": 60,
      "jealousy": 60,
      "monogamy": 60,
      "cheating": 50
    },
    "championships": 0,
    "traits": ["Iron Will"],
    "injuryLevel": null,
    "injuryDuration": 0
  },
  {
    "name": "Esra",
    "age": 34,
    "height": 176,
    "weight": 60,
    "sexual_orientation": "bisexual",
    "background": "Volleyball player, practices yoga",
    "fighting_attributes": {
      "strength": 75,
      "agility": 70,
      "stamina": 70,
      "technique": 75,
      "reflexes": 70,
      "punching": 65,
      "kicking": 70,
      "endurance": 75
    },
    "physical_attributes": {
      "attractiveness": 80,
      "seduction": 70,
      "flirtiness": 75
    },
    "mental_attributes": {
      "dominance": 70,
      "loyalty": 50,
      "stability": 55,
      "craziness": 65,
      "jealousy": 70,
      "monogamy": 50,
      "cheating": 60
    },
    "championships": 0,
    "traits": ["Swift Panther"],
    "injuryLevel": null,
    "injuryDuration": 0
  },
  {
    "name": "Ayca",
    "age": 42,
    "height": 160,
    "weight": 50,
    "sexual_orientation": "heterosexual",
    "background": "Blonde bombshell known for her dazzling looks and mesmerizing charm",
    "fighting_attributes": {
      "strength": 65,
      "agility": 80,
      "stamina": 60,
      "technique": 68,
      "reflexes": 72,
      "punching": 60,
      "kicking": 65,
      "endurance": 70
    },
    "physical_attributes": {
      "attractiveness": 90,
      "seduction": 55,
      "flirtiness": 60
    },
    "mental_attributes": {
      "dominance": 40,
      "loyalty": 70,
      "stability": 70,
      "craziness": 30,
      "jealousy": 60,
      "monogamy": 70,
      "cheating": 30
    },
    "championships": 0,
    "traits": ["Seductive"],
    "injuryLevel": null,
    "injuryDuration": 0
  },
  {
    "name": "Zambia",
    "age": 38,
    "height": 170,
    "weight": 76,
    "sexual_orientation": "lesbian",
    "background": "A powerful black bodybuilder with sculpted muscles and unbreakable will",
    "fighting_attributes": {
      "strength": 90,
      "agility": 60,
      "stamina": 85,
      "technique": 65,
      "reflexes": 68,
      "punching": 80,
      "kicking": 70,
      "endurance": 88
    },
    "physical_attributes": {
      "attractiveness": 50,
      "seduction": 85,
      "flirtiness": 70
    },
    "mental_attributes": {
      "dominance": 95,
      "loyalty": 50,
      "stability": 55,
      "craziness": 70,
      "jealousy": 70,
      "monogamy": 30,
      "cheating": 60
    },
    "championships": 0,
    "traits": ["Grappler"],
    "injuryLevel": null,
    "injuryDuration": 0
  },
  {
    "name": "Anastasia",
    "age": 32,
    "height": 188,
    "weight": 70,
    "sexual_orientation": "bisexual",
    "background": "A tall Russian volleyball player, elegant yet fierce on the court",
    "fighting_attributes": {
      "strength": 72,
      "agility": 78,
      "stamina": 80,
      "technique": 72,
      "reflexes": 80,
      "punching": 65,
      "kicking": 75,
      "endurance": 80
    },
    "physical_attributes": {
      "attractiveness": 80,
      "seduction": 50,
      "flirtiness": 40
    },
    "mental_attributes": {
      "dominance": 75,
      "loyalty": 65,
      "stability": 80,
      "craziness": 30,
      "jealousy": 80,
      "monogamy": 60,
      "cheating": 60
    },
    "championships": 0,
    "traits": ["Fierce Amazon"],
    "injuryLevel": null,
    "injuryDuration": 0
  },
  {
    "name": "Sibel",
    "age": 33,
    "height": 173,
    "weight": 62,
    "sexual_orientation": "lesbian",
    "background": "A dedicated boxer and kickboxer, known for relentless aggression and iron will.",
    "fighting_attributes": {
      "strength": 80,
      "agility": 70,
      "stamina": 75,
      "technique": 75,
      "reflexes": 70,
      "punching": 90,
      "kicking": 65,
      "endurance": 80
    },
    "physical_attributes": {
      "attractiveness": 40,
      "seduction": 80,
      "flirtiness": 70
    },
    "mental_attributes": {
      "dominance": 95,
      "loyalty": 20,
      "stability": 10,
      "craziness": 90,
      "jealousy": 80,
      "monogamy": 20,
      "cheating": 80
    },
    "championships": 0,
    "traits": ["Provocateur"],
    "injuryLevel": null,
    "injuryDuration": 0
  }
];

// ─── Relationship Data ───────────────────────────────────────
let relationships = {};

/**
 * initializeRelationships()
 * Call once at start to build relationships[a][b].
 * All start at 30 (Neutral), with overrides applied for specific pairs.
 */
export function initializeRelationships() {
  relationships = {};
  for (let i = 0; i < characters.length; i++) {
    const c1 = characters[i];
    if (!c1.traits) c1.traits = [];
    relationships[c1.name] = {};
    for (let j = 0; j < characters.length; j++) {
      const c2 = characters[j];
      if (c1.name === c2.name) continue;
      const defaultVal = 30;
      const tier = getTierLabel(defaultVal);
      relationships[c1.name][c2.name] = {
        value: defaultVal,
        status: tier,
        tier: tier
      };
    }
  }

  // Overrides for predefined relationships
  function setRel(a, b, val) {
    const tier = getTierLabel(val);
    relationships[a][b] = { value: val, status: tier, tier };
    relationships[b][a] = { value: val, status: tier, tier };
  }

  setRel("Tulin",  "Esra",  85);
  setRel("Sevgi",  "Seher", 85);
  setRel("Merve",  "Seher", 60);
  setRel("Selma",  "Seher", 60);
}

/**
 * getRelationship(a, b)
 * @returns { value, status, tier }
 */
export function getRelationship(a, b) {
  const rels = relationships[a.name];
  if (!rels || !rels[b.name]) {
    console.error(`No relationship for ${a.name}→${b.name}`);
    const fallback = 30;
    const tier = getTierLabel(fallback);
    return { value: fallback, status: tier, tier };
  }
  return rels[b.name];
}

// ─── Fighting Styles ──────────────────────────────────────────
export const fightingStyles = {
  "Catfight":        { strength: 0.2, agility: 0.4, stamina: 0.2, technique: 0.2 },
  "Naked Wrestling": { strength: 0.3, agility: 0.3, stamina: 0.2, technique: 0.2 },
  "MMA":             { strength: 0.3, agility: 0.2, stamina: 0.2, technique: 0.3 },
  "Boxing":          { strength: 0.4, agility: 0.2, stamina: 0.2, technique: 0.2, punching: 0.2 },
  "Kickboxing":      { strength: 0.35, agility: 0.3, stamina: 0.2, technique: 0.15, kicking: 0.2 },
  "Armwrestling":    { strength: 0.6, stamina: 0.3, reflexes: 0.1 },
  "Sexfight":        { seduction: 0.5, dominance: 0.3, agility: 0.2 }
};

// ─── Backward‐compatibility (legacy window.* usage) ───────────
window.characters              = characters;
window.relationships           = relationships;
window.initializeRelationships = initializeRelationships;
window.getRelationship         = getRelationship;
window.fightingStyles          = fightingStyles;
window.REL_THRESHOLDS          = REL_THRESHOLDS;
window.getTierLabel            = getTierLabel;
