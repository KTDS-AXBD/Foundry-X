/**
 * JiraAdapter — Jira REST API v3 어댑터 (F99)
 */

import type { JiraIssue, JiraProject } from "../schemas/jira.js";

export class JiraAdapter {
  constructor(
    private apiUrl: string,
    private email: string,
    private apiToken: string,
  ) {}

  private headers(): HeadersInit {
    return {
      Authorization: `Basic ${btoa(`${this.email}:${this.apiToken}`)}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  async getProjects(): Promise<JiraProject[]> {
    const res = await fetch(`${this.apiUrl}/rest/api/3/project`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new JiraApiError(res.status, "Failed to fetch projects");
    const data = (await res.json()) as Array<{ id: string; key: string; name: string }>;
    return data.map((p) => ({ id: p.id, key: p.key, name: p.name }));
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    const res = await fetch(`${this.apiUrl}/rest/api/3/issue/${issueKey}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new JiraApiError(res.status, `Failed to fetch issue ${issueKey}`);
    const data = (await res.json()) as {
      key: string;
      fields: {
        summary: string;
        status: { name: string };
        issuetype: { name: string };
        assignee: { displayName: string } | null;
        priority: { name: string } | null;
        updated: string;
      };
    };
    return {
      key: data.key,
      summary: data.fields.summary,
      status: data.fields.status.name,
      type: data.fields.issuetype.name,
      assignee: data.fields.assignee?.displayName ?? null,
      priority: data.fields.priority?.name ?? null,
      updated: data.fields.updated,
    };
  }

  async createIssue(projectKey: string, summary: string, issueType: string): Promise<JiraIssue> {
    const res = await fetch(`${this.apiUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary,
          issuetype: { name: issueType },
        },
      }),
    });
    if (!res.ok) throw new JiraApiError(res.status, "Failed to create issue");
    const data = (await res.json()) as { key: string };
    return this.getIssue(data.key);
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/rest/api/3/issue/${issueKey}/transitions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ transition: { id: transitionId } }),
    });
    if (!res.ok) throw new JiraApiError(res.status, `Failed to transition issue ${issueKey}`);
  }

  async addComment(issueKey: string, body: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/rest/api/3/issue/${issueKey}/comment`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        body: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: body }] }] },
      }),
    });
    if (!res.ok) throw new JiraApiError(res.status, `Failed to add comment to ${issueKey}`);
  }
}

export class JiraApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}
