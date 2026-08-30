import type { BlockDef, BlockKind, ResourceKind } from "@/types/game";

export const BLOCKS: Record<BlockKind, BlockDef> = {
  floor: {
    kind: "floor",
    label: "Suelo",
    color: "#6b7280",
    frameColor: "#374151",
    solid: true,
    cost: { metal: 2 },
    key: "metal",
  },
  wall: {
    kind: "wall",
    label: "Panel",
    color: "#94a3b8",
    frameColor: "#475569",
    solid: true,
    cost: { metal: 2, silicon: 1 },
    key: "metal",
  },
  window: {
    kind: "window",
    label: "Ventana",
    color: "#7dd3fc",
    frameColor: "#0ea5e9",
    solid: true,
    cost: { glass: 2, silicon: 1 },
    key: "glass",
  },
  "solar-panel": {
    kind: "solar-panel",
    label: "Panel solar",
    color: "#1d4ed8",
    frameColor: "#93c5fd",
    solid: false,
    cost: { silicon: 3, metal: 1 },
    key: "silicon",
  },
  storage: {
    kind: "storage",
    label: "Almacén",
    color: "#d97706",
    frameColor: "#78350f",
    solid: true,
    cost: { metal: 4 },
    key: "metal",
  },
  light: {
    kind: "light",
    label: "Luz",
    color: "#fde047",
    frameColor: "#a16207",
    solid: false,
    cost: { energy: 1, silicon: 1 },
    key: null,
  },
  plants: {
    kind: "plants",
    label: "Plantas",
    color: "#22c55e",
    frameColor: "#14532d",
    solid: false,
    cost: { water: 2 },
    key: null,
  },
  "life-support": {
    kind: "life-support",
    label: "Soporte vital",
    color: "#0ea5e9",
    frameColor: "#075985",
    solid: false,
    cost: { metal: 3, silicon: 2, energy: 2 },
    key: "silicon",
  },
  battery: {
    kind: "battery",
    label: "Batería",
    color: "#facc15",
    frameColor: "#a16207",
    solid: false,
    cost: { metal: 2, silicon: 2, energy: 1 },
    key: "silicon",
  },
  "tether-point": {
    kind: "tether-point",
    label: "Soporte (lazo)",
    color: "#f97316",
    frameColor: "#9a3412",
    solid: false,
    cost: { metal: 1, silicon: 1 },
    key: "metal",
  },
  "robotic-arm": {
    kind: "robotic-arm",
    label: "Mano robótica",
    color: "#f97316",
    frameColor: "#c2410c",
    solid: false,
    cost: { "robotic-arm": 1 },
    key: "robotic-arm",
  },
};

export const BUILDABLE: BlockKind[] = [
  "floor",
  "wall",
  "window",
  "solar-panel",
  "storage",
  "light",
  "plants",
  "life-support",
  "battery",
  "tether-point",
  "robotic-arm",
];

export function getBlock(kind: BlockKind): BlockDef {
  return BLOCKS[kind];
}

export function blockCost(kind: BlockKind): Partial<Record<ResourceKind, number>> {
  return BLOCKS[kind].cost;
}
