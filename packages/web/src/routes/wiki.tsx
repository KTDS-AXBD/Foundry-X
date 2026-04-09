"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api-client";
import type { WikiPage as WikiPageType } from "@foundry-x/shared";
import { Card, CardContent } from "@/components/ui/card";
import MarkdownViewer from "@/components/feature/MarkdownViewer";
import { cn } from "@/lib/utils";

// Extract h2/h3 headings from markdown for Table of Contents
function extractHeadings(
  markdown: string,
): { id: string; text: string; level: 2 | 3 }[] {
  const lines = markdown.split("\n");
  const headings: { id: string; text: string; level: 2 | 3 }[] = [];
  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h2) {
      const text = h2[1].trim();
      headings.push({ id: text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""), text, level: 2 });
    } else if (h3) {
      const text = h3[1].trim();
      headings.push({ id: text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""), text, level: 3 });
    }
  }
  return headings;
}

// Skeleton for sidebar items
function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-10 rounded-md bg-muted" />
      ))}
    </div>
  );
}

// Skeleton for content area
function ContentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse p-6">
      <div className="h-7 w-2/3 rounded bg-muted" />
      <div className="h-4 w-1/3 rounded bg-muted" />
      <div className="mt-6 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-4 rounded bg-muted"
            style={{ width: `${70 + (i % 3) * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function Component() {
  const [pages, setPages] = useState<WikiPageType[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<WikiPageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    if (!selected) return;
    setContentLoading(true);
    fetchApi<WikiPageType>(`/wiki/${selected}`)
      .then((data) => {
        setActivePage(data);
        setContentLoading(false);
      })
      .catch(() => {
        setActivePage(pages.find((p) => p.slug === selected) ?? null);
        setContentLoading(false);
      });
  }, [selected, pages]);

  const headings = useMemo(
    () => (activePage?.content ? extractHeadings(activePage.content) : []),
    [activePage?.content],
  );

  const handleSelect = (slug: string) => {
    setSelected(slug);
    setSidebarOpen(false);
  };

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            Failed to load wiki
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Wiki</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Project documentation &amp; reference
            </p>
          </div>
          {/* Mobile sidebar toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted lg:hidden"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 4h12M2 8h12M2 12h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Pages
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-72 overflow-y-auto border-r border-border bg-background transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:translate-x-0 lg:transition-none xl:w-64",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="sticky top-0 border-b border-border bg-background px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Documents
            </p>
          </div>
          <nav className="p-2">
            {loading ? (
              <SidebarSkeleton />
            ) : pages.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                No documents found
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {pages.map((page) => {
                  const isActive = selected === page.slug;
                  return (
                    <button
                      key={page.slug}
                      type="button"
                      onClick={() => handleSelect(page.slug)}
                      className={cn(
                        "group w-full rounded-md px-3 py-2.5 text-left transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <div className="truncate text-sm font-medium leading-tight">
                        {page.title}
                      </div>
                      <div
                        className={cn(
                          "mt-1 truncate text-[11px] leading-tight",
                          isActive
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {[page.author, page.lastModified]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {contentLoading ? (
            <Card className="m-4 lg:m-6">
              <ContentSkeleton />
            </Card>
          ) : activePage ? (
            <div className="flex flex-1 gap-6 p-4 lg:p-6">
              {/* Article */}
              <article className="min-w-0 flex-1">
                <Card>
                  <CardContent className="p-6 lg:p-8">
                    {/* Document header */}
                    <header className="mb-6 border-b border-border pb-5">
                      <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {activePage.title}
                      </h2>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        {activePage.filePath && (
                          <span className="flex items-center gap-1">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M2 2h4l1.5 1.5H10v6.5H2V2z"
                                stroke="currentColor"
                                strokeWidth="1.1"
                                strokeLinejoin="round"
                                fill="none"
                              />
                            </svg>
                            <code className="font-mono text-[11px]">
                              {activePage.filePath}
                            </code>
                          </span>
                        )}
                        {activePage.author && (
                          <span className="flex items-center gap-1">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              aria-hidden="true"
                            >
                              <circle
                                cx="6"
                                cy="4"
                                r="2.5"
                                stroke="currentColor"
                                strokeWidth="1.1"
                              />
                              <path
                                d="M1 10.5c0-2.5 2.24-4 5-4s5 1.5 5 4"
                                stroke="currentColor"
                                strokeWidth="1.1"
                                strokeLinecap="round"
                              />
                            </svg>
                            {activePage.author}
                          </span>
                        )}
                        {activePage.lastModified && (
                          <span className="flex items-center gap-1">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              aria-hidden="true"
                            >
                              <circle
                                cx="6"
                                cy="6"
                                r="4.5"
                                stroke="currentColor"
                                strokeWidth="1.1"
                              />
                              <path
                                d="M6 3.5V6l1.5 1.5"
                                stroke="currentColor"
                                strokeWidth="1.1"
                                strokeLinecap="round"
                              />
                            </svg>
                            {activePage.lastModified}
                          </span>
                        )}
                      </div>
                    </header>

                    {/* Markdown content */}
                    <div className="max-w-3xl">
                      <MarkdownViewer content={activePage.content} />
                    </div>
                  </CardContent>
                </Card>
              </article>

              {/* Table of Contents — hidden on small screens */}
              {headings.length > 0 && (
                <aside className="hidden w-52 shrink-0 xl:block">
                  <div className="sticky top-6">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      On this page
                    </p>
                    <nav className="flex flex-col gap-0.5">
                      {headings.map((h) => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          className={cn(
                            "block truncate rounded px-2 py-1 text-xs transition-colors hover:text-foreground",
                            h.level === 2
                              ? "font-medium text-muted-foreground hover:bg-muted"
                              : "pl-4 text-muted-foreground/70 hover:bg-muted",
                          )}
                        >
                          {h.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                </aside>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mb-3 text-4xl">📄</div>
                <p className="font-medium text-muted-foreground">
                  Select a document to read
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
