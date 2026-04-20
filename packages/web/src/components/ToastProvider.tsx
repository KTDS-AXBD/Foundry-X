import { useEffect, useState } from "react";

interface AppToast {
  message: string;
  type?: "info" | "warning" | "error" | "success";
}

export function ToastProvider() {
  const [toast, setToast] = useState<AppToast | null>(null);

  useEffect(() => {
    function handleToast(e: Event) {
      const detail = (e as CustomEvent<AppToast>).detail;
      setToast(detail);
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
    window.addEventListener("app:toast", handleToast);
    return () => window.removeEventListener("app:toast", handleToast);
  }, []);

  if (!toast) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "0.75rem 1.25rem",
        borderRadius: "0.5rem",
        background: "hsl(var(--foreground))",
        color: "hsl(var(--background))",
        boxShadow: "0 4px 16px rgba(0,0,0,.4)",
        fontSize: "0.875rem",
        fontWeight: 500,
        maxWidth: "min(90vw, 28rem)",
        textAlign: "center",
        pointerEvents: "none",
        animation: "fadeInUp 0.2s ease",
      }}
    >
      {toast.message}
    </div>
  );
}
