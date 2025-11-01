export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Read parameters from frontend calls
  const mode = url.searchParams.get('mode');
  const type = url.searchParams.get('type');
  const query = url.searchParams.get('query');
  const id = url.searchParams.get('id');
  const page = url.searchParams.get('page') || 1;
  const apiKey = env.API_KEY;

  let apiUrl = "";

  // Handle trending (movies or tv)
  if (mode === 'trending' && type) {
    apiUrl = `https://api.themoviedb.org/3/trending/${type}/week?api_key=${apiKey}&language=en-US&page=${page}`;
  }
  // Handle anime trending (tv)
  else if (mode === 'anime') {
    apiUrl = `https://api.themoviedb.org/3/trending/tv/week?api_key=${apiKey}&language=en-US&page=${page}`;
  }
  // Handle multi-type search (movie, tv, people)
  else if (mode === 'search' && query) {
    apiUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(query)}&page=${page}`;
  }
  // Handle single title detail (movie or tv)
  else if (mode === 'title' && type && id) {
    apiUrl = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=en-US`;
  } else {
    return new Response(
      JSON.stringify({ error: "Invalid parameters" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const apiResponse = await fetch(apiUrl);
    const data = await apiResponse.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
