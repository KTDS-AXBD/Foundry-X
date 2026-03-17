import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foundry-X Dashboard",
  description:
    "Foundry-X: 사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/wiki", label: "Wiki" },
  { href: "/architecture", label: "Architecture" },
  { href: "/workspace", label: "Workspace" },
  { href: "/agents", label: "Agents" },
  { href: "/tokens", label: "Tokens" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <nav>
          <ul style={{ display: "flex", gap: "1rem", listStyle: "none", padding: "1rem" }}>
            {navItems.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <main style={{ padding: "1rem" }}>{children}</main>
      </body>
    </html>
  );
}
