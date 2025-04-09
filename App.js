import React, { useState, useEffect, useCallback} from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import './App.css';

function App() {
  const [movies, setMovies] = useState([]);
  const [thumbsUpMovies, setThumbsUpMovies] = useState([]);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const [cardSlideDirection, setCardSlideDirection] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [page, setPage] = useState('home');
  const [modalMovie, setModalMovie] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedRatings, setSelectedRatings] = useState([]);
  const [movieRatings, setMovieRatings] = useState({});
  const currentMovie = movies[currentMovieIndex];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'N/A'];

  const initializeGoogleSignIn = () => {
    if (window.google) {
      setTimeout(() => {
        const signInDiv = document.getElementById('g_id_signin');
        if (signInDiv) {
          window.google.accounts.id.initialize({
            client_id: '867763481585-ei8ai8vlgc38hmv9t3jqeghdgrjv97v3.apps.googleusercontent.com',
            callback: handleCredentialResponse,
          });
          window.google.accounts.id.renderButton(signInDiv, {
            theme: 'outline',
            size: 'large'
          });
        }
      }, 100);
    }
  };

  

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
  
    try {
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYjZhMDY1YzQ1YzFkN2UwNzljZTk0ZGFkOTc1NWRkMCIsIm5iZiI6MTc0Mjg2MDM1MC44NzgsInN1YiI6IjY3ZTFmMDNlZWJhNzlmNmZmN2YwNTkwOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.vUF3gP-MuZJ5ktzjC7d6lNkTHfYwSjjF-ZfApCYfvD8',
        },
      };
  
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}`,
        options
      );
      const data = await response.json();
      setSearchResults(data.results.slice(0, 3)); // Limit to 3 results
    } catch (error) {
      console.error('Error searching movies:', error);
    }
  };

  const slideCard = useCallback((direction) => {
    setCardSlideDirection(direction);
    setTimeout(() => {
      setCardSlideDirection(null);
      setCurrentMovieIndex((prevIndex) => prevIndex + 1);
    }, 300);
  }, []);

  const fetchRecommendations = useCallback(async () => {
    if (thumbsUpMovies.length === 0) return;
    setLoadingRecommendations(true);
    try {
      const params = new URLSearchParams();
      thumbsUpMovies.forEach((title) => params.append('titles[]', title));
      const response = await axios.get('http://127.0.0.1:5000/recommendations?' + params.toString());
      setRecommendations(response.data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [thumbsUpMovies]);

  const handleThumbsUp = useCallback((movieTitle) => {
    if (!thumbsUpMovies.includes(movieTitle)) {
      setThumbsUpMovies(prev => [...prev, movieTitle]);
      fetchRecommendations();
    }
    slideCard('right');
  }, [thumbsUpMovies, fetchRecommendations, slideCard]);

  const handleThumbsDown = useCallback(() => {
    slideCard('left');
  }, [slideCard]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (page === 'review' && currentMovie) {
        if (event.key === 'ArrowRight') {
          handleThumbsUp(currentMovie.title);
        } else if (event.key === 'ArrowLeft') {
          handleThumbsDown();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [page, currentMovie, handleThumbsUp, handleThumbsDown]);

  useEffect(() => {
    if (recommendations.length > 0) {
      const fetchMovieRatings = async () => {
        const options = {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYjZhMDY1YzQ1YzFkN2UwNzljZTk0ZGFkOTc1NWRkMCIsIm5iZiI6MTc0Mjg2MDM1MC44NzgsInN1YiI6IjY3ZTFmMDNlZWJhNzlmNmZmN2YwNTkwOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.vUF3gP-MuZJ5ktzjC7d6lNkTHfYwSjjF-ZfApCYfvD8',
          },
        };

        for (const movie of recommendations) {
          try {
            const url = `https://api.themoviedb.org/3/movie/${movie.id}?append_to_response=credits,release_dates`;
            const response = await fetch(url, options);
            const data = await response.json();
            const rating = data.release_dates?.results.find((r) => r.iso_3166_1 === 'US')?.release_dates[0]?.certification || 'N/A';
            setMovieRatings(prev => ({
              ...prev,
              [movie.id]: rating
            }));
          } catch (error) {
            console.error('Error fetching movie rating:', error);
          }
        }
      };

      fetchMovieRatings();
    }
  }, [recommendations]);

  useEffect(() => {
    axios
      .get('http://127.0.0.1:5000/top100')
      .then((response) => setMovies(response.data))
      .catch((error) => console.error('Error fetching data:', error));
    if (window.google) {
      initializeGoogleSignIn();
    } else {
      window.onload = initializeGoogleSignIn;
    }
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      const userObject = jwtDecode(response.credential);
      setUser(userObject);
      
      await axios.post('http://127.0.0.1:5000/login', {
        token: response.credential
      });
  
      const watchlistResponse = await axios.get(`http://127.0.0.1:5000/watchlist?user_id=${userObject.sub}`);
      setWatchlist(watchlistResponse.data);
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const toggleRatingFilter = (rating) => {
    setSelectedRatings(prev => 
      prev.includes(rating)
        ? prev.filter(r => r !== rating)
        : [...prev, rating]
    );
  };

  const toggleWatchlistMovie = async (movie) => {
    if (!user) {
      alert('Please sign in to manage your watchlist');
      return;
    }
  
    const isInWatchlist = watchlist.some((item) => item.id === movie.id);
    const updatedWatchlist = isInWatchlist
      ? watchlist.filter((item) => item.id !== movie.id)
      : [...watchlist, movie];
    
    try {
      await axios.post('http://127.0.0.1:5000/watchlist', {
        user_id: user.sub,
        watchlist: updatedWatchlist
      });
      setWatchlist(updatedWatchlist);
    } catch (error) {
      console.error('Error updating watchlist:', error);
    }
  };


  const renderPage = () => {
    switch (page) {
      case 'home':
        return (
          <div className="home-page">
            <h2>Welcome to Movie Recommender!</h2>
            <p>
              {user 
                ? "Discover your next favorite movie by rating our top picks or exploring your watchlist."
                : "Sign in to start rating movies and get personalized recommendations!"}
            </p>
            {user ? (
              <button className="start-btn" onClick={() => setPage('review')}>
                Start Rating
              </button>
            ) : (
              <div className="sign-in-info">
                <p>Please sign in with your Google account to:</p>
                <ul>
                  <li>Rate movies</li>
                  <li>Get personalized recommendations</li>
                  <li>Create and manage your watchlist</li>
                </ul>
              </div>
            )}
          </div>
        );
      case 'review':
        if (!user) {
          return (
            <div className="home-page">
              <h2>Sign in Required</h2>
              <p>Please sign in to rate movies and get recommendations.</p>
            </div>
          );
        }
        return currentMovie ? (
          <div className={`movie-card ${cardSlideDirection ? `slide-${cardSlideDirection}` : ''}`}>
            <MovieCard movieId={currentMovie.id} />
            <h2>{currentMovie.title}</h2>
            <p>{currentMovie.overview}</p>
            <div className="button-container">
              <button className="thumbs-up" onClick={() => handleThumbsUp(currentMovie.title)}>✔️</button>
              <button className="thumbs-down" onClick={handleThumbsDown}>❌</button>
            </div>
          </div>
        ) : (
          <div className="home-page">
            <p>All movies reviewed! Check your recommendations.</p>
            <button className="start-btn" onClick={() => setPage('recommendations')}>
              View Recommendations
            </button>
          </div>
        );
        case 'recommendations':

  return (
    <div className="recommendations-page">
      <h2>Recommended Movies</h2>
      <div className="rating-filters">
        {RATINGS.map(rating => (
          <button
            key={rating}
            className={`rating-filter ${selectedRatings.includes(rating) ? 'active' : ''}`}
            onClick={() => toggleRatingFilter(rating)}
          >
            {rating}
          </button>
        ))}
      </div>
      {loadingRecommendations ? (
        <p>Loading recommendations...</p>
      ) : recommendations.length > 0 ? (
        <div className="movie-grid">
          {recommendations
            .filter(movie => 
              selectedRatings.length === 0 || 
              selectedRatings.includes(movieRatings[movie.id] || 'N/A')
            )
            .map((movie, index) => (
              <MovieCard
                key={index}
                movieId={movie.id}
                title={movie.title}
                overview={movie.overview}
                showMore={() => setModalMovie({...movie, rating: movieRatings[movie.id]})}
                onImageClick={() => toggleWatchlistMovie(movie)}
                isInWatchlist={watchlist.some((item) => item.id === movie.id)}
              />
            ))}
        </div>
      ) : (
        <p>No recommendations yet. Rate some movies to get started!</p>
      )}
    </div>
  );
      case 'watchlist':
        return (
          <div className="watchlist-page">
            <h2>My Watchlist</h2>
            {watchlist.length > 0 ? (
              <div className="watchlist-row">
                {watchlist.map((movie, index) => (
                  <MovieCard
                    key={index}
                    movieId={movie.id}
                    title={movie.title}
                    overview={movie.overview}
                    showMore={() => setModalMovie(movie)}
                    onImageClick={() => toggleWatchlistMovie(movie)}
                    isInWatchlist={true}
                  />
                ))}
              </div>
            ) : (
              <p>No movies in your watchlist yet.</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="App">
      <header className={`App-header ${modalMovie ? 'blurred' : ''}`}>
        <div className="nav-bar">
          <h1>Movie Recommender</h1>
          
          {user && (
            <div className="search-container">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
              />
              {searchResults.length > 0 && searchQuery && (
                <div className="search-results">
                  {searchResults.map((movie) => (
                    <div
                      key={movie.id}
                      className="search-result-item"
                    >
                      <span onClick={() => setModalMovie(movie)}>
                        {movie.title}
                      </span>
                      <button 
                        className="add-to-watchlist"
                        onClick={() => toggleWatchlistMovie(movie)}
                      >
                        {watchlist.some((item) => item.id === movie.id) ? '✓' : '+'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
  
          <div>
            <button onClick={() => setPage('home')}>Home</button>
            {user && (
              <>
                <button onClick={() => setPage('review')}>Rate Movies</button>
                <button onClick={() => setPage('recommendations')}>Recommendations</button>
                <button onClick={() => setPage('watchlist')}>Watchlist</button>
              </>
            )}
            {user ? (
              <button 
              className="sign-out-btn" 
              onClick={() => {
                setUser(null);
                setWatchlist([]);
                setPage('home');
                initializeGoogleSignIn();
              }}
            >
              Sign Out
            </button>
            ) : (
              <div id="g_id_signin"></div>
            )}
          </div>
        </div>
        {renderPage()}
      </header>
      {modalMovie && <Modal movie={modalMovie} onClose={() => setModalMovie(null)} />}
    </div>
  );
}

function MovieCard({ movieId, title, overview, showMore, onImageClick, isInWatchlist }) {
  const [poster, setPoster] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoster = async () => {
      try {
        if (!movieId) return;
        
        const options = {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYjZhMDY1YzQ1YzFkN2UwNzljZTk0ZGFkOTc1NWRkMCIsIm5iZiI6MTc0Mjg2MDM1MC44NzgsInN1YiI6IjY3ZTFmMDNlZWJhNzlmNmZmN2YwNTkwOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.vUF3gP-MuZJ5ktzjC7d6lNkTHfYwSjjF-ZfApCYfvD8',
          },
        };

        const url = `https://api.themoviedb.org/3/movie/${movieId}/images`;
        const response = await fetch(url, options);
        const data = await response.json();
        if (data.posters && data.posters.length > 0) {
          setPoster(`https://image.tmdb.org/t/p/w500${data.posters[0].file_path}`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPoster();
  }, [movieId]);

  if (loading || !poster) return null;

  return (
    <div className="movie-grid-item">
      <img
        src={poster}
        alt="Movie Poster"
        onClick={onImageClick}
        className={isInWatchlist ? 'in-watchlist' : ''}
      />
      <p>{title}</p>
      {showMore && (
        <button className="more-btn" onClick={showMore}>⋯</button>
      )}
    </div>
  );
}

function Modal({ movie, onClose }) {
  const [movieData, setMovieData] = useState(null);

  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        const options = {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYjZhMDY1YzQ1YzFkN2UwNzljZTk0ZGFkOTc1NWRkMCIsIm5iZiI6MTc0Mjg2MDM1MC44NzgsInN1YiI6IjY3ZTFmMDNlZWJhNzlmNmZmN2YwNTkwOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.vUF3gP-MuZJ5ktzjC7d6lNkTHfYwSjjF-ZfApCYfvD8',
          },
        };

        const url = `https://api.themoviedb.org/3/movie/${movie.id}?append_to_response=credits,release_dates`;
        const response = await fetch(url, options);
        const data = await response.json();
        setMovieData({
          poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
          title: data.title,
          overview: data.overview,
          rating: data.release_dates?.results.find((r) => r.iso_3166_1 === 'US')?.release_dates[0]?.certification || 'N/A',
          actors: data.credits?.cast.slice(0, 3).map((actor) => actor.name) || [],
          genres: data.genres?.map((g) => g.name) || [],
          runtime: data.runtime,
          releaseDate: data.release_date,
          voteAverage: data.vote_average,
          tagline: data.tagline,
        });
      } catch (error) {
        console.error('Error fetching modal data:', error);
      }
    };
    fetchMovieData();
  }, [movie.id]);

  if (!movieData) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {movieData.poster && <img src={movieData.poster} alt="Movie Poster" />}
        <h2>
          {movieData.title} <span className="rating">({movieData.rating})</span>
        </h2>
        {movieData.tagline && <p className="tagline">"{movieData.tagline}"</p>}
        <div className="modal-details">
          <p><strong>Overview:</strong> {movieData.overview}</p>
          <p><strong>Starring:</strong> {movieData.actors.join(', ')}</p>
          <p><strong>Genres:</strong> {movieData.genres.join(', ')}</p>
          <p><strong>Runtime:</strong> {movieData.runtime} min</p>
          <p><strong>Release Date:</strong> {movieData.releaseDate}</p>
          <p><strong>User Rating:</strong> {movieData.voteAverage}/10</p>
        </div>
      </div>
    </div>
  );
}

export default App;
