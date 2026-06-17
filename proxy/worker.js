const ALLOWED_ORIGINS = [
  "https://pbparthas.github.io",
  "http://localhost:5180",
  "http://localhost:4173",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const TARGET = "https://v3.football.api-sports.io";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.includes(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
        },
      });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const target = `${TARGET}${url.pathname}${url.search}`;

    const apiKey = env.API_FOOTBALL_KEY;
    if (!apiKey) {
      return jsonResponse({ error: "API key not configured on proxy" }, 500, origin, allowed);
    }

    try {
      const resp = await fetch(target, {
        headers: { "x-apisports-key": apiKey },
      });
      const body = await resp.text();
      return new Response(body, {
        status: resp.status,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
          "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
        },
      });
    } catch (e) {
      return jsonResponse({ error: "Proxy fetch failed: " + e.message }, 502, origin, allowed);
    }
  },
};

function jsonResponse(obj, status, origin, allowed) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    },
  });
}
