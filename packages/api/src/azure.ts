/**
 * Azure Functions HTTP Trigger adapter for Foundry-X Hono API.
 *
 * Wraps the existing Hono app (packages/api/src/app.ts) so that it runs
 * inside Azure Functions v4 programming model without any changes to
 * route handlers, middleware, or business logic.
 *
 * NOTE: D1 bindings (env.DB) are Cloudflare-specific and unavailable on Azure.
 * When deploying to Azure, the D1 binding must be replaced with an Azure SQL
 * client (e.g. mssql / tedious) injected via middleware or custom Hono env.
 * That adapter is outside the scope of this PoC file — see
 * docs/specs/azure-migration-guide.md for the full migration plan.
 */

import { app as honoApp } from './app.js';
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';

/**
 * Convert an Azure Functions HttpRequest into a Web-standard Request,
 * pass it through Hono's fetch handler, then convert the Response back
 * to Azure's HttpResponseInit.
 */
async function httpTrigger(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  // --- 1. Azure HttpRequest → Web standard Request ---
  const url = request.url;
  const method = request.method;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    headers.set(key, value);
  });

  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const body = hasBody ? (await request.text()) || undefined : undefined;

  const webRequest = new Request(url, {
    method,
    headers,
    body,
  });

  // --- 2. Hono handles the request ---
  // NOTE: The second argument to honoApp.fetch() is the "env" bindings object.
  // On Cloudflare Workers this contains DB (D1), KV, etc.
  // On Azure, env.DB will be undefined — services that depend on D1 will need
  // an Azure SQL adapter injected here in a future sprint.
  const env = {
    JWT_SECRET: process.env.JWT_SECRET ?? '',
    GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? '',
    // DB: <AzureSqlAdapter>  — TODO: inject Azure SQL client here
  };

  const honoResponse: Response = await honoApp.fetch(webRequest, env);

  // --- 3. Web standard Response → Azure HttpResponseInit ---
  const responseHeaders: Record<string, string> = {};
  honoResponse.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const responseBody = await honoResponse.text();

  return {
    status: honoResponse.status,
    headers: responseHeaders,
    body: responseBody,
  };
}

// Register the catch-all HTTP trigger
app.http('api', {
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '{*path}',
  handler: httpTrigger,
});
