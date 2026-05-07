const BACKEND_ORIGIN = "https://carfilmcheckservice.onrender.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health" || url.pathname.startsWith("/api/")) {
      return proxyToBackend(request, url);
    }

    return env.ASSETS.fetch(request);
  }
};

async function proxyToBackend(request, url) {
  const upstreamUrl = new URL(url.pathname + url.search, BACKEND_ORIGIN);
  const headers = new Headers(request.headers);

  headers.set("host", upstreamUrl.host);

  const init = {
    method: request.method,
    headers,
    redirect: "follow"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  return fetch(new Request(upstreamUrl, init));
}