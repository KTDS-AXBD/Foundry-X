/**
 * localStorage 기반 Feature Flag 유틸.
 * 초기 팀 배포 시 특정 기능을 토글할 수 있도록 지원.
 */

const STORAGE_KEY = "fx-feature-flags";

const DEFAULT_FLAGS: Record<string, boolean> = {
  "discovery-wizard": true,
  "help-agent": true,
  "discovery-tour": true,
  "hitl-panel": true,
};

export function getFeatureFlags(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
    }
  } catch {
    // fall through
  }
  return { ...DEFAULT_FLAGS };
}

export function isFeatureEnabled(flag: string): boolean {
  return getFeatureFlags()[flag] ?? false;
}

export function setFeatureFlag(flag: string, enabled: boolean): void {
  const current = getFeatureFlags();
  current[flag] = enabled;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}
