import type { BlockKind } from "@/types/game";

export interface ExperimentKind {
  id: string;
  label: string;
  description: string;
  /** Blocks required to run the experiment. */
  requires: BlockKind[];
  /** Resource reward granted on success. */
  reward: Partial<Record<string, number>>;
}

/**
 * v1 scaffolding for the experimentation system: keeps a catalogue of
 * experiments and validation logic. Actual experiment play will be expanded
 * in later versions.
 */
export const EXPERIMENTS: ExperimentKind[] = [
  {
    id: "solar-charge",
    label: "Carga solar",
    description: "Conecta dos paneles solares y genera energía.",
    requires: ["solar-panel"],
    reward: { energy: 4 },
  },
];

export function canRunExperiment(
  exp: ExperimentKind,
  blocks: BlockKind[]
): boolean {
  return exp.requires.every((k) => blocks.includes(k));
}
