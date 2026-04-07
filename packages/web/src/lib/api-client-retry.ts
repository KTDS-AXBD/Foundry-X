/**
 * F449 — fetchWithRetry: 네트워크 에러 시 exponential backoff 재시도
 * - 4xx(ApiError status < 500)는 재시도 안 함
 * - backoff: baseDelayMs * 2^attempt (1s → 2s → 4s)
 */
import { ApiError } from "@/lib/api-client";

export async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetcher();
    } catch (err) {
      lastError = err;

      // 4xx 에러는 재시도하지 않음
      if (err instanceof ApiError && err.status < 500) {
        throw err;
      }

      // 마지막 시도였으면 throw
      if (attempt === maxRetries - 1) {
        break;
      }

      // exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
