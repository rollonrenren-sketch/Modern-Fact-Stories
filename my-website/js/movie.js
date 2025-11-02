// Modern Fact Stories - Movie Detail & Player Script
// Streams videos via VidSrc.icu + fetches details via your secure Worker

const WORKER_URL = 'https://chanfana-openapi-template.gallionmelvs.workers.dev';
const VIDSRC_URL = 'https://vidsrc.icu/embed';

// Get movie ID and type from URL
const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');
const mediaType = urlParams.get('type') || 'movie';

// Fetch movie details from TMDB via your secure Worker
async function fetchMovieDetails() {
    try {
        const endpoint = `${mediaType}/${movieId}`;
        const response = await fetch(`${WORKER_URL}?path=${endpoint}`);
        if (!response.ok) throw new Error('Failed to fetch movie details');
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

// Fetch similar/recommended movies
async function fetchRecommendations() {
    try {
        const endpoint = `${mediaType}/${movieId}/recommendations`;
        const response = await fetch(`${WORKER_URL}?path=${endpoint}`);
        if (!response.ok) throw new Error('Failed to fetch recommendations');
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        return [];
    }
}

// Display movie details
function displayMovieDetails(movie) {
    // Update page title
    const title = movie.title || movie.name;
    document.getElementById('pageTitle').textContent = `${title} - Modern Fact Stories`;
    
    // Setup video player
    const videoPlayer = document.getElementById('videoPlayer');
    if (mediaType === 'movie') {
        videoPlayer.src = `${VIDSRC_URL}/movie/${movieId}`;
    } else {
        // For TV shows, default to S01E01
        videoPlayer.src = `${VIDSRC_URL}/tv/${movieId}/1/1`;
    }
    document.getElementById('videoContainer').style.display = 'block';
    
    // Movie poster
    const posterPath = movie.poster_path 
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Poster';
    document.getElementById('moviePoster').src = posterPath;
    
    // Movie title
    document.getElementById('movieTitle').textContent = title;
    
    // Movie meta info
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const year = movie.release_date || movie.first_air_date 
        ? (movie.release_date || movie.first_air_date).split('-')[0] 
        : 'N/A';
    const runtime = movie.runtime ? `${movie.runtime} min` : '';
    
    const metaHTML = `
        <div class="meta-item">
            <span class="rating-badge">⭐ ${rating}</span>
        </div>
        <div class="meta-item">📅 ${year}</div>
        ${runtime ? `<div class="meta-item">⏱️ ${runtime}</div>` : ''}
        ${movie.status ? `<div class="meta-item">📊 ${movie.status}</div>` : ''}
    `;
    document.getElementById('movieMeta').innerHTML = metaHTML;
    
    // Genres
    if (movie.genres && movie.genres.length > 0) {
        const genresHTML = movie.genres.map(genre => 
            `<span class="genre-tag">${genre.name}</span>`
        ).join('');
        document.getElementById('genreList').innerHTML = genresHTML;
    }
    
    // Overview
    document.getElementById('movieOverview').textContent = 
        movie.overview || 'No overview available.';
    
    // Show movie info section
    document.getElementById('movieInfo').style.display = 'block';
    document.getElementById('loadingState').style.display = 'none';
}

// Display recommendations
function displayRecommendations(movies) {
    const grid = document.getElementById('recommendationsGrid');
    
    if (!movies || movies.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-secondary);">No recommendations available</p>';
        return;
    }
    
    const moviesHTML = movies.slice(0, 12).map(movie => {
        const posterPath = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
            : 'https://via.placeholder.com/342x513?text=No+Poster';
        const title = movie.title || movie.name;
        const type = movie.media_type || mediaType;
        
        return `
            <div class="movie-card" onclick="window.location.href='movie.html?id=${movie.id}&type=${type}'">
                <img src="${posterPath}" alt="${title}" loading="lazy">
                <div class="movie-card-info">
                    <div class="movie-card-title">${title}</div>
                </div>
            </div>
        `;
    }).join('');
    
    grid.innerHTML = moviesHTML;
}

// Load everything when page loads
async function loadMoviePage() {
    if (!movieId) {
        document.getElementById('loadingState').textContent = 'Error: No movie ID provided';
        return;
    }
    
    // Fetch movie details and recommendations in parallel
    const [movieDetails, recommendations] = await Promise.all([
        fetchMovieDetails(),
        fetchRecommendations()
    ]);
    
    if (movieDetails) {
        displayMovieDetails(movieDetails);
        displayRecommendations(recommendations);
    } else {
        document.getElementById('loadingState').textContent = 'Error loading movie details';
    }
}

// Start loading
loadMoviePage();
