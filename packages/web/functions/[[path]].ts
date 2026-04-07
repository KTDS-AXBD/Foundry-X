// SPA catch-all: non-static 요청에 index.html을 200으로 반환
// _redirects 200 rewrite가 Cloudflare Pages에서 미동작하여 Pages Function으로 대체

export const onRequest: PagesFunction = async ({ request, next, env }) => {
  // 정적 파일이 있으면 그대로 반환
  const response = await next();
  if (response.status !== 404) {
    return response;
  }

  // API 프록시 요청은 pass-through
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    return response;
  }

  // SPA fallback: index.html 반환 (200)
  const asset = await (env as Record<string, { fetch: typeof fetch }>).ASSETS.fetch(
    new URL("/index.html", request.url),
  );
  return new Response(asset.body, {
    status: 200,
    headers: asset.headers,
  });
};
