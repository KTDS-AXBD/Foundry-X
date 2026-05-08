import { Link } from "react-router-dom";
import { Anvil } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Agents", href: "/agents" },
    { label: "Architecture", href: "/architecture" },
    { label: "Wiki", href: "/wiki" },
  ],
  Ecosystem: [
    { label: "AI Foundry", href: "https://github.com/IDEA-on-Action/AI-Foundry" },
    { label: "AXIS Design System", href: "https://github.com/IDEA-on-Action/AXIS-Design-System" },
    { label: "Discovery-X", href: "https://dx.minu.best" },
  ],
  Community: [
    { label: "GitHub", href: "https://github.com/KTDS-AXBD/Foundry-X" },
    { label: "npm", href: "https://www.npmjs.com/package/foundry-x" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-current/20">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="mb-4 flex items-center gap-2.5">
              <div className="bp-box flex size-8 items-center justify-center rounded-lg">
                <Anvil className="size-4 bp-line" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">
                Foundry-X
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              AI 에이전트가 일하는 방식을 설계하는 곳.
              <br />
              사업기회부터 데모까지, 한 곳에서.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                {category}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:bp-line"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-current/20 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} KTDS AX BD. All rights reserved.
          </p>
          <p className="font-mono text-xs text-muted-foreground/60">
            Sprint 368 &middot; Phase 47
          </p>
        </div>
      </div>
    </footer>
  );
}
