import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ToastProvider";
import "./app/globals.css";

import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/syne/400.css";
import "@fontsource/syne/700.css";
import "@fontsource-variable/jetbrains-mono";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark">
      <RouterProvider router={router} />
      <ToastProvider />
    </ThemeProvider>
  </StrictMode>,
);
