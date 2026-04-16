// AI Foundry OS — 공통 시연 네비게이션 바 + 테마 토글
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@axis-ds/theme";
import { useEffect, useState } from "react";
import { fos, fonts } from "./tokens";

const NAV_ITEMS = [
  { path: "/ai-foundry-os", label: "AI Foundry OS", icon: "🏠" },
  { path: "/ai-foundry-os/demo/lpon", label: "LPON 반제품", icon: "🏪" },
  { path: "/ai-foundry-os/ontology", label: "KG 뷰어", icon: "🕸️" },
  { path: "/ai-foundry-os/harness", label: "Harness", icon: "🔧" },
  { path: "/demo/slides.html", label: "시연 슬라이드", icon: "📊", external: true },
] as const;

export function DemoNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = location.pathname;
  const isDark = resolvedTheme === "dark";

  return (
    <nav style={{
      display: "flex", alignItems: "center", gap: 2,
      background: fos.surface.hull, borderBottom: `1px solid ${fos.border.subtle}`,
      padding: "0 32px", height: 42, fontFamily: fonts.body,
      position: "sticky", top: 0, zIndex: 50,
      transition: "background 0.3s, border-color 0.3s",
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: fos.text.dim,
        letterSpacing: 1, textTransform: "uppercase", marginRight: 16,
      }}>DEMO</span>

      {NAV_ITEMS.map((item) => {
        const isActive = item.path === "/ai-foundry-os"
          ? current === "/ai-foundry-os"
          : current.startsWith(item.path);
        const isExternal = "external" in item;

        const baseStyle: React.CSSProperties = {
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 14px", borderRadius: 6, fontSize: 12,
          cursor: "pointer", transition: "all 0.15s",
          border: "none", fontFamily: "inherit", textDecoration: "none",
          fontWeight: isActive ? 700 : 500,
          background: isActive ? "var(--fos-accent-control-soft)" : "transparent",
          color: isActive ? fos.status.ok : fos.text.muted,
        };

        if (isExternal) {
          return (
            <a key={item.path} href={item.path} target="_blank" rel="noopener noreferrer"
              style={baseStyle}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = fos.surface.panelHi; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              {item.label}
              <span style={{ fontSize: 9, opacity: 0.5 }}>↗</span>
            </a>
          );
        }

        return (
          <button key={item.path} onClick={() => navigate(item.path)}
            style={baseStyle}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = fos.surface.panelHi; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: 13 }}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}

      {/* Theme Toggle */}
      <div style={{ marginLeft: "auto" }}>
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title="테마 전환 (라이트/다크)"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: fos.surface.panelHi, border: `1px solid ${fos.border.subtle}`,
              borderRadius: 20, padding: "4px 12px", cursor: "pointer",
              fontSize: 11, color: fos.text.muted, fontFamily: "inherit",
              transition: "all 0.3s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = fos.border.strong; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = fos.border.subtle; }}
          >
            <span style={{ fontSize: 14 }}>{isDark ? "◑" : "◐"}</span>
            {isDark ? "Dark" : "Light"}
          </button>
        )}
      </div>
    </nav>
  );
}
