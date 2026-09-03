import type { Json } from "@/lib/supabase/database.types";

export const DEFAULT_VISIBILITY_LIMITS = { maxCompetitors: 3, maxActivePrompts: 25 } as const;

export function visibilityLimits(settings: Json | undefined) {
  const value = settings && typeof settings === "object" && !Array.isArray(settings) ? settings as Record<string, Json | undefined> : {};
  const maxCompetitors = typeof value.max_competitors === "number" ? value.max_competitors : DEFAULT_VISIBILITY_LIMITS.maxCompetitors;
  const maxActivePrompts = typeof value.max_active_prompts === "number" ? value.max_active_prompts : DEFAULT_VISIBILITY_LIMITS.maxActivePrompts;
  return {
    maxCompetitors: Math.max(1, Math.min(Math.trunc(maxCompetitors), 10)),
    maxActivePrompts: Math.max(1, Math.min(Math.trunc(maxActivePrompts), 100)),
  };
}
