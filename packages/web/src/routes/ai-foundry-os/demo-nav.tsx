// AI Foundry OS — 공통 시연 네비게이션 바
import { useLocation, useNavigate } from "react-router-dom";
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
  const current = location.pathname;

  return (
    <nav style={{
      display: "flex", alignItems: "center", gap: 2,
      background: fos.surface.hull, borderBottom: `1px solid ${fos.border.subtle}`,
      padding: "0 32px", height: 42, fontFamily: fonts.body,
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: fos.text.muted,
        letterSpacing: 1, textTransform: "uppercase", marginRight: 16,
      }}>DEMO</span>

      {NAV_ITEMS.map((item) => {
        const isActive = item.path === "/ai-foundry-os"
          ? current === "/ai-foundry-os"
          : current.startsWith(item.path);
        const isExternal = "external" in item;

        if (isExternal) {
          return (
            <a
              key={item.path}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                textDecoration: "none", cursor: "pointer", transition: "all 0.15s",
                background: "transparent",
                color: fos.text.muted,
                border: "none",
              }}
              onMouseEnter={e => { (e.currentTarget).style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; }}
            >
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              {item.label}
              <span style={{ fontSize: 9, opacity: 0.5 }}>↗</span>
            </a>
          );
        }

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: isActive ? 700 : 500,
              cursor: "pointer", transition: "all 0.15s", border: "none",
              fontFamily: "inherit",
              background: isActive ? "rgba(0,230,118,0.08)" : "transparent",
              color: isActive ? fos.status.ok : fos.text.muted,
              borderBottom: isActive ? "none" : "none",
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget).style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget).style.background = "transparent"; }}
          >
            <span style={{ fontSize: 13 }}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
