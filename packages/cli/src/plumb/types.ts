/**
 * Local types that are NOT in @foundry-x/shared.
 * Bridge-internal configuration only.
 */

export interface PlumbBridgeConfig {
  pythonPath?: string;
  timeout?: number;
  cwd?: string;
}
