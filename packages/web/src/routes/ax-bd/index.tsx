"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function Component() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/ax-bd/ideas", { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center p-12">
      <p className="text-sm text-muted-foreground">리다이렉트 중...</p>
    </div>
  );
}
