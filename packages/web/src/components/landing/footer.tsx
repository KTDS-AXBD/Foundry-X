import Link from "next/link";
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
    { label: "Discovery-X", href: "#" },
  ],
  Community: [
    { label: "GitHub", href: "https://github.com/KTDS-AXBD/Foundry-X" },
    { label: "npm", href: "https://www.npmjs.com/package/foundry-x" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-axis-primary/10">
                <Anvil className="size-4 text-axis-primary" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">
                Foundry-X
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              사람과 AI가 함께 만드는 협업 플랫폼.
              <br />
              명세부터 배포까지, 한 곳에서.
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
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-axis-primary"
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
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} KTDS AX BD. All rights reserved.
          </p>
          <p className="font-mono text-xs text-muted-foreground/60">
            v1.3.0 &middot; Phase 3
          </p>
        </div>
      </div>
    </footer>
  );
}
