"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import type { WikiPage as WikiPageType } from "@foundry-x/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MarkdownViewer from "@/components/feature/MarkdownViewer";
import { cn } from "@/lib/utils";

export function Component() {
  const [pages, setPages] = useState<WikiPageType[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<WikiPageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
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

  if (loading) {
    return <p className="text-muted-foreground">Loading wiki...</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Wiki</h1>

      <div className="flex min-h-[70vh] flex-col gap-4 lg:flex-row lg:gap-4">
        {/* Left: document list */}
        <Card className="w-full shrink-0 lg:w-64">
          <CardContent className="p-3">
            {pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents found</p>
            ) : (
              <nav className="flex flex-col gap-1">
                {pages.map((page) => (
                  <button
                    key={page.slug}
                    onClick={() => setSelected(page.slug)}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                      selected === page.slug
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <div className="font-medium">{page.title}</div>
                    <div
                      className={cn(
                        "mt-0.5 text-[11px]",
                        selected === page.slug
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {page.author} &middot; {page.lastModified}
                    </div>
                  </button>
                ))}
              </nav>
            )}
          </CardContent>
        </Card>

        {/* Right: document content */}
        <Card className="flex-1">
          <CardContent className="p-6">
            {contentLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : activePage ? (
              <>
                <h2 className="mb-1 text-xl font-semibold">
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
              <p className="text-muted-foreground">Select a document</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
