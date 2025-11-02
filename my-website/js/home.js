// Replace this with your backend/proxy endpoint to fetch movie data securely
fetch('/api/movies')
  .then(response => response.json())
  .then(data => {
      const featured = document.getElementById('featured-list');
      const popular = document.getElementById('popular-list');
      data.netflixOriginals.forEach(movie => {
          featured.innerHTML += `
              <div class="movie-card">
                  <img src="${movie.poster}" alt="${movie.title}">
                  <div class="movie-title">${movie.title}</div>
                  <div class="movie-meta">${movie.rating} ★</div>
              </div>`;
      });
      data.popularOnDisney.forEach(movie => {
          popular.innerHTML += `
              <div class="movie-card">
                  <img src="${movie.poster}" alt="${movie.title}">
                  <div class="movie-title">${movie.title}</div>
                  <div class="movie-meta">${movie.rating} ★</div>
              </div>`;
      });
  });
