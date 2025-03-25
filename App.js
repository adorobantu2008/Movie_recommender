import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [movies, setMovies] = useState([]);
  const [thumbsUpMovies, setThumbsUpMovies] = useState([]);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const [cardSlideDirection, setCardSlideDirection] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [modalMovie, setModalMovie] = useState(null);

  useEffect(() => {
    axios
      .get('http://127.0.0.1:5000/top100')
      .then((response) => setMovies(response.data))
      .catch((error) => console.error('Error fetching data:', error));
  }, []);

  const handleThumbsUp = (movieTitle) => {
    if (!thumbsUpMovies.includes(movieTitle)) {
      setThumbsUpMovies([...thumbsUpMovies, movieTitle]);
    }
    slideCard('right');
  };

  const handleThumbsDown = () => {
    slideCard('left');
  };

  const slideCard = (direction) => {
    setCardSlideDirection(direction);
    setTimeout(() => {
      setCardSlideDirection(null);
      setCurrentMovieIndex((prevIndex) => prevIndex + 1);
    }, 300);
  };

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const params = new URLSearchParams();
      thumbsUpMovies.forEach(title => params.append('titles[]', title));
      const response = await axios.get('http://127.0.0.1:5000/recommendations?' + params.toString());
      setRecommendations(response.data);
      setShowRecommendations(true);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const currentMovie = movies.slice(0, 10)[currentMovieIndex];

  return (
    <div className={`App`}>
      <header className={`App-header ${modalMovie ? 'blurred' : ''}`}>
        <h1>Movie Recommender</h1>

        {showRecommendations ? (
          <div className="recommendations-list">
            <h2>Recommended Movies</h2>
            <div className="movie-grid">
              {recommendations.map((movie, index) => (
                <MovieCard
                  key={index}
                  title={movie.title}
                  movieId={movie.id}
                  overview={movie.overview}
                  showMore={() => setModalMovie(movie)}
                />
              ))}
            </div>
          </div>
        ) : currentMovie ? (
          <div className={`movie-card ${cardSlideDirection ? `slide-${cardSlideDirection}` : ''}`}>
            <MovieCard
              movieId={currentMovie.id}
              title={currentMovie.title}
              overview={currentMovie.overview}
              showMore={null}
            />
            <h2>{currentMovie.title}</h2>
            <p>{currentMovie.overview}</p>
            <div className="button-container">
              <button className="thumbs-up" onClick={() => handleThumbsUp(currentMovie.title)}>✔️</button>
              <button className="thumbs-down" onClick={handleThumbsDown}>❌</button>
            </div>
          </div>
        ) : (
          <>
            <p>All movies reviewed!</p>
            <button className="get-recommendations" onClick={fetchRecommendations} disabled={loadingRecommendations}>
              {loadingRecommendations ? 'Loading...' : 'Get Recommendations'}
            </button>
            <div className="thumbs-up-list">
              <h2>Thumbs Up Movies</h2>
              <ul>
                {thumbsUpMovies.map((title, index) => (
                  <li key={index}>{title}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </header>

      {modalMovie && (
        <Modal movie={modalMovie} onClose={() => setModalMovie(null)} />
      )}
    </div>
  );
}

function MovieCard({ movieId, title, overview, showMore }) {
  const [poster, setPoster] = useState(null);
  const [loading, setLoading] = useState(true);

  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYjZhMDY1YzQ1YzFkN2UwNzljZTk0ZGFkOTc1NWRkMCIsIm5iZiI6MTc0Mjg2MDM1MC44NzgsInN1YiI6IjY3ZTFmMDNlZWJhNzlmNmZmN2YwNTkwOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.vUF3gP-MuZJ5ktzjC7d6lNkTHfYwSjjF-ZfApCYfvD8',
    },
  };

  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        if (!movieId) return;
        const url = `https://api.themoviedb.org/3/movie/${movieId}/images`;
        const response = await fetch(url, options);
        const data = await response.json();
        if (data.posters && data.posters.length > 0) {
          setPoster(`https://image.tmdb.org/t/p/w300${data.posters[0].file_path}`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovieData();
  }, [movieId]);

  if (loading || !poster) return null;

  return (
    <div className="movie-grid-item">
      <img src={poster} alt="Movie Poster" />
      <p>{title}</p>
      {showMore && (
        <button className="more-btn" onClick={showMore}>⋯</button>
      )}
    </div>
  );
}

function Modal({ movie, onClose }) {
  const [posterUrl, setPosterUrl] = useState(null);

  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYjZhMDY1YzQ1YzFkN2UwNzljZTk0ZGFkOTc1NWRkMCIsIm5iZiI6MTc0Mjg2MDM1MC44NzgsInN1YiI6IjY3ZTFmMDNlZWJhNzlmNmZmN2YwNTkwOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.vUF3gP-MuZJ5ktzjC7d6lNkTHfYwSjjF-ZfApCYfvD8',
    },
  };

  useEffect(() => {
    const fetchPoster = async () => {
      try {
        const url = `https://api.themoviedb.org/3/movie/${movie.id}/images`;
        const response = await fetch(url, options);
        const data = await response.json();
        if (data.posters && data.posters.length > 0) {
          setPosterUrl(`https://image.tmdb.org/t/p/w500${data.posters[0].file_path}`);
        }
      } catch (error) {
        console.error('Error fetching modal poster:', error);
      }
    };

    fetchPoster();
  }, [movie.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {posterUrl && <img src={posterUrl} alt="Movie Poster" style={{ width: '70%', borderRadius: '12px' }} />}
        <h2>{movie.title}</h2>
        <p style={{ marginTop: '1em' }}>{movie.overview}</p>
      </div>
    </div>
  );
}


export default App;
