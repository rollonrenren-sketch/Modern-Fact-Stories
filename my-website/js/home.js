// Modern Fact Stories - Movie Fetching Script
// Uses your secure Cloudflare Worker to keep API key hidden

// Your Cloudflare Worker URL (API key stays hidden here!)
const WORKER_URL = 'https://chanfana-openapi-template.gallionmelvs.workers.dev';

// Hide loading screen when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 1000);
});

// Fetch movies from TMDB via your secure Worker
async function fetchMovies(endpoint) {
    try {
        const response = await fetch(`${WORKER_URL}?path=${endpoint}`);
        if (!response.ok) throw new Error('Failed to fetch movies');
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching movies:', error);
        return [];
    }
}

// Create movie card HTML
function createMovieCard(movie) {
    const posterPath = movie.poster_path 
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Poster';
    
    const title = movie.title || movie.name;
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const year = movie.release_date || movie.first_air_date 
        ? (movie.release_date || movie.first_air_date).split('-')[0] 
        : 'N/A';
    const mediaType = movie.media_type || 'movie';
    
    return `
        <div class="movie-card" onclick="openMovie(${movie.id}, '${mediaType}')">
            <img src="${posterPath}" alt="${title}" class="movie-poster" loading="lazy">
            <div class="movie-info">
                <div class="movie-title">${title}</div>
                <div class="movie-meta">
                    <span class="movie-rating">⭐ ${rating}</span>
                    <span class="movie-year">${year}</span>
                </div>
            </div>
        </div>
    `;
}

// Display movies in grid
function displayMovies(movies, gridId) {
    const grid = document.getElementById(gridId);
    if (!movies || movies.length === 0) {
        grid.innerHTML = '<p class="loading-placeholder">No movies found</p>';
        return;
    }
    grid.innerHTML = movies.map(movie => createMovieCard(movie)).join('');
}

// Open movie detail page
function openMovie(movieId, mediaType = 'movie') {
    window.location.href = `movie.html?id=${movieId}&type=${mediaType}`;
}

// Search functionality
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        document.getElementById('searchSection').style.display = 'none';
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        const searchGrid = document.getElementById('searchGrid');
        searchGrid.innerHTML = '<p class="loading-placeholder">Searching...</p>';
        document.getElementById('searchSection').style.display = 'block';
        
        const movies = await fetchMovies(`search/multi&query=${encodeURIComponent(query)}`);
        displayMovies(movies.filter(m => m.poster_path), 'searchGrid');
    }, 500);
});

document.getElementById('searchBtn').addEventListener('click', () => {
    const input = document.getElementById('searchInput');
    input.focus();
});

// Load all movie categories on page load
async function loadAllMovies() {
    // Trending (movies and TV)
    const trending = await fetchMovies('trending/all/week');
    displayMovies(trending.slice(0, 18), 'trendingGrid');
    
    // Popular Movies
    const popular = await fetchMovies('movie/popular');
    displayMovies(popular.slice(0, 18), 'popularGrid');
    
    // Top Rated
    const topRated = await fetchMovies('movie/top_rated');
    displayMovies(topRated.slice(0, 18), 'topRatedGrid');
    
    // Upcoming
    const upcoming = await fetchMovies('movie/upcoming');
    displayMovies(upcoming.slice(0, 18), 'upcomingGrid');
}

// Check URL parameters for category filtering
const urlParams = new URLSearchParams(window.location.search);
const category = urlParams.get('category');
const genre = urlParams.get('genre');

if (category === 'movie') {
    // Show only movies
    loadAllMovies();
} else if (category === 'tv') {
    // Show TV shows
    fetchMovies('tv/popular').then(shows => displayMovies(shows, 'popularGrid'));
    fetchMovies('tv/top_rated').then(shows => displayMovies(shows, 'topRatedGrid'));
    fetchMovies('tv/on_the_air').then(shows => displayMovies(shows, 'upcomingGrid'));
} else if (genre === 'trending') {
    // Show trending content
    fetchMovies('trending/all/day').then(movies => displayMovies(movies, 'trendingGrid'));
} else {
    // Default: load all movies
    loadAllMovies();
}

// Update active nav link
document.querySelectorAll('.nav-link').forEach(link => {
    if (link.href === window.location.href) {
        link.classList.add('active');
    } else {
        link.classList.remove('active');
    }
});
