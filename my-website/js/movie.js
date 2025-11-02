// Modern Fact Stories v3.0 - Movie Detail with Episode Selector
// Features: Multi-Player, Episode Browser, Theme Toggle, SEO, Cache

const WORKER_URL = 'https://chanfana-openapi-template.gallionmelvs.workers.dev';

// Multiple video streaming APIs
const VIDEO_SERVERS = {
    vidsrc: 'https://vidsrc.icu/embed',
    vidsrc2: 'https://vidsrc.to/embed',
    embed: 'https://www.2embed.cc/embed'
};

// Cache for API responses (5 min)
const cache = {};
const CACHE_TIME = 5 * 60 * 1000;

let currentMovieId = null;
let currentMediaType = null;
let currentServer = 'vidsrc';
let currentSeason = 1;
let currentEpisode = 1;
let seasonsData = [];

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
        // For TV shows, use current season/episode
        videoPlayer.src = `${serverUrl}/tv/${currentMovieId}/${currentSeason}/${currentEpisode}`;
    }
}

// Fetch with caching
async function fetchWithCache(endpoint) {
    const cacheKey = endpoint;
    const cached = cache[cacheKey];
    
    if (cached && Date.now() - cached.time < CACHE_TIME) {
        return cached.data;
    }
    
    try {
        const response = await fetch(`${WORKER_URL}?path=${endpoint}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        
        cache[cacheKey] = { data, time: Date.now() };
        return data;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// Fetch movie/TV show details
async function fetchMovieDetails() {
    return await fetchWithCache(`${currentMediaType}/${movieId}`);
}

// Fetch recommendations
async function fetchRecommendations() {
    const data = await fetchWithCache(`${currentMediaType}/${movieId}/recommendations`);
    return data ? data.results || [] : [];
}

// Fetch TV show seasons (NEW)
async function fetchSeasons() {
    const data = await fetchWithCache(`tv/${currentMovieId}`);
    return data ? data.seasons || [] : [];
}

// Fetch season episodes (NEW)
async function fetchSeasonEpisodes(seasonNumber) {
    const data = await fetchWithCache(`tv/${currentMovieId}/season/${seasonNumber}`);
    return data ? data.episodes || [] : [];
}

// Load seasons into dropdown (NEW)
async function loadSeasons() {
    const seasons = await fetchSeasons();
    seasonsData = seasons.filter(s => s.season_number > 0); // Remove "Specials"
    
    const seasonSelect = document.getElementById('seasonSelect');
    seasonSelect.innerHTML = seasonsData.map(season => 
        `<option value="${season.season_number}">Season ${season.season_number} (${season.episode_count} episodes)</option>`
    ).join('');
    
    currentSeason = 1;
    loadEpisodes();
}

// Load episodes for current season (NEW)
async function loadEpisodes() {
    const seasonSelect = document.getElementById('seasonSelect');
    currentSeason = parseInt(seasonSelect.value);
    
    const episodesGrid = document.getElementById('episodesGrid');
    episodesGrid.innerHTML = '<div class="episodes-loading">Loading episodes...</div>';
    
    const episodes = await fetchSeasonEpisodes(currentSeason);
    
    if (episodes.length === 0) {
        episodesGrid.innerHTML = '<div class="episodes-loading">No episodes found</div>';
        return;
    }
    
    episodesGrid.innerHTML = episodes.map(ep => `
        <div class="episode-card ${ep.episode_number === currentEpisode ? 'active' : ''}" 
             onclick="playEpisode(${ep.episode_number})">
            <div class="episode-number">EP ${ep.episode_number}</div>
            <div class="episode-name">${ep.name || 'Episode ' + ep.episode_number}</div>
        </div>
    `).join('');
}

// Play selected episode (NEW)
function playEpisode(episodeNumber) {
    currentEpisode = episodeNumber;
    
    // Update active state
    document.querySelectorAll('.episode-card').forEach(card => {
        card.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Load new episode
    loadVideoPlayer();
    
    // Scroll to player
    document.getElementById('videoContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Update SEO meta tags (NEW)
function updateSEO(movie) {
    const title = movie.title || movie.name;
    const description = movie.overview || 'Watch this movie for free in HD quality';
    const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';
    
    document.getElementById('pageTitle').textContent = `${title} - Watch Online Free | Modern Fact Stories`;
    document.getElementById('pageDescription').setAttribute('content', description.substring(0, 160));
    document.getElementById('ogTitle').setAttribute('content', title);
    document.getElementById('ogDescription').setAttribute('content', description.substring(0, 200));
    if (poster) {
        document.getElementById('ogImage').setAttribute('content', poster);
    }
}

// Display movie details
function displayMovieDetails(movie) {
    const title = movie.title || movie.name;
    
    // Update SEO
    updateSEO(movie);
    
    // Setup video player with default server
    loadVideoPlayer();
    document.getElementById('videoContainer').style.display = 'block';
    
    // Show episode selector for TV shows (NEW)
    if (currentMediaType === 'tv') {
        document.getElementById('episodeSelector').style.display = 'block';
        loadSeasons();
    }
    
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
    const seasons = movie.number_of_seasons ? `${movie.number_of_seasons} Seasons` : '';
    
    const metaHTML = `
        <div class="meta-item">
            <span class="rating-badge">⭐ ${rating}</span>
        </div>
        <div class="meta-item">📅 ${year}</div>
        ${runtime ? `<div class="meta-item">⏱️ ${runtime}</div>` : ''}
        ${seasons ? `<div class="meta-item">📺 ${seasons}</div>` : ''}
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
            title: `${title} - Modern Fact Stories`,
            text: `Watch ${title} for free on Modern Fact Stories!`,
            url: url
        }).catch(err => console.log('Share cancelled'));
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            alert('✅ Link copied to clipboard!');
        }).catch(() => {
            alert('Link: ' + url);
        });
    }
}

// Load movie page
async function loadMoviePage() {
    if (!movieId) {
        document.getElementById('loadingState').innerHTML = '<p>❌ Error: No movie ID provided</p>';
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
        document.getElementById('loadingState').innerHTML = '<p>❌ Error loading movie details</p>';
    }
}

// Start loading
loadMoviePage();
