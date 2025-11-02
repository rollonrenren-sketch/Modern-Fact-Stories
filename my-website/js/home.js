// Modern Fact Stories v2.0 - Enhanced with Theme Toggle
// API KEY STAYS SECURE - Using Cloudflare Worker

const WORKER_URL = 'https://chanfana-openapi-template.gallionmelvs.workers.dev';

// Theme Toggle Functionality
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');

// Check for saved theme preference or default to 'light'
const currentTheme = localStorage.getItem('theme') || 'light';
body.classList.add(currentTheme + '-mode');
updateThemeIcons(currentTheme);

themeToggle.addEventListener('click', () => {
    const isLight = body.classList.contains('light-mode');
    
    if (isLight) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        updateThemeIcons('dark');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        updateThemeIcons('light');
    }
});

function updateThemeIcons(theme) {
    if (theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

// Hide loading screen with smooth transition
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 1200);
});

// Fetch movies from TMDB via YOUR SECURE Worker (API key hidden!)
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

// Create movie card with smooth hover effects
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

// Display movies with fade-in animation
function displayMovies(movies, gridId) {
    const grid = document.getElementById(gridId);
    if (!movies || movies.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No movies found</p>';
        return;
    }
    
    grid.innerHTML = movies.map(movie => createMovieCard(movie)).join('');
    
    // Add stagger animation to cards
    const cards = grid.querySelectorAll('.movie-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// Open movie detail page
function openMovie(movieId, mediaType = 'movie') {
    window.location.href = `movie.html?id=${movieId}&type=${mediaType}`;
}

// Search functionality with debounce
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
        searchGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">Searching...</p>';
        document.getElementById('searchSection').style.display = 'block';
        
        const movies = await fetchMovies(`search/multi&query=${encodeURIComponent(query)}`);
        displayMovies(movies.filter(m => m.poster_path), 'searchGrid');
        
        // Scroll to search results
        document.getElementById('searchSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
});

document.getElementById('searchBtn').addEventListener('click', () => {
    const input = document.getElementById('searchInput');
    input.focus();
});

// Load all movie categories
async function loadAllMovies() {
    // Trending
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

// Check URL parameters for filtering
const urlParams = new URLSearchParams(window.location.search);
const category = urlParams.get('category');
const genre = urlParams.get('genre');

if (category === 'movie') {
    loadAllMovies();
} else if (category === 'tv') {
    fetchMovies('tv/popular').then(shows => displayMovies(shows, 'popularGrid'));
    fetchMovies('tv/top_rated').then(shows => displayMovies(shows, 'topRatedGrid'));
    fetchMovies('tv/on_the_air').then(shows => displayMovies(shows, 'upcomingGrid'));
    fetchMovies('trending/tv/week').then(shows => displayMovies(shows, 'trendingGrid'));
} else if (genre === 'trending') {
    fetchMovies('trending/all/day').then(movies => displayMovies(movies, 'trendingGrid'));
    fetchMovies('trending/movie/week').then(movies => displayMovies(movies, 'popularGrid'));
} else {
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

// Intersection Observer for lazy loading (performance optimization)
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                imageObserver.unobserve(img);
            }
        });
    });
    
    // Observe all images after they're loaded
    setTimeout(() => {
        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            imageObserver.observe(img);
        });
    }, 1000);
}
