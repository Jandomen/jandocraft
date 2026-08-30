import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SaveData } from "@/types/game";
import { hydrateSave, newSave } from "@/lib/game/save";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Preferimos la publishable key (formato actual de Supabase), con la anon key
// como respaldo para proyectos más antiguos.
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/** Stable id for the single save slot used in v1. */
const SAVE_ID = "jandocraft-default-slot";

export interface LoadOutcome {
  ok: boolean;
  save: SaveData;
  source: "supabase" | "local" | "fresh";
}

export async function loadSave(): Promise<LoadOutcome> {
  const local = loadLocal();
  const sb = getClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("games")
        .select("game")
        .eq("id", SAVE_ID)
        .maybeSingle();
      if (!error && data?.game) {
        return { ok: true, save: hydrateSave(data.game), source: "supabase" };
      }
    } catch {
      // fall through to local storage
    }
  }
  if (local) return { ok: true, save: hydrateSave(local), source: "local" };
  return { ok: true, save: newSave(), source: "fresh" };
}

export async function saveGame(save: SaveData): Promise<{ ok: boolean; source: string }> {
  persistLocal(save);
  const sb = getClient();
  if (!sb) return { ok: true, source: "local" };
  try {
    const { error } = await sb.from("games").upsert(
      { id: SAVE_ID, game: save, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    return { ok: !error, source: !error ? "supabase" : "local" };
  } catch {
    return { ok: true, source: "local" };
  }
}

const LOCAL_KEY = "jandocraft-save-v1";

function loadLocal(): SaveData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

function persistLocal(save: SaveData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(save));
  } catch {
    // storage may be unavailable; ignore
  }
}
