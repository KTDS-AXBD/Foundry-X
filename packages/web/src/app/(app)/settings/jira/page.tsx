"use client";

import { useEffect, useState } from "react";
import { getJiraProjects, updateJiraConfig, type JiraProject, type JiraConfig, ApiError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ORG_ID_KEY = "orgId";

function useOrgId(): string {
  const [orgId, setOrgId] = useState("");
  useEffect(() => {
    setOrgId(localStorage.getItem(ORG_ID_KEY) ?? "");
  }, []);
  return orgId;
}

export default function JiraSettingsPage() {
  const orgId = useOrgId();
  const [config, setConfig] = useState<JiraConfig>({
    api_url: "",
    email: "",
    api_token: "",
    project_key: "",
  });
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateJiraConfig(orgId, config);
      setMessage({ type: "success", text: "Jira 설정이 저장되었어요." });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!orgId) return;
    setTesting(true);
    setMessage(null);
    try {
      const result = await getJiraProjects(orgId);
      setProjects(result);
      setMessage({ type: "success", text: `연결 성공! ${result.length}개 프로젝트 발견.` });
    } catch (err) {
      setMessage({ type: "error", text: `연결 실패: ${(err as Error).message}` });
    } finally {
      setTesting(false);
    }
  };

  if (!orgId) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Jira Integration</h1>
        <p className="text-muted-foreground">Organization을 먼저 선택해주세요.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Jira Integration</h1>

      {/* Connection Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-primary">Connection Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Jira API URL</label>
              <input
                type="url"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="https://your-domain.atlassian.net"
                value={config.api_url}
                onChange={(e) => setConfig((c) => ({ ...c, api_url: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="you@company.com"
                value={config.email}
                onChange={(e) => setConfig((c) => ({ ...c, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">API Token</label>
              <input
                type="password"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Your Jira API token"
                value={config.api_token}
                onChange={(e) => setConfig((c) => ({ ...c, api_token: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Default Project Key (optional)</label>
              <input
                type="text"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="e.g. FX"
                value={config.project_key ?? ""}
                onChange={(e) => setConfig((c) => ({ ...c, project_key: e.target.value }))}
              />
            </div>

            {message && (
              <div
                className={`rounded px-3 py-2 text-sm ${
                  message.type === "success"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !config.api_url || !config.email || !config.api_token}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Configuration"}
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !config.api_url || !config.email || !config.api_token}
                className="rounded border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                {testing ? "Testing..." : "Test Connection"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Mapping */}
      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Jira Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Key</th>
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-b border-border">
                      <td className="py-2 pr-4 font-mono font-medium">{p.key}</td>
                      <td className="py-2 pr-4">{p.name}</td>
                      <td className="py-2 text-muted-foreground">{p.projectTypeKey}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
