import type { ErrorHandler } from "hono";

export class HarnessError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "HarnessError";
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HarnessError) {
    return c.json(
      { error: err.message, code: err.code },
      err.statusCode as 400,
    );
  }
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
};
