"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listMcpResources,
  listMcpResourceTemplates,
  readMcpResource,
  subscribeMcpResource,
  type McpResource,
  type McpResourceTemplate,
  type McpResourceContent,
} from "@/lib/api-client";
import { ResourceViewer } from "./ResourceViewer";

interface McpResourcesPanelProps {
  serverId: string;
  serverName: string;
}

export function McpResourcesPanel({ serverId, serverName }: McpResourcesPanelProps) {
  const [resources, setResources] = useState<McpResource[]>([]);
  const [templates, setTemplates] = useState<McpResourceTemplate[]>([]);
  const [selectedResource, setSelectedResource] = useState<McpResource | null>(null);
  const [resourceContent, setResourceContent] = useState<McpResourceContent | null>(null);
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());
  const [templateArgs, setTemplateArgs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      const [resourcesRes, templatesRes] = await Promise.all([
        listMcpResources(serverId),
        listMcpResourceTemplates(serverId),
      ]);
      setResources(resourcesRes.resources);
      setTemplates(templatesRes.resourceTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resources");
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleSelectResource = async (resource: McpResource) => {
    setSelectedResource(resource);
    setError(null);
    try {
      const result = await readMcpResource(serverId, resource.uri);
      setResourceContent(result.contents[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read resource");
      setResourceContent(null);
    }
  };

  const handleToggleSubscription = async (uri: string) => {
    try {
      if (subscriptions.has(uri)) {
        setSubscriptions((prev) => {
          const next = new Set(prev);
          next.delete(uri);
          return next;
        });
      } else {
        await subscribeMcpResource(serverId, uri);
        setSubscriptions((prev) => new Set(prev).add(uri));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed");
    }
  };

  const handleReadTemplate = async (template: McpResourceTemplate) => {
    const uri = template.uriTemplate.replace(/\{(\w+)\}/g, (_, key) => templateArgs[key] ?? key);
    try {
      const result = await readMcpResource(serverId, uri);
      setResourceContent(result.contents[0] ?? null);
      setSelectedResource({ uri, name: template.name, mimeType: template.mimeType });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read template resource");
    }
  };

  const getResourceIcon = (mimeType?: string) => {
    if (!mimeType) return "📄";
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.includes("json")) return "📋";
    if (mimeType.includes("sql")) return "🗄️";
    if (mimeType.includes("csv")) return "📊";
    return "📄";
  };

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading resources...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Resources ({resources.length})
        </h3>
        <button
          onClick={loadResources}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {resources.length === 0 && templates.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No resources available from {serverName}
        </div>
      ) : (
        <div className="space-y-1">
          {resources.map((resource) => (
            <div
              key={resource.uri}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent ${
                selectedResource?.uri === resource.uri ? "bg-accent" : ""
              }`}
              onClick={() => handleSelectResource(resource)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span>{getResourceIcon(resource.mimeType)}</span>
                <span className="truncate">{resource.name}</span>
                {resource.mimeType && (
                  <span className="text-xs text-muted-foreground">{resource.mimeType}</span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleSubscription(resource.uri);
                }}
                className={`text-xs px-1 ${subscriptions.has(resource.uri) ? "text-primary" : "text-muted-foreground"}`}
                title={subscriptions.has(resource.uri) ? "Subscribed" : "Subscribe"}
              >
                {subscriptions.has(resource.uri) ? "🔔" : "🔕"}
              </button>
            </div>
          ))}

          {templates.length > 0 && (
            <>
              <div className="border-t pt-2 mt-2">
                <span className="text-xs text-muted-foreground font-medium">Templates</span>
              </div>
              {templates.map((template) => {
                const params = template.uriTemplate.match(/\{(\w+)\}/g)?.map((p) => p.slice(1, -1)) ?? [];
                return (
                  <div key={template.uriTemplate} className="rounded-md px-2 py-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span>🔗</span>
                      <span className="truncate">{template.name}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 ml-6">
                      {params.map((param) => (
                        <input
                          key={param}
                          type="text"
                          placeholder={param}
                          className="w-20 px-1 py-0.5 text-xs border rounded bg-background"
                          value={templateArgs[param] ?? ""}
                          onChange={(e) =>
                            setTemplateArgs((prev) => ({ ...prev, [param]: e.target.value }))
                          }
                        />
                      ))}
                      <button
                        onClick={() => handleReadTemplate(template)}
                        className="text-xs px-2 py-0.5 border rounded hover:bg-accent"
                      >
                        Read
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {selectedResource && resourceContent && (
        <div className="border-t pt-3">
          <div className="text-xs text-muted-foreground mb-1">
            {selectedResource.name} — {selectedResource.uri}
          </div>
          <ResourceViewer content={resourceContent} />
        </div>
      )}
    </div>
  );
}
