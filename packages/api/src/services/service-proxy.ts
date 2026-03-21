import type { Env } from "../env.js";

export class ServiceProxy {
  constructor(private env: Env) {}

  async forward(
    service: "dx" | "aif",
    path: string,
    request: Request,
    hubToken: string,
  ): Promise<Response> {
    const binding = service === "dx" ? this.env.DX_WORKER : this.env.AIF_WORKER;
    const fallbackUrl = service === "dx" ? this.env.DX_API_URL : this.env.AIF_API_URL;

    const targetUrl = `/${path}`;
    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${hubToken}`);
    headers.set("X-Forwarded-From", "foundry-x-bff");

    const init: RequestInit = {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    };

    if (binding) {
      return binding.fetch(new Request(`https://placeholder${targetUrl}`, init));
    }

    if (fallbackUrl) {
      return fetch(`${fallbackUrl}${targetUrl}`, init);
    }

    return new Response(JSON.stringify({ error: "Service not configured" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
