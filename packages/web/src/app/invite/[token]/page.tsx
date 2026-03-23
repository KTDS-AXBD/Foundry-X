"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getInvitationInfo, type InvitationInfo } from "@/lib/api-client";
import { InviteForm } from "@/components/feature/InviteForm";

/* ── Logo mark (login 페이지와 동일) ── */
function LogoMark() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-10 w-10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2" y="2" width="28" height="28" rx="8"
        className="fill-primary/10 stroke-primary/40"
        strokeWidth="1.5"
      />
      <path
        d="M10 11h12M10 16h8M10 21h10"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="21" r="2.5" className="fill-primary animate-pulse" />
    </svg>
  );
}

type PageState = "loading" | "valid" | "expired" | "already_accepted" | "not_found";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [state, setState] = useState<PageState>("loading");
  const [info, setInfo] = useState<InvitationInfo | null>(null);

  useEffect(() => {
    if (!token) return;
    getInvitationInfo(token)
      .then((data) => {
        setInfo(data);
        if (data.valid) {
          setState("valid");
        } else if (data.reason === "expired") {
          setState("expired");
        } else if (data.reason === "already_accepted") {
          setState("already_accepted");
        } else {
          setState("not_found");
        }
      })
      .catch(() => {
        setState("not_found");
      });
  }, [token]);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: "var(--axis-color-gray-950, hsl(var(--background)))" }}
    >
      {/* Ambient grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.03,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Glow orbs */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[160px]"
        style={{ background: "var(--axis-color-blue-600, hsl(var(--primary)))", opacity: 0.08 }}
      />

      <div className="relative z-10 w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-6 duration-700">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <LogoMark />
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Foundry<span style={{ color: "var(--axis-color-blue-500, hsl(var(--primary)))" }}>-X</span>
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--axis-color-gray-400, hsl(var(--muted-foreground)))" }}>
              AI 에이전트 오케스트레이션 플랫폼
            </p>
          </div>
        </div>

        {/* Loading */}
        {state === "loading" && (
          <Card className="border-border/30 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <CardContent className="space-y-4 py-8">
              <Skeleton className="mx-auto h-6 w-48" />
              <Skeleton className="mx-auto h-4 w-64" />
              <Skeleton className="mx-auto h-10 w-full" />
              <Skeleton className="mx-auto h-10 w-full" />
            </CardContent>
          </Card>
        )}

        {/* Valid invitation */}
        {state === "valid" && info && (
          <InviteForm
            email={info.email ?? ""}
            orgName={info.orgName ?? ""}
            role={info.role ?? "member"}
            token={token}
          />
        )}

        {/* Expired */}
        {state === "expired" && (
          <Card className="border-border/30 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-2 text-4xl">⏰</div>
              <h2 className="text-lg font-semibold">초대가 만료됐어요</h2>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                관리자에게 새 초대를 요청해주세요.
              </p>
              <Link
                href="/login"
                className="text-sm font-medium text-primary hover:underline"
              >
                로그인 페이지로 이동
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Already accepted */}
        {state === "already_accepted" && (
          <Card className="border-border/30 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-2 text-4xl">✅</div>
              <h2 className="text-lg font-semibold">이미 합류한 초대예요</h2>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                이미 이 초대를 수락했어요.
              </p>
              <Link
                href="/login"
                className="text-sm font-medium text-primary hover:underline"
              >
                로그인하기 →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Not found */}
        {state === "not_found" && (
          <Card className="border-border/30 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-2 text-4xl">❌</div>
              <h2 className="text-lg font-semibold">초대를 찾을 수 없어요</h2>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                올바른 링크인지 확인해주세요.
              </p>
              <Link
                href="/login"
                className="text-sm font-medium text-primary hover:underline"
              >
                로그인 페이지로 이동
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p
          className="mt-6 text-center text-[11px]"
          style={{ color: "var(--axis-color-gray-600, hsl(var(--muted-foreground) / 0.5))" }}
        >
          Foundry-X v2 &middot; Powered by AXIS Design System
        </p>
      </div>
    </div>
  );
}
