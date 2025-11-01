// functions/api/tmdb.js
// Secure TMDb API Proxy using Cloudflare Environment Variables

export async function onRequest(context) {
  const { request, env } = context;  // env gives access to environment variables
  const url = new URL(request.url);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
  
  // Get endpoint from URL parameter
  const endpoint = url.searchParams.get('endpoint');
  
  // ✅ Get API key from SECURE environment variable
  const apiKey = env.TMDB_API_KEY;
  
  // Validate parameters
  if (!endpoint) {
    return new Response(JSON.stringify({ 
      error: 'Missing endpoint parameter' 
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ 
      error: 'API key not configured',
      message: 'Environment variable TMDB_API_KEY is missing'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  try {
    // Build TMDb API URL
    const tmdbUrl = new URL(`https://api.themoviedb.org/3${endpoint}`);
    tmdbUrl.searchParams.append('api_key', apiKey);
    tmdbUrl.searchParams.append('language', 'en-US');
    
    // Copy other query parameters (page, query, etc.)
    for (const [key, value] of url.searchParams) {
      if (key !== 'endpoint' && key !== 'api_key') {
        tmdbUrl.searchParams.append(key, value);
      }
    }

    console.log('🔒 Secure fetch from TMDb');

    // Fetch from TMDb API
    const response = await fetch(tmdbUrl.toString());
    
    if (!response.ok) {
      throw new Error(`TMDb API error: ${response.status}`);
    }
    
    const data = await response.json();

    // Return
