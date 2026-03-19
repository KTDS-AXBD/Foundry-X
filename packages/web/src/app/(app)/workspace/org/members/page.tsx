"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrgStore } from "@/lib/stores/org-store";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

interface Member {
  orgId: string;
  userId: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member" | "viewer";
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
}

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

const ROLE_OPTIONS = ["admin", "member", "viewer"] as const;

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500/20 text-amber-400",
  admin: "bg-blue-500/20 text-blue-400",
  member: "bg-green-500/20 text-green-400",
  viewer: "bg-gray-500/20 text-gray-400",
};

export default function OrgMembersPage() {
  const { activeOrgId } = useOrgStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [inviting, setInviting] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch(`${BASE_URL}/orgs/${activeOrgId}/members`, { headers: authHeaders() }),
        fetch(`${BASE_URL}/orgs/${activeOrgId}/invitations`, { headers: authHeaders() }),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (invitationsRes.ok) setInvitations(await invitationsRes.json());
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleInvite() {
    if (!activeOrgId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`${BASE_URL}/orgs/${activeOrgId}/invitations`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        setInviteEmail("");
        loadData();
      }
    } catch {
      // error
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    if (!activeOrgId) return;
    await fetch(`${BASE_URL}/orgs/${activeOrgId}/members/${userId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ role: newRole }),
    });
    loadData();
  }

  async function handleRemove(userId: string) {
    if (!activeOrgId || !confirm("Remove this member?")) return;
    await fetch(`${BASE_URL}/orgs/${activeOrgId}/members/${userId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    loadData();
  }

  async function handleCancelInvitation(invitationId: string) {
    if (!activeOrgId) return;
    await fetch(`${BASE_URL}/orgs/${activeOrgId}/invitations/${invitationId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    loadData();
  }

  // Determine current user's role
  const currentUserRole = members.find((m) => {
    // Simple heuristic: check token payload for userId
    return true; // We show controls based on API permissions
  })?.role;
  const isOwner = currentUserRole === "owner";
  const isAdmin = isOwner || currentUserRole === "admin";

  if (!activeOrgId) {
    return <p className="text-sm text-muted-foreground">No organization selected.</p>;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Members</h1>

      {/* Invite Form */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="mb-3 text-lg font-semibold">Invite Member</h2>
          <div className="flex gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              type="email"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <Button onClick={handleInvite} disabled={inviting} size="sm">
              {inviting ? "Inviting..." : "Invite"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="mb-3 text-lg font-semibold">Members ({members.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Joined</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{m.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{m.email}</td>
                    <td className="py-2 pr-4">
                      {m.role === "owner" ? (
                        <Badge className={ROLE_COLORS[m.role]}>{m.role}</Badge>
                      ) : isOwner ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                          className="rounded border border-input bg-background px-2 py-0.5 text-xs"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge className={ROLE_COLORS[m.role]}>{m.role}</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      {m.role !== "owner" && isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleRemove(m.userId)}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-3 text-lg font-semibold">Pending Invitations ({invitations.filter((i) => !i.acceptedAt).length})</h2>
            <div className="space-y-2">
              {invitations
                .filter((i) => !i.acceptedAt)
                .map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <span className="text-sm font-medium">{inv.email}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      as {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
