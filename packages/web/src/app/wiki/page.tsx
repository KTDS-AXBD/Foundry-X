"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api-client";
import type { WikiPage as WikiPageType } from "@foundry-x/shared";
import MarkdownViewer from "../../components/feature/MarkdownViewer";

const colors = {
  bg: "#0a0a0a",
  text: "#ededed",
  card: "#1a1a1a",
  border: "#333",
  accent: "#3b82f6",
  muted: "#888",
  red: "#ef4444",
};

export default function WikiPageView() {
  const [pages, setPages] = useState<WikiPageType[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<WikiPageType[]>("/wiki")
      .then((data) => {
        setPages(data);
        if (data.length > 0) setSelected(data[0].slug);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const activePage = pages.find((p) => p.slug === selected);

  if (loading) {
    return <p style={{ color: colors.muted }}>Loading wiki...</p>;
  }

  if (error) {
    return <p style={{ color: colors.red }}>{error}</p>;
  }

  return (
    <div style={{ color: colors.text }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Wiki</h1>

      <div style={{ display: "flex", gap: 16, minHeight: "70vh" }}>
        {/* Left: document list */}
        <nav
          style={{
            width: 260,
            flexShrink: 0,
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: 12,
            overflowY: "auto",
          }}
        >
          {pages.length === 0 ? (
            <p style={{ color: colors.muted, fontSize: 13 }}>
              No documents found
            </p>
          ) : (
            pages.map((page) => (
              <button
                key={page.slug}
                onClick={() => setSelected(page.slug)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background:
                    selected === page.slug ? colors.accent : "transparent",
                  color:
                    selected === page.slug ? "#fff" : colors.text,
                  border: "none",
                  borderRadius: 4,
                  padding: "8px 12px",
                  marginBottom: 4,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                <div style={{ fontWeight: 500 }}>{page.title}</div>
                <div
                  style={{
                    fontSize: 11,
                    color:
                      selected === page.slug ? "rgba(255,255,255,0.7)" : colors.muted,
                    marginTop: 2,
                  }}
                >
                  {page.author} &middot; {page.lastModified}
                </div>
              </button>
            ))
          )}
        </nav>

        {/* Right: document content */}
        <div
          style={{
            flex: 1,
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: 24,
            overflowY: "auto",
          }}
        >
          {activePage ? (
            <>
              <h2
                style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}
              >
                {activePage.title}
              </h2>
              <MarkdownViewer
                content={activePage.content}
                filePath={activePage.filePath}
                author={activePage.author}
                lastModified={activePage.lastModified}
              />
            </>
          ) : (
            <p style={{ color: colors.muted }}>Select a document</p>
          )}
        </div>
      </div>
    </div>
  );
}
