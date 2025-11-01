// functions/api/tmdb.js
// This proxies TMDb API requests to avoid CORS issues

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Handle OPTIONS request for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
  
  // Get parameters from URL
  const endpoint = url.searchParams.get('endpoint');
  const apiKey = url.searchParams.get('api_key');
  
  // Validate required parameters
  if (!endpoint || !apiKey) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required parameters',
        message: 'Both endpoint and api_key are required'
      }), 
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  try {
    // Build TMDb API URL
    const tmdbUrl = new URL(`https://api.themoviedb.org/3${endpoint}`);
    tmdbUrl.searchParams.append('api_key', apiKey);
    tmdbUrl.searchParams.append('language', 'en-US');
    
    // Copy additional query parameters (like page, query, etc.)
    for (const [key, value] of url.searchParams) {
      if (key !== 'endpoint' && key !== 'api_key') {
        tmdbUrl.searchParams.append(key, value);
      }
    }

    console.log('Fetching from TMDb:', tmdbUrl.toString());

    // Fetch from TMDb API
    const response = await fetch(tmdbUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`TMDb API returned status ${response.status}`);
    }

    const data = await response.json();

    // Return data with CORS headers
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('Proxy error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Proxy error',
        message: error.message 
      }), 
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

