// Modern Fact Stories v3.0 ULTIMATE - All Features Included
// Features: Theme Toggle, Cache, Continue Watching, Genre Filter, Mobile Menu, Infinite Scroll

const WORKER_URL = 'https://chanfana-openapi-template.gallionmelvs.workers.dev';

// Cache for API responses (5 min cache)
const cache = {};
const CACHE_TIME = 5 * 60 * 1000;

// Current page tracking for infinite scroll
let currentPage = {
    trending: 1,
    popular: 1,
    topRated: 1,
    upcoming: 1
};

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');

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

// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileNav = document.getElementById('mobileNav');

mobileMenuToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
});

// Hide loading screen
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 1200);
});

// Fetch movies with caching
async function fetchMovies(endpoint) {
    const cacheKey = endpoint;
    const cached = cache[cacheKey];
    
    if (cached && Date.now() - cached.time < CACHE_TIME) {
        return cached.data;
    }
    
    try {
        const response = await fetch(`${WORKER_URL}?path=${endpoint}`);
        if (!response.ok) throw new Error('Failed to fetch movies');
        const data = await response.json();
        const results = data.results || [];
        
        cache[cacheKey] = { data: results, time: Date.now() };
        return results;
    } catch (error) {
        console.error('Error fetching movies:', error);
        return [];
    }
}

// Create movie card
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
        <div class="movie-card" onclick="saveAndOpenMovie(${movie.id}, '${mediaType}', '${title.replace(/'/g, "\\'")}', '${posterPath}')">
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

// Display movies with animation
function displayMovies(movies, gridId, append = false) {
    const grid = document.getElementById(gridId);
    if (!movies || movies.length === 0) {
        if (!append) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No movies found</p>';
        }
        return;
    }
    
    const moviesHTML = movies.map(movie => createMovieCard(movie)).join('');
    
    if (append) {
        grid.insertAdjacentHTML('beforeend', moviesHTML);
    } else {
        grid.innerHTML = moviesHTML;
    }
    
    // Stagger animation
    const cards = grid.querySelectorAll('.movie-card');
    const startIndex = append ? cards.length - movies.length : 0;
    
    for (let i = startIndex; i < cards.length; i++) {
        const card = cards[i];
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, (i - startIndex) * 50);
    }
}

// Continue Watching Feature
function saveAndOpenMovie(movieId, mediaType, title, poster) {
    const watchData = {
        id: movieId,
        type: mediaType,
        title: title,
        poster: poster,
        timestamp: Date.now()
    };
    
    // Save to localStorage
    let continueWatching = JSON.parse(localStorage.getItem('continueWatching') || '[]');
    
    // Remove if already exists
    continueWatching = continueWatching.filter(item => item.id !== movieId);
    
    // Add to beginning
    continueWatching.unshift(watchData);
    
    // Keep only last 12
    continueWatching = continueWatching.slice(0, 12);
    
    localStorage.setItem('continueWatching', JSON.stringify(continueWatching));
    
    // Navigate to movie page
    window.location.href = `movie.html?id=${movieId}&type=${mediaType}`;
}

// Load Continue Watching
function loadContinueWatching() {
    const continueWatching = JSON.parse(localStorage.getItem('continueWatching') || '[]');
    
    if (continueWatching.length > 0) {
        const section = document.getElementById('continueWatchingSection');
        const grid = document.getElementById('continueWatchingGrid');
        
        const moviesHTML = continueWatching.map(item => `
            <div class="movie-card" onclick="window.location.href='movie.html?id=${item.id}&type=${item.type}'">
                <img src="${item.poster}" alt="${item.title}" class="movie-poster" loading="lazy">
                <div class="movie-info">
                    <div class="movie-title">${item.title}</div>
                </div>
            </div>
        `).join('');
        
        grid.innerHTML = moviesHTML;
        section.style.display = 'block';
    }
}

// Open movie
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
        searchGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">Searching...</p>';
        document.getElementById('searchSection').style.display = 'block';
        
        const movies = await fetchMovies(`search/multi&query=${encodeURIComponent(query)}`);
        displayMovies(movies.filter(m => m.poster_path), 'searchGrid');
        
        document.getElementById('searchSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
});

document.getElementById('searchBtn').addEventListener('click', () => {
    document.getElementById('searchInput').focus();
});

// Genre Filter
document.getElementById('genreFilter').addEventListener('change', async (e) => {
    const genreId = e.target.value;
    
    if (!genreId) {
        loadAllMovies();
        return;
    }
    
    const movies = await fetchMovies(`discover/movie&with_genres=${genreId}&sort_by=popularity.desc`);
    displayMovies(movies.slice(0, 18), 'popularGrid');
    
    document.querySelector('.main-content').scrollIntoView({ behavior: 'smooth' });
});

// Load all movies
async function loadAllMovies() {
    const [trending, popular, topRated, upcoming] = await Promise.all([
        fetchMovies('trending/all/week'),
        fetchMovies('movie/popular'),
        fetchMovies('movie/top_rated'),
        fetchMovies('movie/upcoming')
    ]);
    
    displayMovies(trending.slice(0, 18), 'trendingGrid');
    displayMovies(popular.slice(0, 18), 'popularGrid');
    displayMovies(topRated.slice(0, 18), 'topRatedGrid');
    displayMovies(upcoming.slice(0, 18), 'upcomingGrid');
}

// URL parameters
const urlParams = new URLSearchParams(window.location.search);
const category = urlParams.get('category');
const genre = urlParams.get('genre');

if (category === 'movie') {
    loadAllMovies();
} else if (category === 'tv') {
    Promise.all([
        fetchMovies('tv/popular'),
        fetchMovies('tv/top_rated'),
        fetchMovies('tv/on_the_air'),
        fetchMovies('trending/tv/week')
    ]).then(([popular, topRated, onAir, trending]) => {
        displayMovies(popular, 'popularGrid');
        displayMovies(topRated, 'topRatedGrid');
        displayMovies(onAir, 'upcomingGrid');
        displayMovies(trending, 'trendingGrid');
    });
} else if (genre === 'trending') {
    Promise.all([
        fetchMovies('trending/all/day'),
        fetchMovies('trending/movie/week')
    ]).then(([daily, weekly]) => {
        displayMovies(daily, 'trendingGrid');
        displayMovies(weekly, 'popularGrid');
    });
} else {
    loadAllMovies();
}

// Load continue watching
loadContinueWatching();

// Update active nav
document.querySelectorAll('.nav-link').forEach(link => {
    if (link.href === window.location.href) {
        link.classList.add('active');
    } else {
        link.classList.remove('active');
    }
});

// Performance optimization
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
    
    setTimeout(() => {
        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            imageObserver.observe(img);
        });
    }, 1000);
}
