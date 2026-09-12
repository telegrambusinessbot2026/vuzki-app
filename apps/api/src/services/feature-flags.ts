import { config } from '../config';

// Feature flag infrastructure.
//
// Baseline is driven by environment configuration (per-environment rollout).
// Admins may toggle flags at runtime through the admin API. Runtime overrides
// are stored in memory: intentional, because flag state is per-deployment and
// resets on redeploy (matching config-as-code for controlled rollout). A Redis
// backing store can be layered on here later for cross-instance consistency.

export type FeatureFlagKey = keyof typeof config.featureFlags;

export const FEATURE_FLAG_KEYS: FeatureFlagKey[] = Object.keys(config.featureFlags) as FeatureFlagKey[];

const runtimeOverrides: Partial<Record<FeatureFlagKey, boolean>> = {};

// Note: read through a function so runtime toggles are honored by callers.
export function getFeatureFlag(key: FeatureFlagKey): boolean {
  if (key in runtimeOverrides) return runtimeOverrides[key]!;
  return config.featureFlags[key];
}

export function setFeatureFlag(key: FeatureFlagKey, value: boolean): boolean {
  runtimeOverrides[key] = value;
  return value;
}

export function resetFeatureFlags(): void {
  for (const k of FEATURE_FLAG_KEYS) {
    delete runtimeOverrides[k];
  }
}

export function getAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  const out = {} as Record<FeatureFlagKey, boolean>;
  for (const k of FEATURE_FLAG_KEYS) out[k] = getFeatureFlag(k);
  return out;
}

// Fast evaluator that respects flags in calling code paths (matching, calls,
// gifts, creator features, etc.). Keep call sites cheap and consistent.
export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return getFeatureFlag(key);
}
