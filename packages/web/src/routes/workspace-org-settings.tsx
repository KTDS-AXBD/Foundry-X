"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrgStore } from "@/lib/stores/org-store";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

export function Component() {
  const { activeOrgId, orgs } = useOrgStore();
  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  const [name, setName] = useState(activeOrg?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  async function handleSave() {
    if (!activeOrgId || !name.trim()) return;
    setSaving(true);
    try {
      const token = getToken();
      await fetch(`${BASE_URL}/orgs/${activeOrgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: name.trim() }),
      });
      window.location.reload();
    } catch {
      // error
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      const token = getToken();
      await fetch(`${BASE_URL}/orgs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: newOrgName.trim() }),
      });
      setNewOrgName("");
      window.location.reload();
    } catch {
      // error
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Organization Settings</h1>

      {activeOrg ? (
        <div className="space-y-6">
          {/* General */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <h2 className="text-lg font-semibold">General</h2>
              <div>
                <label className="text-sm font-medium">Organization Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Slug</label>
                <p className="mt-1 text-sm text-muted-foreground">{activeOrg.slug}</p>
              </div>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Plan */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-2 text-lg font-semibold">Plan</h2>
              <Badge variant="secondary" className="uppercase">{activeOrg.plan}</Badge>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No organization selected.</p>
      )}

      {/* Create New Org */}
      <Card className="mt-8">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-lg font-semibold">Create New Organization</h2>
          <div className="flex gap-2">
            <input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Organization name"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={creating} size="sm">
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
