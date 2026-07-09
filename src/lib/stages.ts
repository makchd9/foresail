/** Default pipeline every new workspace starts with. Probabilities drive the weighted forecast. */
export const DEFAULT_STAGES = [
  { name: "Lead", probability: 10, color: "sky", isWon: false, isLost: false },
  { name: "Qualified", probability: 25, color: "blue", isWon: false, isLost: false },
  { name: "Proposal", probability: 50, color: "violet", isWon: false, isLost: false },
  { name: "Negotiation", probability: 75, color: "amber", isWon: false, isLost: false },
  { name: "Won", probability: 100, color: "emerald", isWon: true, isLost: false },
  { name: "Lost", probability: 0, color: "rose", isWon: false, isLost: true },
] as const;

/** Named colors a stage can take; rendered via fixed Tailwind class maps. */
export const STAGE_COLORS = [
  "zinc",
  "sky",
  "blue",
  "violet",
  "fuchsia",
  "amber",
  "emerald",
  "rose",
] as const;

export type StageColor = (typeof STAGE_COLORS)[number];
