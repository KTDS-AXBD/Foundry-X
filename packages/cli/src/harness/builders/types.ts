import type { RepoProfile } from '@foundry-x/shared';

/** Builder 함수 시그니처: RepoProfile → 완성된 Markdown 문자열 */
export type HarnessBuilder = (profile: RepoProfile) => string;
