// Modern Fact Stories v2.0 - Movie Detail with Multi-Player Support
// API KEY SECURE - Using Cloudflare Worker
// Auto-switches between 3 video servers for best playback

const WORKER_URL = 'https://chanfana-openapi-template.gallionmelvs.workers.dev';

// Multiple video streaming APIs (auto-fallback)
const VIDEO_SERVERS = {
    vidsrc: 'https://vidsrc.icu/embed',
    vidsrc2: 'https://vidsrc.to/embed',
    embed: 'https://www.2embed.cc/embed'
};

let currentMovieId = null;
let currentMediaType = null;
let currentServer = 'vidsrc';

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

// Get movie ID and type from URL
const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');
const mediaType = urlParams.get('type') || 'movie';

currentMovieId = movieId;
currentMediaType = mediaType;

// Switch between video servers
function switchServer(server) {
    currentServer = server;
    
    // Update active button
    document.querySelectorAll('.server-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update video player
    loadVideoPlayer();
}

// Load video player with current server
function loadVideoPlayer() {
    const videoPlayer = document.getElementById('videoPlayer');
    const serverUrl = VIDEO_SERVERS[currentServer];
    
    if (currentMediaType === 'movie') {
        videoPlayer.src = `${serverUrl}/movie/${currentMovieId}`;
    } else {
        // For TV shows, default to S01E01
        videoPlayer.src = `${serverUrl}/tv/${currentMovieId}/1/1`;
    }
}

// Fetch movie details from TMDB via YOUR SECURE Worker
async function fetchMovieDetails() {
    try {
        const endpoint = `${currentMediaType}/${movieId}`;
        const response = await fetch(`${WORKER_URL}?path=${endpoint}`);
        if (!response.ok) throw new Error('Failed to fetch movie details');
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie details:', error);
        return null;
    }
}

// Fetch recommendations
async function fetchRecommendations() {
    try {
        const endpoint = `${currentMediaType}/${movieId}/recommendations`;
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
    const title = movie.title || movie.name;
    document.getElementById('pageTitle').textContent = `${title} - Modern Fact Stories`;
    
    // Setup video player with default server
    loadVideoPlayer();
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
    const status = movie.status || '';
    
    const metaHTML = `
        <div class="meta-item">
            <span class="rating-badge">⭐ ${rating}</span>
        </div>
        <div class="meta-item">📅 ${year}</div>
        ${runtime ? `<div class="meta-item">⏱️ ${runtime}</div>` : ''}
        ${status ? `<div class="meta-item">📊 ${status}</div>` : ''}
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

// Display recommendations with smooth animation
function displayRecommendations(movies) {
    const grid = document.getElementById('recommendationsGrid');
    
    if (!movies || movies.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No recommendations available</p>';
        return;
    }
    
    const moviesHTML = movies.slice(0, 12).map(movie => {
        const posterPath = movie.poster_path 
            ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
            : 'https://via.placeholder.com/342x513?text=No+Poster';
        const title = movie.title || movie.name;
        const type = movie.media_type || currentMediaType;
        
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
    
    // Stagger animation
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

// Share movie function
function shareMovie() {
    const title = document.getElementById('movieTitle').textContent;
    const url = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: title,
            text: `Check out ${title} on Modern Fact Stories!`,
            url: url
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

// Load movie page
async function loadMoviePage() {
    if (!movieId) {
        document.getElementById('loadingState').innerHTML = '<p>Error: No movie ID provided</p>';
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
        document.getElementById('loadingState').innerHTML = '<p>Error loading movie details</p>';
    }
}

// Start loading
loadMoviePage();
