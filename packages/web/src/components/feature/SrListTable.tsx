"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SrItem } from "@/lib/api-client";

const SR_TYPES = ["", "code_change", "bug_fix", "env_config", "doc_update", "security_patch"] as const;
const SR_STATUSES = ["", "open", "classified", "in_progress", "review", "done", "rejected"] as const;
const SR_PRIORITIES = ["", "high", "medium", "low"] as const;

interface SrFilters {
  sr_type: string;
  status: string;
  priority: string;
}

interface SrListTableProps {
  items: SrItem[];
  filters: SrFilters;
  onFilterChange: (filters: SrFilters) => void;
  total: number;
  offset: number;
  limit: number;
  onPageChange: (offset: number) => void;
}

function formatType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SrListTable({
  items,
  filters,
  onFilterChange,
  total,
  offset,
  limit,
  onPageChange,
}: SrListTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.sr_type}
          onChange={(e) => onFilterChange({ ...filters, sr_type: e.target.value })}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          aria-label="Filter by type"
        >
          {SR_TYPES.map((t) => (
            <option key={t} value={t}>{t ? formatType(t) : "All Types"}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          aria-label="Filter by status"
        >
          {SR_STATUSES.map((s) => (
            <option key={s} value={s}>{s ? formatType(s) : "All Statuses"}</option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => onFilterChange({ ...filters, priority: e.target.value })}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          aria-label="Filter by priority"
        >
          {SR_PRIORITIES.map((p) => (
            <option key={p} value={p}>{p ? formatType(p) : "All Priorities"}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No SRs found
                </TableCell>
              </TableRow>
            ) : (
              items.map((sr) => (
                <TableRow key={sr.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/sr/${sr.id}`} className="font-medium hover:underline">
                      {sr.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{formatType(sr.sr_type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {(sr.confidence * 100).toFixed(0)}%
                      {sr.confidence < 0.7 && (
                        <Badge variant="outline" className="text-xs text-yellow-600 dark:text-yellow-400 border-yellow-400">
                          LLM 폴백
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sr.status === "done" ? "default" : "secondary"}>
                      {formatType(sr.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={
                      sr.priority === "high" ? "text-destructive font-medium" :
                      sr.priority === "low" ? "text-muted-foreground" : ""
                    }>
                      {formatType(sr.priority)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(sr.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => onPageChange(Math.max(0, offset - limit))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + limit >= total}
              onClick={() => onPageChange(offset + limit)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
