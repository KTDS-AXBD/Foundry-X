/**
 * Test file for @foundry-x review E2E verification.
 * This file will be deleted after testing.
 */
export function greetAgent(name: string): string {
  return `Hello, ${name}! Welcome to Foundry-X.`;
}

export function calculateScore(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
