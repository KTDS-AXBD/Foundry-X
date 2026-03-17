"use client";

import type { HarnessIntegrity } from "@foundry-x/shared";
import { cn } from "@/lib/utils";

export interface HarnessHealthProps {
  data: HarnessIntegrity;
}

export default function HarnessHealth({ data }: HarnessHealthProps) {
  const passed = data.passed;

  return (
    <>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-5xl font-bold",
            passed ? "text-green-500" : "text-destructive",
          )}
        >
          {data.score}%
        </span>
        <span
          className={cn(
            "text-sm font-medium",
            passed ? "text-green-500" : "text-destructive",
          )}
        >
          {passed ? "PASSED" : "FAILED"}
        </span>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        {data.checks.length} checks executed
      </div>
      <div className="mt-3 text-sm">
        {data.checks.map((ck) => (
          <div
            key={ck.name}
            className="flex justify-between border-b border-border py-1"
          >
            <span className="text-foreground">{ck.name}</span>
            <span
              className={cn(
                "font-semibold",
                ck.level === "PASS"
                  ? "text-green-500"
                  : ck.level === "WARN"
                    ? "text-yellow-500"
                    : "text-destructive",
              )}
            >
              {ck.level}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
