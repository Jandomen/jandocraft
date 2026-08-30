import type { Direction, PlayerState } from "@/types/game";
import { PLAYER_H, PLAYER_W } from "@/lib/game/physics";
import type { TetherState } from "@/lib/game/tether";

// ── Spacesuit palette ──────────────────────────────────────────────────────
const SUIT = "#e2e8f0";
const SUIT_MID = "#cbd5e1";
const SUIT_SHADE = "#94a3b8";
const SUIT_DARK = "#64748b";
const VISOR = "#0ea5e9";
const VISOR_HI = "#bae6fd";
const VISOR_DEEP = "#0369a1";
const ACCENT = "#f97316";
const ACCENT_DARK = "#c2410c";
const DARK = "#0f172a";

// ── Human palette (male) ───────────────────────────────────────────────────
const SKIN = "#f5d0b0";
const SKIN_MID = "#e8bc94";
const SKIN_SHADE = "#d4a57a";
const SKIN_DARK = "#b8895e";
const HAIR = "#3b2314";
const HAIR_HI = "#5c3a22";
const SHIRT = "#3b82f6";
const SHIRT_HI = "#60a5fa";
const SHIRT_SHADE = "#1d4ed8";
const PANTS = "#334155";
const PANTS_HI = "#475569";
const PANTS_SHADE = "#1e293b";
const SHOE = "#1e293b";
const SHOE_HI = "#334155";

// ── Female NPC palette ─────────────────────────────────────────────────────
const F_SKIN = "#f8d8c0";
const F_SKIN_MID = "#f0c4a0";
const F_SKIN_SHADE = "#d4a888";
const F_HAIR = "#1a1a2e";
const F_HAIR_HI = "#2d2d44";
const F_FLIGHT_SUIT = "#1e3a5f";
const F_FLIGHT_SUIT_HI = "#2563eb";
const F_FLIGHT_SUIT_SHADE = "#172554";
const F_ACCENT = "#e11d48";
const F_VISOR_TINT = "rgba(14,165,233,0.15)";

// ════════════════════════════════════════════════════════════════════════════
//  HUMAN CHARACTER (player without suit)
// ════════════════════════════════════════════════════════════════════════════

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  time: number,
  equipped = false
): void {
  const { pos } = player;
  const x = pos.x;
  const groundY = pos.y + PLAYER_H;

  const airborne = !player.onGround;
  const walking = Math.abs(player.vel.x) > 8;

  const walkPhase =
    airborne && Math.abs(player.vel.y) < 40
      ? Math.sin(time * 1.5) * 2
      : walking
        ? Math.sin(time * 10) * 2.5
        : Math.sin(time * 1.2) * 1.2;

  const breathe = Math.sin(time * 2) * 0.6;
  const shoulderY = groundY - PLAYER_H + 6 + walkPhase * 0.3 + (walking ? 0 : breathe * 0.3);

  ctx.save();
  ctx.translate(x, 0);

  // ── Ground shadow ──
  if (player.onGround) {
    const shadowGrad = ctx.createRadialGradient(0, groundY, 0, 0, groundY, PLAYER_W * 0.7);
    shadowGrad.addColorStop(0, "rgba(0,0,0,0.4)");
    shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, groundY, PLAYER_W * 0.7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!equipped) {
    drawHumanBody(ctx, player, time, shoulderY, walkPhase, airborne, breathe);
  } else {
    drawSpacesuitBody(ctx, player, time, shoulderY, walkPhase, airborne);
  }

  ctx.restore();
}

