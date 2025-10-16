// config.js

export const config = {
  // Total number of days for the game (default matches UI: 50)
  totalDays: 50,

  // The periods in a day
  timeSlots: ["morning", "noon", "afternoon", "evening", "night"],

  // Action points per AP period
  apPerPeriod: 3,

  // Chances of over‐training on 1st, 2nd, 3rd+ sessions in a period
  trainingOvertrainChances: [0.10, 0.25, 0.50],

  // Every eliminationInterval days, all 8 active characters vote to eliminate one,
  // then one new reserve joins.
  eliminationInterval: 10,

  // Relationship thresholds for starting/breaking relationships
  relationshipThresholds: {
    newRelationship: 80, // rapport ≥ 80 → start dating
    breakup: 20          // rapport ≤ 20 → break up
  }
};

window.config = config;
