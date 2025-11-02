require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const TMDB_API_KEY = process.env.TMDB_API_KEY;

app.get('/api/movies', async (req, res) => {
  try {
    const tmdbResponse = await axios.get(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    const movies = tmdbResponse.data.results.map(movie => ({
      title: movie.title,
      poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      rating: movie.vote_average
    }));
    res.json({ netflixOriginals: movies, popularOnDisney: movies });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

app.listen(3000, () => console.log('Backend running on http://localhost:3000'));
