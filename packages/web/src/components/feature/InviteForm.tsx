"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { setupPassword, googleLoginWithInvitation, ApiError } from "@/lib/api-client";

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "1031483998824-at4tpreaq2b6b1meh3eli23ttt4cq3dn.apps.googleusercontent.com";

interface InviteFormProps {
  email: string;
  orgName: string;
  role: string;
  token: string;
}

/* ── Google GIS hook (login 페이지 패턴 재사용) ── */
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
          text: "signup_with",
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

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  member: "멤버",
  viewer: "뷰어",
};

export function InviteForm({ email, orgName, role, token }: InviteFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError(null);
      setLoading(true);
      try {
        const data = await googleLoginWithInvitation(credential, token);
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/getting-started");
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setError("이미 계정이 있어요. 로그인 후 초대를 수락하세요.");
        } else {
          setError((err as Error).message);
        }
        setLoading(false);
      }
    },
    [token, router],
  );

  const googleBtnRef = useGoogleIdentity(handleGoogleCredential);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 해요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }

    setLoading(true);
    try {
      const data = await setupPassword({ token, name, password });
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      router.push("/getting-started");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("이미 계정이 있어요. 로그인 후 초대를 수락하세요.");
      } else if (err instanceof ApiError && err.status === 410) {
        setError("초대가 만료됐어요. 관리자에게 새 초대를 요청해주세요.");
      } else {
        setError((err as Error).message);
      }
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/30 bg-card/80 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <CardHeader className="pb-4 text-center">
        <h2 className="text-lg font-semibold">
          {orgName}에 초대받았어요!
        </h2>
        <p className="text-sm text-muted-foreground">{email}</p>
        <div className="flex justify-center">
          <Badge variant="secondary" className="mt-1">
            역할: {ROLE_LABELS[role] ?? role}
          </Badge>
        </div>

        {error && (
          <div
            className="mt-3 flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-left text-sm animate-in fade-in slide-in-from-top-2 duration-200"
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
        {/* Google Sign-In */}
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
            또는
          </span>
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name" className="text-xs">이름</Label>
            <Input
              id="invite-name"
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-password" className="text-xs">비밀번호 (8자 이상)</Label>
            <Input
              id="invite-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-password-confirm" className="text-xs">비밀번호 확인</Label>
            <Input
              id="invite-password-confirm"
              type="password"
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              minLength={8}
              required
              className="h-10"
            />
          </div>
          <Button
            type="submit"
            className="h-10 w-full font-medium"
            disabled={loading}
          >
            {loading ? "처리 중..." : "시작하기"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            로그인 →
          </Link>
        </p>
      </CardContent>
    </Card>
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
