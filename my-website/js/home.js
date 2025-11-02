// Fetch popular movies using your secure Cloudflare Worker
fetch('https://chanfana-openapi-template.gallionmelvs.workers.dev?path=movie/popular')
  .then(response => response.json())
  .then(data => {
      const featured = document.getElementById('featured-list');
      const popular = document.getElementById('popular-list');
      
      // Display first 10 movies in featured section
      data.results.slice(0, 10).forEach(movie => {
          const posterUrl = movie.poster_path 
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
              : 'https://via.placeholder.com/500x750?text=No+Image';
          
          featured.innerHTML += `
              <div class="movie-card">
                  <img src="${posterUrl}" alt="${movie.title}">
                  <div class="movie-title">${movie.title}</div>
                  <div class="movie-meta">${movie.vote_average.toFixed(1)} ★</div>
              </div>`;
      });
      
      // Display next 10 movies in popular section
      data.results.slice(10, 20).forEach(movie => {
          const posterUrl = movie.poster_path 
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
              : 'https://via.placeholder.com/500x750?text=No+Image';
          
          popular.innerHTML += `
              <div class="movie-card">
                  <img src="${posterUrl}" alt="${movie.title}">
                  <div class="movie-title">${movie.title}</div>
                  <div class="movie-meta">${movie.vote_average.toFixed(1)} ★</div>
              </div>`;
      });
  })
  .catch(error => {
      console.error('Error fetching movies:', error);
      // Show error message to user
      document.getElementById('featured-list').innerHTML = '<p>Error loading movies. Please try again later.</p>';
  });
