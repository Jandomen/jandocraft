import type { ResourceDef, ResourceKind } from "@/types/game";

export const RESOURCES: Record<ResourceKind, ResourceDef> = {
  metal: {
    kind: "metal",
    label: "Metal",
    color: "#9ca3af",
  },
  glass: {
    kind: "glass",
    label: "Vidrio",
    color: "#bae6fd",
  },
  silicon: {
    kind: "silicon",
    label: "Silicio",
    color: "#a5b4fc",
  },
  energy: {
    kind: "energy",
    label: "Energía",
    color: "#facc15",
  },
  water: {
    kind: "water",
    label: "Agua",
    color: "#38bdf8",
  },
  "robotic-arm": {
    kind: "robotic-arm",
    label: "Mano robótica",
    color: "#f97316",
  },
};

export const RESOURCE_KINDS: ResourceKind[] = [
  "metal",
  "glass",
  "silicon",
  "energy",
  "water",
  "robotic-arm",
];

export function getResource(kind: ResourceKind): ResourceDef {
  return RESOURCES[kind];
}
