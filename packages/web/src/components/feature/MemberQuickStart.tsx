"use client";

import { Link } from "react-router-dom";
import { Inbox, Lightbulb, UserCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MEMBER_CARDS = [
  {
    href: "/sr",
    icon: Inbox,
    title: "첫 SR 처리하기",
    description: "고객 서비스 요청(SR)을 접수하면 AI가 자동으로 분류해요.",
    cta: "SR 관리로 이동",
  },
  {
    href: "/ax-bd/ideas",
    icon: Lightbulb,
    title: "아이디어 등록하기",
    description: "사업 아이디어를 등록하고 Discovery 프로세스를 시작하세요.",
    cta: "아이디어 목록으로 이동",
  },
  {
    href: "/settings",
    icon: UserCircle,
    title: "내 프로필 설정",
    description: "이름, 알림 설정 등 개인 정보를 업데이트하세요.",
    cta: "프로필 설정으로 이동",
  },
] as const;

export default function MemberQuickStart() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">시작하기</h3>
        <p className="text-sm text-muted-foreground">
          첫 업무를 시작해보세요. 아래 가이드를 따라하면 쉽게 익힐 수 있어요.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {MEMBER_CARDS.map((card) => (
          <Card key={card.href} className="group hover:border-primary/40 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <card.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{card.title}</CardTitle>
              </div>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                to={card.href}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 h-7 text-[0.8rem] font-medium hover:bg-muted hover:text-foreground transition-all"
              >
                {card.cta}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
