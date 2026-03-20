"use client";

import { useEffect } from "react";
import { Building2, ChevronDown, Plus } from "lucide-react";
import { useOrgStore } from "@/lib/stores/org-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function OrgSwitcher() {
  const { activeOrgId, orgs, isLoading, fetchOrgs, switchOrg } = useOrgStore();

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  if (isLoading) {
    return (
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
        <Building2 className="size-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (orgs.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="mb-2 w-full justify-between text-left"
          size="sm"
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="size-4 shrink-0" />
            <span className="truncate text-sm">{activeOrg?.name ?? "Select org"}</span>
          </span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => {
              if (org.id !== activeOrgId) switchOrg(org.id);
            }}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {org.id === activeOrgId && (
                <span className="size-1.5 rounded-full bg-primary" />
              )}
              <span className={org.id === activeOrgId ? "font-medium" : ""}>
                {org.name}
              </span>
            </span>
            {org.plan !== "free" && (
              <Badge variant="secondary" className="ml-2 text-[10px] uppercase">
                {org.plan}
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link href="/workspace/org/settings" className="flex items-center gap-2">
            <Plus className="size-3.5" />
            <span>Create Organization</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
