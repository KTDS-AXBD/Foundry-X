"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "1031483998824-at4tpreaq2b6b1meh3eli23ttt4cq3dn.apps.googleusercontent.com";

/* ── Google Identity Services (GIS) — SDK 직접 로드 ─────── */
function useGoogleIdentity(onCredential: (credential: string) => void) {
  const btnRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res: { credential: string }) =>
          callbackRef.current(res.credential),
      });
      if (btnRef.current) {
        window.google?.accounts.id.renderButton(btnRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "signin_with",
          shape: "pill",
          width: 340,
        });
      }
    };
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  return btnRef;
}

/* ── Logo mark ─────────────────────────────────────────── */
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

/* ── Page ───────────────────────────────────────────────── */
type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, googleLogin, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("login");

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError(null);
      try {
        await googleLogin(credential);
        router.push("/dashboard");
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [googleLogin, router],
  );

  const googleBtnRef = useGoogleIdentity(handleGoogleCredential);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      if (mode === "login") {
        await login(fd.get("email") as string, fd.get("password") as string);
      } else {
        await signup(
          fd.get("email") as string,
          fd.get("name") as string,
          fd.get("password") as string,
        );
      }
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: "var(--axis-color-gray-950, hsl(var(--background)))" }}
    >
      {/* ── Ambient grid ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.03,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* ── Glow orbs ── */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[160px]"
        style={{ background: "var(--axis-color-blue-600, hsl(var(--primary)))", opacity: 0.08 }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full blur-[140px]"
        style={{ background: "var(--axis-color-blue-400, hsl(var(--primary)))", opacity: 0.04 }}
      />

      {/* ── Login card ── */}
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

        <Card className="border-border/30 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <CardHeader className="pb-4">
            {/* Error alert */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200"
                style={{
                  background: "color-mix(in oklch, var(--axis-color-red-500) 8%, transparent)",
                  border: "1px solid color-mix(in oklch, var(--axis-color-red-500) 20%, transparent)",
                  color: "var(--axis-color-red-400)",
                }}
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.75a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zM8 11a1 1 0 110 2 1 1 0 010-2z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Google Sign-In (GIS SDK — 환경변수 불필요) */}
            <div className="flex justify-center">
              <div ref={googleBtnRef} className="min-h-[44px]" />
            </div>

            {/* Divider */}
            <div className="relative">
              <Separator className="opacity-50" />
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[11px] font-medium uppercase tracking-[0.15em]"
                style={{ color: "var(--axis-color-gray-500, hsl(var(--muted-foreground)))" }}
              >
                or
              </span>
            </div>

            {/* Mode toggle */}
            <div
              className="flex rounded-lg p-1"
              style={{ background: "var(--axis-color-gray-800, hsl(var(--muted) / 0.5))" }}
            >
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); }}
                  className="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200"
                  style={
                    mode === m
                      ? { background: "var(--axis-color-gray-700, hsl(var(--background)))", color: "var(--axis-color-white, hsl(var(--foreground)))", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }
                      : { color: "var(--axis-color-gray-400, hsl(var(--muted-foreground)))" }
                  }
                >
                  {m === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Label htmlFor="name" className="text-xs">이름</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="홍길동"
                    required
                    className="h-10"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">이메일</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">
                  비밀번호{mode === "signup" ? " (8자 이상)" : ""}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  minLength={mode === "signup" ? 8 : undefined}
                  required
                  className="h-10"
                />
              </div>
              <Button
                type="submit"
                className="h-10 w-full font-medium"
                disabled={isLoading}
              >
                {isLoading
                  ? mode === "login" ? "로그인 중..." : "가입 중..."
                  : mode === "login" ? "로그인" : "가입하기"}
              </Button>
            </form>
          </CardContent>
        </Card>

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

/* ── GIS type declaration ── */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            el: HTMLElement,
            config: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}
