export async function onRequest(context) {
  const { request } = context;
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
  
  // Get parameters
  const endpoint = url.searchParams.get('endpoint');
  const apiKey = url.searchParams.get('api_key');
  
  if (!endpoint || !apiKey) {
    return new Response(JSON.stringify({ 
      error: 'Missing parameters',
      received: { endpoint, apiKey: apiKey ? 'present' : 'missing' }
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  try {
    // Build TMDb URL
    const tmdbUrl = new URL(`https://api.themoviedb.org/3${endpoint}`);
    tmdbUrl.searchParams.append('api_key', apiKey);
    tmdbUrl.searchParams.append('language', 'en-US');
    
    // Add other query params
    for (const [key, value] of url.searchParams) {
      if (key !== 'endpoint' && key !== 'api_key') {
        tmdbUrl.searchParams.append(key, value);
      }
    }

    console.log('Fetching from TMDb:', tmdbUrl.toString());

    // Fetch from TMDb
    const response = await fetch(tmdbUrl.toString());
    
    if (!response.ok) {
      throw new Error(`TMDb returned ${response.status}`);
    }
    
    const data = await response.json();

    // Return with CORS headers
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=3600',
      }
    });

  } catch (error) {
    console.error('Proxy error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Proxy failed',
      message: error.message,
      endpoint: endpoint
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
