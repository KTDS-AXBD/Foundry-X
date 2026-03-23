"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface InviteLinkCopyProps {
  token: string;
}

export function InviteLinkCopy({ token }: InviteLinkCopyProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite?token=${token}`
      : `/invite?token=${token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-400">
        <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.22 5.28a.75.75 0 10-1.06-1.06L7 8.38 5.84 7.22a.75.75 0 00-1.06 1.06l1.75 1.75a.75.75 0 001.06 0l3.63-3.75z" />
        </svg>
        초대 링크가 생성됐어요!
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">
          {inviteUrl}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? "복사됨!" : "📋 복사"}
        </Button>
      </div>
    </div>
  );
}
