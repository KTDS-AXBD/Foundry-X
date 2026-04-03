"use client";

import { Link } from "react-router-dom";
import { Users, FolderKanban, Bot } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ADMIN_CARDS = [
  {
    href: "/settings",
    icon: Users,
    title: "팀 멤버 관리",
    description: "멤버 초대, 역할 변경, 접근 권한을 설정하세요.",
    cta: "멤버 관리로 이동",
  },
  {
    href: "/gtm/projects",
    icon: FolderKanban,
    title: "프로젝트 설정",
    description: "새 프로젝트를 생성하고 리포지토리를 연결하세요.",
    cta: "프로젝트 목록으로 이동",
  },
  {
    href: "/agents",
    icon: Bot,
    title: "에이전트 구성",
    description: "팀 에이전트를 커스터마이징하고 워크플로우를 자동화하세요.",
    cta: "에이전트 목록으로 이동",
  },
] as const;

export default function AdminQuickGuide() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">관리자 퀵가이드</h3>
        <p className="text-sm text-muted-foreground">
          팀 운영에 필요한 핵심 설정을 먼저 완료하세요.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {ADMIN_CARDS.map((card) => (
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
