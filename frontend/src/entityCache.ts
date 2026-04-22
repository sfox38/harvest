/**
 * entityCache.ts - Module-level cache of all HA entity states.
 *
 * Loaded once when the panel opens (from main.tsx when hass is set).
 * Re-fetched each time the wizard opens if the cache is empty.
 * Used by Step 1 of the wizard to power the entity autocomplete dropdown.
 */

import { api } from "./api";
import type { HAEntity } from "./types";

let _cache: HAEntity[] = [];
let _loading = false;

export function getEntityCache(): HAEntity[] {
  return _cache;
}

export async function loadEntityCache(): Promise<void> {
  if (_loading) return;
  _loading = true;
  try {
    _cache = await api.entities.list();
  } catch {
    // Fail silently - autocomplete just shows no suggestions
  } finally {
    _loading = false;
  }
}
