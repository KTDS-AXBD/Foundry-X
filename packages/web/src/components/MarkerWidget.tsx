import { useEffect } from "react";

declare global {
  interface Window {
    markerConfig?: { project: string; source: string };
  }
}

export function MarkerWidget() {
  useEffect(() => {
    const projectId = import.meta.env.VITE_MARKER_PROJECT_ID;
    if (!projectId) return;

    window.markerConfig = { project: projectId, source: "snippet" };

    const script = document.createElement("script");
    script.src = "https://edge.marker.io/latest/shim.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      script.remove();
      delete window.markerConfig;
    };
  }, []);

  return null;
}
