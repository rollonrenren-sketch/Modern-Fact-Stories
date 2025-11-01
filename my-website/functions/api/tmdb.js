// Cloudflare Pages Function: /api/tmdb
// Put TMDB_KEY in Pages → Settings → Environment variables (Production + Preview).
// Optional: bind a KV and name it RATE_KV for the minute-rate limit (Project → Settings → KV bindings).

const ALLOWED_ORIGINS = new Set([
  'https://your-domain.example',      // ← change to your domain(s)
  'https://www.your-domain.example'
]);

// Tight allowlist to avoid "open proxy" abuse
const PATH_WHITELIST = new RegExp(
  '^/(trending/(movie|tv)/week|discover/(movie|tv)|search/multi|movie/\\d+|tv/\\d+(?:/season/\\d+)?(?:/episode/\\d+)?|genre/(movie|tv)/list|\\w+/top_rated|movie/now_playing|tv/airing_today|\\w+/\\d+/videos)$'
);

export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);
  const origin = request.headers.get('Origin') || '';

  const corsOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : [...ALLOWED_ORIGINS][0]; // default to your primary domain

  const baseHeaders = {
    'content-type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': corsOrigin,
    'Vary': 'Origin',
    'Cache-Control': 'public, max-age=60, s-maxage=300'
  };

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...baseHeaders,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type'
      }
    });
  }

  // Optional: simple minute bucket rate limit (60 req/min/IP)
  try {
    const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
    const key = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
    const used = parseInt((await env.RATE_KV?.get(key)) || '0', 10);
    if (used >= 60) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: baseHeaders
      });
    }
    waitUntil(env.RATE_KV?.put(key, String(used + 1), { expirationTtl: 90 }));
  } catch {}

  // Validate path and forward
  const path = url.searchParams.get('path') || '/trending/movie/week';
  if (!PATH_WHITELIST.test(path)) {
    return new Response(JSON.stringify({ error: 'forbidden_path' }), { status: 400, headers: baseHeaders });
  }

  const forwarded = new URLSearchParams(url.searchParams.get('params') || '');
  forwarded.set('api_key', env.TMDB_KEY);                     // inject server-side
  if (!forwarded.get('language')) forwarded.set('language', 'en-US');
  forwarded.delete('api_key');                                // ignore client key if sent

  const tmdbURL = `https://api.themoviedb.org/3${path}?${forwarded.toString()}`;
  const r = await fetch(tmdbURL, { cf: { cacheTtl: 300, cacheEverything: true } });

  return new Response(r.body, {
    status: r.status,
    headers: {
      ...baseHeaders,
      'content-type': r.headers.get('content-type') || baseHeaders['content-type']
    }
  });
}
