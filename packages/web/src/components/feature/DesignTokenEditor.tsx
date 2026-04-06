/**
 * F381: Design Token Editor (Sprint 173)
 * 4 category tabs with specialized inputs per token type
 */
import { useState, useCallback } from "react";

export interface DesignTokenItem {
  id?: string;
  tokenKey: string;
  tokenValue: string;
  tokenCategory: "color" | "typography" | "layout" | "spacing";
}

interface DesignTokenEditorProps {
  tokens: DesignTokenItem[];
  onSave: (tokens: DesignTokenItem[]) => void;
  onReset: () => void;
  saving: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  color: "Colors",
  typography: "Typography",
  layout: "Layout",
  spacing: "Spacing",
};

const WEIGHT_OPTIONS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];

export function DesignTokenEditor({ tokens, onSave, onReset, saving }: DesignTokenEditorProps) {
  const [activeTab, setActiveTab] = useState<string>("color");
  const [localTokens, setLocalTokens] = useState<DesignTokenItem[]>(tokens);
  const [dirty, setDirty] = useState(false);

  // Sync when tokens prop changes (e.g., after save/reset)
  const tokensKey = tokens.map((t) => `${t.tokenKey}=${t.tokenValue}`).join(",");
  const [prevKey, setPrevKey] = useState(tokensKey);
  if (tokensKey !== prevKey) {
    setLocalTokens(tokens);
    setDirty(false);
    setPrevKey(tokensKey);
  }

  const updateToken = useCallback((key: string, value: string) => {
    setLocalTokens((prev) =>
      prev.map((t) => (t.tokenKey === key ? { ...t, tokenValue: value } : t)),
    );
    setDirty(true);
  }, []);

  const filtered = localTokens.filter((t) => t.tokenCategory === activeTab);

  const handleSave = () => {
    onSave(localTokens);
    setDirty(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e5e5", paddingBottom: 8 }}>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: "6px 14px",
              border: "1px solid #ddd",
              borderRadius: 6,
              background: activeTab === key ? "#111" : "#fff",
              color: activeTab === key ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeTab === key ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Token list */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {filtered.length === 0 && (
          <p style={{ color: "#999", textAlign: "center", marginTop: 40 }}>
            No tokens in this category. Click Reset to load defaults.
          </p>
        )}
        {filtered.map((token) => (
          <div
            key={token.tokenKey}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <label
              style={{
                flex: 1,
                fontSize: 13,
                color: "#555",
                fontFamily: "monospace",
                minWidth: 200,
              }}
            >
              {token.tokenKey}
            </label>
            <div style={{ flex: 1 }}>
              {renderInput(token, updateToken)}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8 }}>
        <button
          onClick={() => {
            if (window.confirm("기본 토큰으로 리셋하시겠어요? 커스텀 토큰이 모두 초기화돼요.")) {
              onReset();
            }
          }}
          disabled={saving}
          style={{
            padding: "8px 16px",
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#fff",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: 13,
          }}
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: 6,
            background: dirty ? "#111" : "#ccc",
            color: "#fff",
            cursor: saving || !dirty ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {saving ? "Saving..." : "Save Tokens"}
        </button>
      </div>
    </div>
  );
}

function renderInput(
  token: DesignTokenItem,
  onChange: (key: string, value: string) => void,
) {
  const { tokenKey, tokenValue, tokenCategory } = token;

  // Color tokens: color picker + hex input
  if (tokenCategory === "color") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="color"
          value={tokenValue.length === 4 ? expandHex(tokenValue) : tokenValue}
          onChange={(e) => onChange(tokenKey, e.target.value)}
          style={{ width: 32, height: 32, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }}
        />
        <input
          type="text"
          value={tokenValue}
          onChange={(e) => onChange(tokenKey, e.target.value)}
          style={{
            width: 90,
            padding: "4px 8px",
            border: "1px solid #ddd",
            borderRadius: 4,
            fontSize: 13,
            fontFamily: "monospace",
          }}
        />
      </div>
    );
  }

  // Typography weight: select dropdown
  if (tokenCategory === "typography" && tokenKey.endsWith(".weight")) {
    return (
      <select
        value={tokenValue}
        onChange={(e) => onChange(tokenKey, e.target.value)}
        style={{
          padding: "4px 8px",
          border: "1px solid #ddd",
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        {WEIGHT_OPTIONS.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>
    );
  }

  // Typography size: text input with px suffix hint
  if (tokenCategory === "typography" && tokenKey.endsWith(".size")) {
    return (
      <input
        type="text"
        value={tokenValue}
        onChange={(e) => onChange(tokenKey, e.target.value)}
        placeholder="e.g. 16px"
        style={{
          width: 100,
          padding: "4px 8px",
          border: "1px solid #ddd",
          borderRadius: 4,
          fontSize: 13,
          fontFamily: "monospace",
        }}
      />
    );
  }

  // Layout/spacing: simple text input
  return (
    <input
      type="text"
      value={tokenValue}
      onChange={(e) => onChange(tokenKey, e.target.value)}
      style={{
        width: 120,
        padding: "4px 8px",
        border: "1px solid #ddd",
        borderRadius: 4,
        fontSize: 13,
        fontFamily: "monospace",
      }}
    />
  );
}

/** Expand 3-digit hex (#fff) to 6-digit (#ffffff) for color input */
function expandHex(hex: string): string {
  if (hex.length === 4 && hex.startsWith("#")) {
    const r = hex[1], g = hex[2], b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return hex;
}
