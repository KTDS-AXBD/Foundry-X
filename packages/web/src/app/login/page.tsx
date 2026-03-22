"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await login(form.get("email") as string, form.get("password") as string);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await signup(
        form.get("email") as string,
        form.get("name") as string,
        form.get("password") as string,
      );
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold">Foundry-X</CardTitle>
          <p className="text-sm text-muted-foreground">
            사람과 AI가 함께 만드는 곳
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Tabs defaultValue="login">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="login" className="flex-1">로그인</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <Input name="email" type="email" placeholder="이메일" required />
                <Input name="password" type="password" placeholder="비밀번호" required />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "로그인 중..." : "로그인"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="flex flex-col gap-3">
                <Input name="name" type="text" placeholder="이름" required />
                <Input name="email" type="email" placeholder="이메일" required />
                <Input name="password" type="password" placeholder="비밀번호 (8자 이상)" minLength={8} required />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "가입 중..." : "가입하기"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
