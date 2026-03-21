"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItemData {
  value: string;
  trigger: React.ReactNode;
  content: React.ReactNode;
}

function Accordion({
  items,
  type = "single",
  className,
}: {
  items: AccordionItemData[];
  type?: "single" | "multiple";
  className?: string;
}) {
  const [openValues, setOpenValues] = React.useState<Set<string>>(new Set());

  const toggle = (value: string) => {
    setOpenValues((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (type === "single") {
          next.clear();
        }
        next.add(value);
      }
      return next;
    });
  };

  return (
    <div className={cn("divide-y divide-border rounded-lg border", className)}>
      {items.map((item) => {
        const isOpen = openValues.has(item.value);
        return (
          <div key={item.value}>
            <button
              type="button"
              onClick={() => toggle(item.value)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50"
            >
              {item.trigger}
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-3 text-sm text-muted-foreground">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { Accordion };
export type { AccordionItemData };
