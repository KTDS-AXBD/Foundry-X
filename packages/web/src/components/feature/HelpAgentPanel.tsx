"use client";

/**
 * Sprint 100: F269 — HelpAgent 사이드 패널 래퍼
 * 사이드바 하단 아이콘으로 열고 닫는 Sheet 사이드 패널
 */
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useHelpAgentStore } from "@/lib/stores/help-agent-store";
import HelpAgentChat from "@/components/feature/discovery/HelpAgentChat";

export function HelpAgentPanel() {
  const { isOpen, toggle } = useHelpAgentStore();

  return (
    <>
      {/* 트리거 버튼 — 우하단 고정, FeedbackWidget보다 위 */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggle}
        className="fixed bottom-20 right-5 z-50 h-12 w-12 rounded-full border-indigo-200 bg-background shadow-lg hover:border-indigo-400 hover:bg-indigo-50"
        aria-label="Help Agent 열기"
      >
        <Sparkles className="h-5 w-5 text-indigo-600" />
      </Button>

      {/* Sheet 사이드 패널 */}
      <Sheet open={isOpen} onOpenChange={toggle}>
        <SheetContent side="right" className="w-[400px] p-0 sm:max-w-[400px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Help Agent</SheetTitle>
          </SheetHeader>
          <HelpAgentChat />
        </SheetContent>
      </Sheet>
    </>
  );
}
