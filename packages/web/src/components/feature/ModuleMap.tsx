"use client";

import type { RepoProfile } from "@foundry-x/shared";

const colors = {
  text: "#ededed",
  border: "#333",
  accent: "#3b82f6",
  muted: "#888",
};

export interface ModuleMapProps {
  profile: RepoProfile;
}

export default function ModuleMap({ profile }: ModuleMapProps) {
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 20,
          fontSize: 13,
          color: colors.muted,
        }}
      >
        <span>
          Mode:{" "}
          <strong style={{ color: colors.text }}>{profile.mode}</strong>
        </span>
        <span>
          Pattern:{" "}
          <strong style={{ color: colors.text }}>
            {profile.architecturePattern}
          </strong>
        </span>
        <span>
          Languages:{" "}
          <strong style={{ color: colors.text }}>
            {profile.languages.join(", ")}
          </strong>
        </span>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: `2px solid ${colors.border}`,
              textAlign: "left",
            }}
          >
            <th style={{ padding: "8px 12px", color: colors.muted }}>
              Module
            </th>
            <th style={{ padding: "8px 12px", color: colors.muted }}>
              Path
            </th>
            <th style={{ padding: "8px 12px", color: colors.muted }}>
              Role
            </th>
          </tr>
        </thead>
        <tbody>
          {profile.modules.map((mod) => (
            <tr
              key={mod.path}
              style={{
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <td
                style={{
                  padding: "8px 12px",
                  fontWeight: 500,
                  color: colors.accent,
                }}
              >
                {mod.name}
              </td>
              <td
                style={{
                  padding: "8px 12px",
                  fontFamily: "monospace",
                  fontSize: 13,
                  color: colors.text,
                }}
              >
                {mod.path}
              </td>
              <td style={{ padding: "8px 12px", color: colors.text }}>
                {mod.role}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {profile.modules.length === 0 && (
        <p style={{ color: colors.muted, textAlign: "center", marginTop: 20 }}>
          No modules detected
        </p>
      )}
    </>
  );
}