function drawHumanBody(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  time: number,
  shoulderY: number,
  walkPhase: number,
  airborne: boolean,
  _breathing: number
): void {
  const groundY = shoulderY + PLAYER_H - 6;
  const legOffset = walkPhase * 2.5;
  const dir: Direction = player.facing;
  const eyeOff = dir === "right" ? 2.5 : -2.5;

  // ── LEGS ──
  const legGrad = ctx.createLinearGradient(-6, 0, 6, 0);
  legGrad.addColorStop(0, PANTS_SHADE);
  legGrad.addColorStop(0.4, PANTS);
  legGrad.addColorStop(1, PANTS_HI);
  ctx.strokeStyle = legGrad;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-5, shoulderY + PLAYER_H - 14);
  ctx.lineTo(-8, groundY - 2 + legOffset);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5, shoulderY + PLAYER_H - 14);
  ctx.lineTo(8, groundY - 2 - legOffset);
  ctx.stroke();

  // Shoe soles
  ctx.fillStyle = SHOE;
  ctx.fillRect(-12, groundY - 4 + legOffset, 9, 4);
  ctx.fillRect(3, groundY - 4 - legOffset, 9, 4);
  ctx.fillStyle = SHOE_HI;
  ctx.fillRect(-12, groundY - 4 + legOffset, 9, 1);
  ctx.fillRect(3, groundY - 4 - legOffset, 9, 1);

  // ── TORSO ──
  const torsoTop = shoulderY;
  const torsoBottom = shoulderY + PLAYER_H - 14;

  const torsoGrad = ctx.createLinearGradient(0, torsoTop, 0, torsoBottom);
  torsoGrad.addColorStop(0, SHIRT_HI);
  torsoGrad.addColorStop(0.4, SHIRT);
  torsoGrad.addColorStop(1, SHIRT_SHADE);
  ctx.fillStyle = torsoGrad;

  ctx.beginPath();
  ctx.moveTo(-12, torsoTop);
  ctx.lineTo(12, torsoTop);
  ctx.lineTo(13, torsoBottom);
  ctx.lineTo(-13, torsoBottom);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Shirt seam line
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, torsoTop + 3);
  ctx.lineTo(0, torsoBottom);
  ctx.stroke();

  // Pocket
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(5, torsoTop + 4, 5, 4);
  // Pen in pocket
  ctx.strokeStyle = "#1e40af";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(7, torsoTop + 3);
  ctx.lineTo(7, torsoTop + 6);
  ctx.stroke();

  // Collar V-neck
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.moveTo(-5, torsoTop - 1);
  ctx.lineTo(0, torsoTop + 6);
  ctx.lineTo(5, torsoTop - 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // ── ARMS ──
  const armSwing = walkPhase * 1.8;

  // Left arm — sleeve then skin
  ctx.strokeStyle = SHIRT;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-11, torsoTop + 3);
  ctx.lineTo(-12, torsoTop + 10);
  ctx.stroke();

  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-12, torsoTop + 10);
  ctx.lineTo(-15 - armSwing, torsoTop + 18);
  ctx.stroke();

  // Right arm
  ctx.strokeStyle = SHIRT;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(11, torsoTop + 3);
  ctx.lineTo(12, torsoTop + 10);
  ctx.stroke();

  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(12, torsoTop + 10);
  ctx.lineTo(15 + armSwing, torsoTop + 18);
  ctx.stroke();

  // Hands
  const handGrad = ctx.createRadialGradient(
    -15 - armSwing, torsoTop + 18, 0,
    -15 - armSwing, torsoTop + 18, 4
  );
  handGrad.addColorStop(0, SKIN);
  handGrad.addColorStop(1, SKIN_SHADE);
  ctx.fillStyle = handGrad;
  ctx.beginPath();
  ctx.arc(-15 - armSwing, torsoTop + 18, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(15 + armSwing, torsoTop + 18, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // ── NECK ──
  ctx.fillStyle = SKIN_SHADE;
  ctx.fillRect(-3, torsoTop - 3, 6, 5);

  // ══════════════════════════════════════════════════════════════════════════
  //  DETAILED HUMAN FACE
  // ══════════════════════════════════════════════════════════════════════════
  const headY = torsoTop - 2;
  const headR = 11;

  // ── EARS ──
  const earY = headY + 1;
  // Left ear
  ctx.fillStyle = SKIN_MID;
  ctx.beginPath();
  ctx.ellipse(-headR + 1, earY, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = SKIN_SHADE;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  // Ear inner
  ctx.fillStyle = SKIN_SHADE;
  ctx.beginPath();
  ctx.ellipse(-headR + 1, earY, 1.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Right ear
  ctx.fillStyle = SKIN_MID;
  ctx.beginPath();
  ctx.ellipse(headR - 1, earY, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = SKIN_SHADE;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.fillStyle = SKIN_SHADE;
  ctx.beginPath();
  ctx.ellipse(headR - 1, earY, 1.5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── HEAD (skin with gradient) ──
  const headGrad = ctx.createRadialGradient(-2, headY - 3, 0, 0, headY, headR);
  headGrad.addColorStop(0, SKIN);
  headGrad.addColorStop(0.5, SKIN_MID);
  headGrad.addColorStop(1, SKIN_SHADE);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Subtle chin shading
  ctx.fillStyle = "rgba(180,137,94,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, headY + 6, 6, 3, 0, 0, Math.PI);
  ctx.fill();

  // ── HAIR (with volume and style) ──
  const hairGrad = ctx.createLinearGradient(0, headY - headR - 2, 0, headY - 1);
  hairGrad.addColorStop(0, HAIR_HI);
  hairGrad.addColorStop(0.6, HAIR);
  hairGrad.addColorStop(1, "#2a180d");
  ctx.fillStyle = hairGrad;

  // Main hair mass — covers top and sides
  ctx.beginPath();
  ctx.arc(0, headY - 1, headR + 1, Math.PI * 1.05, Math.PI * 1.95, true);
  ctx.fill();

  // Hair volume on top (slightly taller)
  ctx.beginPath();
  ctx.ellipse(0, headY - headR + 1, headR - 1, 4, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Side hair — covers ears partially
  ctx.fillStyle = HAIR;
  ctx.fillRect(-headR - 1, headY - 5, 4, 8);
  ctx.fillRect(headR - 3, headY - 5, 4, 8);

  // Hair highlight streaks
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(-4, headY - headR, 3, 5);
  ctx.fillRect(2, headY - headR + 1, 2, 4);

  // Hair outline
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(0, headY - 1, headR + 1, Math.PI * 1.05, Math.PI * 1.95, true);
  ctx.stroke();

  // ── EYEBROWS ──
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";

  // Left eyebrow — slightly arched
  ctx.beginPath();
  ctx.moveTo(-6.5 + eyeOff, headY - 1.5);
  ctx.quadraticCurveTo(-3.5 + eyeOff, headY - 3.5, -0.5 + eyeOff, headY - 2);
  ctx.stroke();

  // Right eyebrow
  ctx.beginPath();
  ctx.moveTo(0.5 + eyeOff, headY - 2);
  ctx.quadraticCurveTo(3.5 + eyeOff, headY - 3.5, 6.5 + eyeOff, headY - 1.5);
  ctx.stroke();

  // ── EYES ──
  const eyeY = headY + 1;
  const eyeSpacing = 3.8;

  // Eye socket shadow
  ctx.fillStyle = "rgba(180,137,94,0.15)";
  ctx.beginPath();
  ctx.ellipse(-eyeSpacing + eyeOff, eyeY, 4.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeSpacing + eyeOff, eyeY, 4.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyeball whites
  ctx.fillStyle = "#f8f8f8";
  ctx.beginPath();
  ctx.ellipse(-eyeSpacing + eyeOff, eyeY, 3.2, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeSpacing + eyeOff, eyeY, 3.2, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Iris with gradient
  const irisR = 1.9;
  const irisOff = dir === "right" ? 0.4 : -0.4;
  for (const ex of [-eyeSpacing, eyeSpacing]) {
    const ix = ex + eyeOff + irisOff;
    const irisGrad = ctx.createRadialGradient(ix, eyeY, 0, ix, eyeY, irisR);
    irisGrad.addColorStop(0, "#60a5fa");
    irisGrad.addColorStop(0.4, "#2563eb");
    irisGrad.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(ix, eyeY, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = DARK;
    ctx.beginPath();
    ctx.arc(ix + irisOff * 0.3, eyeY, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight (top-left of iris)
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(ix - 0.7, eyeY - 0.7, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Secondary highlight (bottom-right)
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(ix + 0.5, eyeY + 0.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyelids (top)
  ctx.strokeStyle = SKIN_SHADE;
  ctx.lineWidth = 1.2;
  for (const ex of [-eyeSpacing, eyeSpacing]) {
    ctx.beginPath();
    ctx.ellipse(ex + eyeOff, eyeY, 3.5, 2.8, 0, Math.PI + 0.3, -0.3);
    ctx.stroke();
  }

  // Eyelashes (top eyelid)
  ctx.strokeStyle = "#1a1008";
  ctx.lineWidth = 0.8;
  for (const ex of [-eyeSpacing, eyeSpacing]) {
    ctx.beginPath();
    ctx.ellipse(ex + eyeOff, eyeY, 3.5, 2.8, 0, Math.PI + 0.3, -0.3);
    ctx.stroke();
  }

  // Lower eyelid line
  ctx.strokeStyle = "rgba(180,137,94,0.25)";
  ctx.lineWidth = 0.5;
  for (const ex of [-eyeSpacing, eyeSpacing]) {
    ctx.beginPath();
    ctx.ellipse(ex + eyeOff, eyeY, 3.2, 2.5, 0, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }

  // ── NOSE (3D with bridge and nostrils) ──
  // Nose bridge (subtle highlight)
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(eyeOff - 0.5, headY - 1);
  ctx.lineTo(eyeOff + 0.5, headY - 1);
  ctx.lineTo(eyeOff + 0.3, headY + 3);
  ctx.lineTo(eyeOff - 0.3, headY + 3);
  ctx.closePath();
  ctx.fill();

  // Nose tip
  ctx.fillStyle = SKIN_SHADE;
  ctx.beginPath();
  ctx.ellipse(eyeOff, headY + 3.5, 2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose highlight
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.ellipse(eyeOff - 0.3, headY + 2.5, 1, 0.8, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils
  ctx.fillStyle = SKIN_DARK;
  ctx.beginPath();
  ctx.ellipse(eyeOff - 1, headY + 4, 0.8, 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeOff + 1, headY + 4, 0.8, 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── MOUTH (with lips) ──
  const mouthY = headY + 6;

  // Upper lip
  ctx.fillStyle = "#d4877a";
  ctx.beginPath();
  ctx.moveTo(eyeOff - 3, mouthY);
  ctx.quadraticCurveTo(eyeOff - 1, mouthY - 1.2, eyeOff, mouthY - 0.5);
  ctx.quadraticCurveTo(eyeOff + 1, mouthY - 1.2, eyeOff + 3, mouthY);
  ctx.closePath();
  ctx.fill();

  // Lower lip
  ctx.fillStyle = "#e09889";
  ctx.beginPath();
  ctx.moveTo(eyeOff - 3, mouthY);
  ctx.quadraticCurveTo(eyeOff, mouthY + 2.5, eyeOff + 3, mouthY);
  ctx.closePath();
  ctx.fill();

  // Lip highlight
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.ellipse(eyeOff + 0.5, mouthY + 0.8, 2, 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth line
  ctx.strokeStyle = "#b87068";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(eyeOff - 2.5, mouthY);
  ctx.quadraticCurveTo(eyeOff, mouthY + 0.3, eyeOff + 2.5, mouthY);
  ctx.stroke();

  // ── CHEEK BLUSH ──
  ctx.fillStyle = "rgba(230,150,130,0.12)";
  ctx.beginPath();
  ctx.ellipse(-5 + eyeOff, headY + 3, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5 + eyeOff, headY + 3, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── THRUSTER EXHAUST ──
  if (airborne) {
    const jetLen = player.vel.y > 40 ? 10 : 4;
    const jetGrad = ctx.createLinearGradient(0, torsoBottom + 2, 0, torsoBottom + 2 + jetLen);
    jetGrad.addColorStop(0, "rgba(251,146,60,0.9)");
    jetGrad.addColorStop(0.4, "rgba(251,146,60,0.5)");
    jetGrad.addColorStop(1, "rgba(251,146,60,0)");
    ctx.fillStyle = jetGrad;
    ctx.beginPath();
    ctx.moveTo(-5, torsoBottom + 2);
    ctx.lineTo(5, torsoBottom + 2);
    ctx.lineTo(2, torsoBottom + 2 + jetLen);
    ctx.lineTo(-2, torsoBottom + 2 + jetLen);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(254,215,170,0.7)";
    ctx.beginPath();
    ctx.moveTo(-3, torsoBottom + 2);
    ctx.lineTo(3, torsoBottom + 2);
    ctx.lineTo(1, torsoBottom + 2 + jetLen * 0.5);
    ctx.lineTo(-1, torsoBottom + 2 + jetLen * 0.5);
    ctx.closePath();
    ctx.fill();
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  SPACESUIT BODY (player with suit equipped)
// ════════════════════════════════════════════════════════════════════════════

function drawSpacesuitBody(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  time: number,
  shoulderY: number,
  walkPhase: number,
  airborne: boolean
): void {
  const groundY = shoulderY + PLAYER_H - 6;
  const legOffset = walkPhase * 2.5;
  const dir: Direction = player.facing;
  const eyeOff = dir === "right" ? 3 : -3;
  const torsoTop = shoulderY;
  const torsoBottom = shoulderY + PLAYER_H - 14;

  // Legs
  const legGrad = ctx.createLinearGradient(-6, 0, 6, 0);
  legGrad.addColorStop(0, SUIT_SHADE);
  legGrad.addColorStop(0.3, SUIT_MID);
  legGrad.addColorStop(0.7, SUIT);
  legGrad.addColorStop(1, SUIT_SHADE);
  ctx.strokeStyle = legGrad;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-5, shoulderY + PLAYER_H - 14);
  ctx.lineTo(-8, groundY - 2 + legOffset);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5, shoulderY + PLAYER_H - 14);
  ctx.lineTo(8, groundY - 2 - legOffset);
  ctx.stroke();

  // Boots
  ctx.fillStyle = "#374151";
  ctx.fillRect(-12, groundY - 5 + legOffset, 9, 4);
  ctx.fillRect(3, groundY - 5 - legOffset, 9, 4);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(-12, groundY - 5 + legOffset, 9, 1);

  // Knee joints
  ctx.fillStyle = SUIT_DARK;
  ctx.beginPath();
  ctx.arc(-8, groundY - 12 + legOffset * 0.5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, groundY - 12 - legOffset * 0.5, 3, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  const torsoGrad = ctx.createLinearGradient(0, torsoTop, 0, torsoBottom);
  torsoGrad.addColorStop(0, SUIT);
  torsoGrad.addColorStop(0.5, SUIT_MID);
  torsoGrad.addColorStop(1, SUIT_SHADE);
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.moveTo(-12, torsoTop);
  ctx.lineTo(12, torsoTop);
  ctx.lineTo(13, torsoBottom);
  ctx.lineTo(-13, torsoBottom);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Chest panel
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-7, torsoTop + 4, 14, 10);
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(-7, torsoTop + 4, 14, 10);

  // LEDs
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(-4, torsoTop + 7, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.arc(0, torsoTop + 7, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.arc(4, torsoTop + 7, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // O2 display
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-5, torsoTop + 10, 10, 3);
  ctx.fillStyle = "#22c55e";
  ctx.font = "3px monospace";
  ctx.fillText("O₂", -4, torsoTop + 12.5);

  // Backpack
  const bpGrad = ctx.createLinearGradient(-14, 0, -14, torsoBottom);
  bpGrad.addColorStop(0, SUIT_SHADE);
  bpGrad.addColorStop(1, SUIT_DARK);
  ctx.fillStyle = bpGrad;
  ctx.fillRect(-16, torsoTop + 2, 8, PLAYER_H - 18);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(-16, torsoTop + 2, 2, PLAYER_H - 18);

  // O₂ tank
  const tankGrad = ctx.createLinearGradient(-21, 0, -17, 0);
  tankGrad.addColorStop(0, "#71717a");
  tankGrad.addColorStop(0.3, "#a1a1aa");
  tankGrad.addColorStop(0.7, "#d4d4d8");
  tankGrad.addColorStop(1, "#a1a1aa");
  ctx.fillStyle = tankGrad;
  ctx.beginPath();
  ctx.roundRect(-21, torsoTop + 6, 5, PLAYER_H - 24, 2);
  ctx.fill();
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(-20, torsoTop + 10, 3, 1);

  // Arms
  const armSwing = walkPhase * 1.8;
  ctx.strokeStyle = SUIT;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-11, torsoTop + 2);
  ctx.lineTo(-15 - armSwing, torsoTop + 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(11, torsoTop + 2);
  ctx.lineTo(15 + armSwing, torsoTop + 18);
  ctx.stroke();

  // Gloves
  const gloveGrad = ctx.createRadialGradient(-15, torsoTop + 18, 0, -15, torsoTop + 18, 4);
  gloveGrad.addColorStop(0, "#d4d4d8");
  gloveGrad.addColorStop(1, "#71717a");
  ctx.fillStyle = gloveGrad;
  ctx.beginPath();
  ctx.arc(-15 - armSwing, torsoTop + 18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(15 + armSwing, torsoTop + 18, 4, 0, Math.PI * 2);
  ctx.fill();

  // Thruster
  if (airborne) {
    const jetLen = player.vel.y > 40 ? 12 : 5;
    const jetGrad = ctx.createLinearGradient(0, torsoBottom + 2, 0, torsoBottom + 2 + jetLen);
    jetGrad.addColorStop(0, "rgba(56,189,248,0.8)");
    jetGrad.addColorStop(0.3, "rgba(14,165,233,0.5)");
    jetGrad.addColorStop(0.7, "rgba(251,146,60,0.3)");
    jetGrad.addColorStop(1, "rgba(251,146,60,0)");
    ctx.fillStyle = jetGrad;
    ctx.beginPath();
    ctx.moveTo(-7, torsoBottom + 2);
    ctx.lineTo(7, torsoBottom + 2);
    ctx.lineTo(3, torsoBottom + 2 + jetLen);
    ctx.lineTo(-3, torsoBottom + 2 + jetLen);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(186,230,253,0.6)";
    ctx.beginPath();
    ctx.moveTo(-3, torsoBottom + 2);
    ctx.lineTo(3, torsoBottom + 2);
    ctx.lineTo(1, torsoBottom + 2 + jetLen * 0.4);
    ctx.lineTo(-1, torsoBottom + 2 + jetLen * 0.4);
    ctx.closePath();
    ctx.fill();
  }

  // ── HELMET ──
  const helmetY = torsoTop;
  const helmetR = 14;

  const helmetGrad = ctx.createRadialGradient(-3, helmetY - 4, 0, 0, helmetY, helmetR);
  helmetGrad.addColorStop(0, "#f8fafc");
  helmetGrad.addColorStop(0.5, SUIT);
  helmetGrad.addColorStop(1, SUIT_SHADE);
  ctx.fillStyle = helmetGrad;
  ctx.beginPath();
  ctx.arc(0, helmetY, helmetR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.strokeStyle = SUIT_DARK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, helmetY, helmetR - 3, Math.PI * 0.85, Math.PI * 2.15);
  ctx.stroke();

  // Visor
  const visorX = dir === "right" ? 3 : -3;
  const visorY = helmetY + 1;
  const visorGrad = ctx.createLinearGradient(visorX - 8, visorY - 8, visorX + 8, visorY + 8);
  visorGrad.addColorStop(0, VISOR_HI);
  visorGrad.addColorStop(0.3, "#7dd3fc");
  visorGrad.addColorStop(0.6, VISOR);
  visorGrad.addColorStop(1, VISOR_DEEP);
  ctx.fillStyle = visorGrad;
  ctx.beginPath();
  ctx.ellipse(visorX, visorY, 9, 10, dir === "right" ? 0.25 : -0.25, 0, Math.PI * 2);
  ctx.fill();

  // Visor glare
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(visorX - 3, visorY - 3, 4, 3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.beginPath();
  ctx.arc(visorX - 2, visorY - 4, 1, 0, Math.PI * 2);
  ctx.fill();

  // Antenna
  ctx.fillStyle = SUIT_DARK;
  ctx.beginPath();
  ctx.arc(-4, helmetY - 10, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, helmetY - 12);
  ctx.lineTo(-6, helmetY - 20);
  ctx.stroke();
  const blink = Math.sin(time * 4) > 0 ? 1 : 0.4;
  ctx.globalAlpha = blink;
  ctx.fillStyle = "#f43f5e";
  ctx.beginPath();
  ctx.arc(-6, helmetY - 21, 2, 0, Math.PI * 2);
  ctx.fill();
  const antGlow = ctx.createRadialGradient(-6, helmetY - 21, 0, -6, helmetY - 21, 5);
  antGlow.addColorStop(0, "rgba(244,63,94,0.3)");
  antGlow.addColorStop(1, "rgba(244,63,94,0)");
  ctx.fillStyle = antGlow;
  ctx.beginPath();
  ctx.arc(-6, helmetY - 21, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ════════════════════════════════════════════════════════════════════════════
//  NPC — Female astronaut (computer-controlled)
// ════════════════════════════════════════════════════════════════════════════

export interface NPCState {
  pos: Vec2;
  vel: Vec2;
  facing: Direction;
  onGround: boolean;
  /** Current AI state. */
  state: "patrol" | "idle" | "wave" | "walk-to" | "repair" | "float";
  /** Patrol bounds (world x range). */
  patrolMin: number;
  patrolMax: number;
  /** Target x when walking to a point. */
  targetX: number | null;
  /** Idle timer — seconds remaining before resuming patrol. */
  idleTimer: number;
  /** Animation time for drawing. */
  animTime: number;
  /** What the NPC is currently saying (shown as speech bubble). */
  dialogue: string | null;
  /** Timer for how long dialogue stays visible. */
  dialogueTimer: number;
  /** Floating height when in anti-gravity repair mode. */
  floatHeight: number;
  /** Repair animation timer. */
  repairTimer: number;
  /** Sparks effect timer. */
  sparkTimer: number;
}

import type { Vec2 } from "@/types/game";

/** Create a fresh NPC at the given position inside the station. */
export function createNPC(x: number, y: number, patrolMin: number, patrolMax: number): NPCState {
  return {
    pos: { x, y },
    vel: { x: 0, y: 0 },
    facing: "right",
    onGround: true,
    state: "patrol",
    patrolMin,
    patrolMax,
    targetX: null,
    idleTimer: 0,
    animTime: 0,
    dialogue: null,
    dialogueTimer: 0,
    floatHeight: 0,
    repairTimer: 0,
    sparkTimer: 0,
  };
}

const NPC_SPEED = 55;
const NPC_DIALOGUES = [
  "¡Hola! ¿Cómo va la estación?",
  "Necesitamos más paneles solares.",
  "El life-support funciona bien.",
  "¿Has visto el Columbus últimamente?",
  "Cuidado con el oxígeno afuera.",
  "Las plantas están creciendo bien.",
  "Deberíamos expandir la estación.",
  "¡El espacio es hermoso hoy!",
  "Recuerda recargar el traje.",
  "Las baterías están al 80%.",
  "¿Necesitas ayuda con algo?",
  "El shuttle llega pronto.",
  "Voy a revisar el life-support...",
  "🔧 Estoy ajustando el life-support",
  "⚙️ Mantenimiento preventivo...",
  "🩹 Reparando una fuga pequeña",
  "💡 Cambiando una bombilla quemada",
  "Voy a revisar las plantas 🌿",
  "Las baterías necesitan carga 🔋",
  "¡El panel solar funciona perfecto! ☀️",
];

// Interest points in the station (world x positions) for the NPC to visit
const INTEREST_POINTS = [
  { x: 0, label: "Life Support" },
  { x: 5, label: "Plantas" },
  { x: 10, label: "Paneles" },
  { x: 15, label: "Baterías" },
  { x: 18, label: "Almacén" },
];

/** Step the NPC AI — call each frame with delta time in seconds. */
export function stepNPC(npc: NPCState, dt: number, now: number): void {
  npc.animTime = now;
  npc.pos.y += npc.vel.y * dt;
  npc.vel.y = 0; // simplified gravity — NPC is always grounded inside station

  // Dialogue timer
  if (npc.dialogueTimer > 0) {
    npc.dialogueTimer -= dt;
    if (npc.dialogueTimer <= 0) {
      npc.dialogue = null;
    }
  }

  // Anti-gravity float animation
  if (npc.state === "float" || npc.state === "repair") {
    npc.floatHeight = Math.sin(now * 2) * 8 + 15;
  } else {
    npc.floatHeight = 0;
  }

  // Spark timer for repair effects
  if (npc.sparkTimer > 0) {
    npc.sparkTimer -= dt;
  }

  switch (npc.state) {
    case "patrol": {
      // Walk toward the current interest point or random direction
      const targetX = npc.targetX !== null ? npc.targetX : (npc.patrolMin + npc.patrolMax) / 2;
      const dir = npc.pos.x < targetX ? 1 : -1;
      npc.vel.x = NPC_SPEED * dir;
      npc.pos.x += npc.vel.x * dt;
      npc.facing = dir > 0 ? "right" : "left";

      // Reverse at patrol bounds
      if (npc.pos.x <= npc.patrolMin) {
        npc.pos.x = npc.patrolMin;
        npc.facing = "right";
        npc.targetX = null;
      } else if (npc.pos.x >= npc.patrolMax) {
        npc.pos.x = npc.patrolMax;
        npc.facing = "left";
        npc.targetX = null;
      }

      // Reached target interest point
      if (npc.targetX !== null && Math.abs(npc.pos.x - npc.targetX) < 5) {
        npc.targetX = null;
        npc.vel.x = 0;
        npc.state = "idle";
        npc.idleTimer = 2 + Math.random() * 3;

        // Say something about the interest point
        if (npc.dialogueTimer <= 0 && Math.random() < 0.5) {
          npc.dialogue = NPC_DIALOGUES[Math.floor(Math.random() * NPC_DIALOGUES.length)];
          npc.dialogueTimer = 3;
        }
      }

      // Random chance to walk to an interest point
      if (npc.targetX === null && Math.random() < dt * 0.4) {
        const point = INTEREST_POINTS[Math.floor(Math.random() * INTEREST_POINTS.length)];
        const worldX = npc.patrolMin + point.x * 32;
        npc.targetX = Math.max(npc.patrolMin, Math.min(npc.patrolMax, worldX));
      }

      // Random chance to start floating/repairing
      if (Math.random() < dt * 0.08) {
        npc.state = "float";
        npc.idleTimer = 2 + Math.random() * 3;
        npc.vel.x = 0;
        npc.targetX = null;
        npc.dialogue = "🔋 Activando antigravedad...";
        npc.dialogueTimer = 3;
      }
      break;
    }

    case "idle": {
      npc.vel.x = 0;
      npc.idleTimer -= dt;

      // Small look-around animation (facing changes)
      if (Math.random() < dt * 0.3) {
        npc.facing = npc.facing === "right" ? "left" : "right";
      }

      if (npc.dialogueTimer <= 0 && Math.random() < dt * 0.35) {
        npc.dialogue = NPC_DIALOGUES[Math.floor(Math.random() * NPC_DIALOGUES.length)];
        npc.dialogueTimer = 3.5;
      }

      if (npc.idleTimer <= 0) {
        npc.state = "patrol";
        // Pick next interest point
        const point = INTEREST_POINTS[Math.floor(Math.random() * INTEREST_POINTS.length)];
        const worldX = npc.patrolMin + point.x * 32;
        npc.targetX = Math.max(npc.patrolMin, Math.min(npc.patrolMax, worldX));
      }
      break;
    }

    case "float": {
      npc.vel.x = 0;
      npc.idleTimer -= dt;

      // Gentle horizontal drift while floating
      npc.pos.x += Math.sin(now * 1.5) * 0.3;

      if (npc.dialogueTimer <= 0 && Math.random() < dt * 0.4) {
        npc.dialogue = "✨ Flotando con antigravedad";
        npc.dialogueTimer = 3;
      }

      if (npc.idleTimer <= 0) {
        npc.state = "repair";
        npc.repairTimer = 3 + Math.random() * 4;
        npc.sparkTimer = 0;
      }
      break;
    }

    case "repair": {
      npc.vel.x = 0;
      npc.repairTimer -= dt;
      npc.sparkTimer = 0.3;

      // Slight movement while repairing (hands moving)
      npc.pos.x += Math.sin(now * 3) * 0.2;

      if (npc.dialogueTimer <= 0 && Math.random() < dt * 0.5) {
        const repairDialogues = [
          "🔧 Reparando...",
          "⚙️ Ajustando sistema",
          "🩹 Parche aplicado",
          "💡 Luz reparada",
          "🔩 Apretando tornillos",
          "🩻 Verificando conexiones",
        ];
        npc.dialogue = repairDialogues[Math.floor(Math.random() * repairDialogues.length)];
        npc.dialogueTimer = 2.5;
      }

      if (npc.repairTimer <= 0) {
        npc.state = "idle";
        npc.idleTimer = 1;
        npc.dialogue = "✅ ¡Reparación completada!";
        npc.dialogueTimer = 3;
      }
      break;
    }

    case "wave": {
      npc.vel.x = 0;
      npc.idleTimer -= dt;
      if (npc.idleTimer <= 0) {
        npc.state = "patrol";
      }
      break;
    }

    case "walk-to": {
      if (npc.targetX !== null) {
        const dx = npc.targetX - npc.pos.x;
        if (Math.abs(dx) < 2) {
          npc.vel.x = 0;
          npc.targetX = null;
          npc.state = "idle";
          npc.idleTimer = 2;
        } else {
          npc.vel.x = dx > 0 ? NPC_SPEED : -NPC_SPEED;
          npc.pos.x += npc.vel.x * dt;
          npc.facing = dx > 0 ? "right" : "left";
        }
      } else {
        npc.state = "patrol";
      }
      break;
    }
  }
}

/** Draw the NPC female astronaut. */
export function drawNPC(
  ctx: CanvasRenderingContext2D,
  npc: NPCState,
  time: number
): void {
  const { pos } = npc;
  const x = pos.x;
  const floatOffset = npc.floatHeight || 0;
  const groundY = pos.y + PLAYER_H - floatOffset;

  const walking = Math.abs(npc.vel.x) > 2;
  const walkPhase = walking ? Math.sin(time * 10) * 2.5 : Math.sin(time * 1.5) * 1;
  const breathe = Math.sin(time * 2.2) * 0.5;
  const shoulderY = groundY - PLAYER_H + 6 + (walking ? walkPhase * 0.3 : breathe * 0.3);

  // Anti-gravity glow effect
  if (npc.state === "float" || npc.state === "repair") {
    ctx.save();
    const glowGrad = ctx.createRadialGradient(x, groundY + 5, 0, x, groundY + 5, 25);
    glowGrad.addColorStop(0, "rgba(56,189,248,0.25)");
    glowGrad.addColorStop(0.5, "rgba(56,189,248,0.1)");
    glowGrad.addColorStop(1, "rgba(56,189,248,0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, groundY + 5, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, 0);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, groundY, PLAYER_W * 0.6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const torsoTop = shoulderY;
  const torsoBottom = shoulderY + PLAYER_H - 14;
  const groundYf = shoulderY + PLAYER_H - 6;
  const legOffset = walkPhase * 2.5;
  const dir: Direction = npc.facing;
  const eyeOff = dir === "right" ? 3 : -3;

  // ── LEGS (slimmer) ──
  const legGrad = ctx.createLinearGradient(-5, 0, 5, 0);
  legGrad.addColorStop(0, F_FLIGHT_SUIT_SHADE);
  legGrad.addColorStop(0.5, F_FLIGHT_SUIT);
  legGrad.addColorStop(1, F_FLIGHT_SUIT_HI);
  ctx.strokeStyle = legGrad;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-4, shoulderY + PLAYER_H - 14);
  ctx.lineTo(-7, groundYf - 2 + legOffset);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, shoulderY + PLAYER_H - 14);
  ctx.lineTo(7, groundYf - 2 - legOffset);
  ctx.stroke();

  // Boots
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-10, groundYf - 4 + legOffset, 8, 3);
  ctx.fillRect(2, groundYf - 4 - legOffset, 8, 3);

  // ── TORSO (flight suit) ──
  const torsoGrad = ctx.createLinearGradient(0, torsoTop, 0, torsoBottom);
  torsoGrad.addColorStop(0, F_FLIGHT_SUIT_HI);
  torsoGrad.addColorStop(0.5, F_FLIGHT_SUIT);
  torsoGrad.addColorStop(1, F_FLIGHT_SUIT_SHADE);
  ctx.fillStyle = torsoGrad;

  ctx.beginPath();
  ctx.moveTo(-11, torsoTop);
  ctx.lineTo(11, torsoTop);
  ctx.lineTo(12, torsoBottom);
  ctx.lineTo(-12, torsoBottom);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // NASA-style patch on left chest
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(-6, torsoTop + 7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = F_ACCENT;
  ctx.beginPath();
  ctx.arc(-6, torsoTop + 7, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 3px sans-serif";
  ctx.fillText("N", -7.5, torsoTop + 8.5);

  // Zipper line
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, torsoTop + 2);
  ctx.lineTo(0, torsoBottom - 2);
  ctx.stroke();

  // Belt
  ctx.fillStyle = "#374151";
  ctx.fillRect(-11, torsoBottom - 3, 22, 3);
  ctx.fillStyle = "#71717a";
  ctx.fillRect(-2, torsoBottom - 3, 4, 3); // buckle

  // ── ARMS ──
  const armSwing = walkPhase * 1.5;

  ctx.strokeStyle = F_FLIGHT_SUIT;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, torsoTop + 3);
  ctx.lineTo(-11, torsoTop + 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, torsoTop + 3);
  ctx.lineTo(11, torsoTop + 10);
  ctx.stroke();

  // Forearms
  ctx.strokeStyle = F_SKIN;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-11, torsoTop + 10);
  ctx.lineTo(-14 - armSwing, torsoTop + 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(11, torsoTop + 10);
  ctx.lineTo(14 + armSwing, torsoTop + 18);
  ctx.stroke();

  // Hands
  ctx.fillStyle = F_SKIN;
  ctx.beginPath();
  ctx.arc(-14 - armSwing, torsoTop + 18, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14 + armSwing, torsoTop + 18, 3, 0, Math.PI * 2);
  ctx.fill();

  // ── NECK ──
  ctx.fillStyle = F_SKIN_SHADE;
  ctx.fillRect(-3, torsoTop - 3, 6, 5);

  // ════════════════════════════════════════════════════════════════════════
  //  FEMALE FACE — detailed with different features
  // ════════════════════════════════════════════════════════════════════════
  const headY = torsoTop - 2;
  const headR = 11;

  // Ears
  ctx.fillStyle = F_SKIN_MID;
  ctx.beginPath();
  ctx.ellipse(-headR + 1, headY + 1, 2.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = F_SKIN_SHADE;
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(headR - 1, headY + 1, 2.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head shape — slightly rounder
  const headGrad = ctx.createRadialGradient(-2, headY - 3, 0, 0, headY, headR);
  headGrad.addColorStop(0, F_SKIN);
  headGrad.addColorStop(0.5, F_SKIN_MID);
  headGrad.addColorStop(1, F_SKIN_SHADE);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // ── HAIR (ponytail style) ──
  const hairGrad = ctx.createLinearGradient(0, headY - headR - 3, 0, headY);
  hairGrad.addColorStop(0, F_HAIR_HI);
  hairGrad.addColorStop(1, F_HAIR);
  ctx.fillStyle = hairGrad;

  // Main hair — covers top
  ctx.beginPath();
  ctx.arc(0, headY - 1, headR + 1, Math.PI * 1.0, Math.PI * 2.0, true);
  ctx.fill();

  // Bangs (fringe across forehead)
  ctx.beginPath();
  ctx.ellipse(0, headY - headR + 3, headR - 1, 5, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Side hair
  ctx.fillStyle = F_HAIR;
  ctx.fillRect(-headR - 1, headY - 4, 4, 7);
  ctx.fillRect(headR - 3, headY - 4, 4, 7);

  // Ponytail (extends behind the head)
  ctx.fillStyle = F_HAIR;
  ctx.beginPath();
  ctx.moveTo(headR - 2, headY - 6);
  ctx.quadraticCurveTo(headR + 6, headY - 4, headR + 8, headY + 2);
  ctx.quadraticCurveTo(headR + 6, headY + 4, headR - 2, headY - 2);
  ctx.closePath();
  ctx.fill();
  // Ponytail highlight
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.moveTo(headR - 1, headY - 5);
  ctx.quadraticCurveTo(headR + 5, headY - 3, headR + 7, headY);
  ctx.quadraticCurveTo(headR + 4, headY - 1, headR - 1, headY - 3);
  ctx.closePath();
  ctx.fill();

  // Hair shine
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(-3, headY - headR, 5, 3);

  // ── EYEBROWS (thinner, more arched) ──
  ctx.strokeStyle = F_HAIR;
  ctx.lineWidth = 1.3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6 + eyeOff, headY - 1.5);
  ctx.quadraticCurveTo(-3.5 + eyeOff, headY - 3, -0.5 + eyeOff, headY - 1.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.5 + eyeOff, headY - 1.8);
  ctx.quadraticCurveTo(3.5 + eyeOff, headY - 3, 6 + eyeOff, headY - 1.5);
  ctx.stroke();

  // ── EYES (larger, more feminine) ──
  const eyeY = headY + 1;
  const eyeSpacing = 3.8;

  // Eye socket shadow
  ctx.fillStyle = "rgba(180,140,120,0.12)";
  ctx.beginPath();
  ctx.ellipse(-eyeSpacing + eyeOff, eyeY, 4.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeSpacing + eyeOff, eyeY, 4.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyeball whites — slightly larger
  ctx.fillStyle = "#fafafa";
  ctx.beginPath();
  ctx.ellipse(-eyeSpacing + eyeOff, eyeY, 3.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeSpacing + eyeOff, eyeY, 3.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Iris — green/hazel
  const irisR = 2.1;
  const irisOff = dir === "right" ? 0.4 : -0.4;
  for (const ex of [-eyeSpacing, eyeSpacing]) {
    const ix = ex + eyeOff + irisOff;
    const irisGrad = ctx.createRadialGradient(ix, eyeY, 0, ix, eyeY, irisR);
    irisGrad.addColorStop(0, "#86efac");
    irisGrad.addColorStop(0.4, "#22c55e");
    irisGrad.addColorStop(1, "#166534");
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(ix, eyeY, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = DARK;
    ctx.beginPath();
    ctx.arc(ix + irisOff * 0.3, eyeY, 1, 0, Math.PI * 2);
    ctx.fill();

    // Specular
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(ix - 0.8, eyeY - 0.7, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(ix + 0.5, eyeY + 0.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyelids + eyelashes (more pronounced)
  ctx.strokeStyle = "#1a1008";
  ctx.lineWidth = 1;
  for (const ex of [-eyeSpacing, eyeSpacing]) {
    ctx.beginPath();
    ctx.ellipse(ex + eyeOff, eyeY, 3.8, 3, 0, Math.PI + 0.3, -0.3);
    ctx.stroke();
  }

  // Lower lash line
  ctx.strokeStyle = "rgba(140,110,90,0.3)";
  ctx.lineWidth = 0.5;
  for (const ex of [-eyeSpacing, eyeSpacing]) {
    ctx.beginPath();
    ctx.ellipse(ex + eyeOff, eyeY, 3.5, 2.8, 0, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }

  // ── NOSE (smaller, more delicate) ──
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.moveTo(eyeOff - 0.3, headY);
  ctx.lineTo(eyeOff + 0.3, headY);
  ctx.lineTo(eyeOff + 0.2, headY + 3);
  ctx.lineTo(eyeOff - 0.2, headY + 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = F_SKIN_SHADE;
  ctx.beginPath();
  ctx.ellipse(eyeOff, headY + 3.2, 1.5, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.ellipse(eyeOff - 0.2, headY + 2.5, 0.8, 0.6, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils
  ctx.fillStyle = F_SKIN_SHADE;
  ctx.beginPath();
  ctx.ellipse(eyeOff - 0.8, headY + 3.8, 0.6, 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeOff + 0.8, headY + 3.8, 0.6, 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── MOUTH (more defined lips) ──
  const mouthY = headY + 5.5;

  // Upper lip — cupid's bow
  ctx.fillStyle = "#d4877a";
  ctx.beginPath();
  ctx.moveTo(eyeOff - 2.5, mouthY);
  ctx.quadraticCurveTo(eyeOff - 0.8, mouthY - 1.5, eyeOff, mouthY - 0.3);
  ctx.quadraticCurveTo(eyeOff + 0.8, mouthY - 1.5, eyeOff + 2.5, mouthY);
  ctx.closePath();
  ctx.fill();

  // Lower lip — fuller
  ctx.fillStyle = "#e09889";
  ctx.beginPath();
  ctx.moveTo(eyeOff - 2.5, mouthY);
  ctx.quadraticCurveTo(eyeOff, mouthY + 3, eyeOff + 2.5, mouthY);
  ctx.closePath();
  ctx.fill();

  // Lip highlight
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(eyeOff, mouthY + 1, 1.5, 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth line
  ctx.strokeStyle = "#b87068";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(eyeOff - 2, mouthY);
  ctx.quadraticCurveTo(eyeOff, mouthY + 0.4, eyeOff + 2, mouthY);
  ctx.stroke();

  // ── CHEEK BLUSH (more visible) ──
  ctx.fillStyle = "rgba(240,140,120,0.15)";
  ctx.beginPath();
  ctx.ellipse(-5 + eyeOff, headY + 3, 2.5, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5 + eyeOff, headY + 3, 2.5, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── SPEECH BUBBLE ──
  if (npc.dialogue && npc.dialogueTimer > 0) {
    const bubbleAlpha = Math.min(1, npc.dialogueTimer);
    ctx.globalAlpha = bubbleAlpha;

    const text = npc.dialogue;
    ctx.font = "bold 5px sans-serif";
    const textW = ctx.measureText(text).width;
    const bw = textW + 10;
    const bh = 12;
    const bx = -bw / 2;
    const by = headY - headR - bh - 8;

    // Bubble background
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 4);
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Bubble tail
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(-3, by + bh);
    ctx.lineTo(0, by + bh + 5);
    ctx.lineTo(3, by + bh);
    ctx.closePath();
    ctx.fill();

    // Bubble text
    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "center";
    ctx.fillText(text, 0, by + 9);
    ctx.textAlign = "left";

    ctx.globalAlpha = 1;
  }

  // ── REPAIR SPARKS ──
  if (npc.state === "repair" && npc.sparkTimer > 0) {
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const sparkX = (Math.random() - 0.5) * 20;
      const sparkY = shoulderY + 5 + (Math.random() - 0.5) * 15;
      const sparkSize = 1 + Math.random() * 2;
      const sparkAlpha = 0.5 + Math.random() * 0.5;

      // Spark glow
      ctx.fillStyle = `rgba(251,191,36,${sparkAlpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkSize + 2, 0, Math.PI * 2);
      ctx.fill();

      // Spark core
      ctx.fillStyle = `rgba(255,220,100,${sparkAlpha})`;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── FLOATING TOOL INDICATOR ──
  if (npc.state === "repair") {
    ctx.save();
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    const toolBob = Math.sin(time * 4) * 3;
    ctx.fillText("🔧", 18, shoulderY + 8 + toolBob);
    ctx.restore();
  }

  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
//  TETHER ROPE
// ════════════════════════════════════════════════════════════════════════════

export function drawTetherRope(
  ctx: CanvasRenderingContext2D,
  tether: TetherState,
  player: PlayerState,
  taut: boolean
): void {
  const ax = tether.anchorX;
  const ay = tether.anchorY + 6;
  const hx = player.pos.x;
  const hy = player.pos.y + PLAYER_H * 0.42;

  const dx = hx - ax;
  const dy = hy - ay;
  const d = Math.hypot(dx, dy);
  const short = Math.max(0.35, 1 - Math.min(1, d / (tether.maxLen + 20)) * 0.55);

  ctx.save();

  // Rope shadow
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax + 1, ay + 1);
  const sagS = taut ? 0 : 7;
  const pxS = (ax + hx) / 2 - dy * 0.04 + 1;
  const pyS = (ay + hy) / 2 + Math.abs(dx) * 0.02 * (sagS / 7) + 1;
  ctx.quadraticCurveTo(pxS, pyS, ax + dx * short + 1, ay + dy * short + 1);
  ctx.stroke();

  // Main rope
  ctx.strokeStyle = taut ? "#f97316" : "#fbbf24";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  const sag = taut ? 0 : 7;
  const px = (ax + hx) / 2 - dy * 0.04;
  const py = (ay + hy) / 2 + Math.abs(dx) * 0.02 * (sag / 7);
  ctx.quadraticCurveTo(px, py, ax + dx * short, ay + dy * short);
  ctx.stroke();

  // Rope highlight
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ax, ay - 1);
  ctx.quadraticCurveTo(px, py - 1, ax + dx * short, ay + dy * short - 1);
  ctx.stroke();

  // Anchor ring
  ctx.fillStyle = taut ? "#c2410c" : "#d97706";
  ctx.beginPath();
  ctx.arc(ax, ay, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.arc(ax - 1, ay - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Harness attachment
  ctx.fillStyle = taut ? "#fb923c" : "#fde68a";
  ctx.beginPath();
  ctx.arc(hx, hy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.arc(hx - 0.5, hy - 0.5, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
