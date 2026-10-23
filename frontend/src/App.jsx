import { useEffect, useState } from "react";

const API_BASE = "http://localhost:5000/api";

const getStoredUser = () => {
  const saved = localStorage.getItem("movieUser");
  return saved ? JSON.parse(saved) : null;
};

const getStoredToken = () => {
  return localStorage.getItem("movieToken") || "";
};

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(getStoredToken());
  const [movies, setMovies] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [selectedShowtime, setSelectedShowtime] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [message, setMessage] = useState("");

  const selectedMovie =
    movies.find((movie) => movie._id === selectedMovieId) || movies[0] || null;

  useEffect(() => {
    fetchMovies();
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserBookings();
    } else {
      setBookings([]);
    }
  }, [token]);

  useEffect(() => {
    if (!selectedMovie) return;
    if (!selectedShowtime && selectedMovie.showtimes?.length) {
      setSelectedShowtime(selectedMovie.showtimes[0]);
    }
  }, [selectedMovie, selectedShowtime]);

  const fetchMovies = async () => {
    try {
      const response = await fetch(`${API_BASE}/movies`);
      const data = await response.json();

      setMovies(data);

      if (data.length > 0) {
        setSelectedMovieId(data[0]._id);
        setSelectedShowtime(data[0].showtimes[0]);
      }
    } catch (error) {
      console.error("Error fetching movies:", error);
    }
  };

  const fetchUserBookings = async () => {
    try {
      const response = await fetch(`${API_BASE}/bookings/my`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error("Fetch bookings error:", error);
    }
  };

  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    const endpoint =
      authMode === "login" ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;

    const payload =
      authMode === "login"
        ? { email: authForm.email, password: authForm.password }
        : {
            name: authForm.name,
            email: authForm.email,
            password: authForm.password
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      setUser(data.user);
      setToken(data.token);

      localStorage.setItem("movieUser", JSON.stringify(data.user));
      localStorage.setItem("movieToken", data.token);

      setMessage(data.message);
      setAuthForm({ name: "", email: "", password: "" });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("movieUser");
    localStorage.removeItem("movieToken");
    setUser(null);
    setToken("");
    setBookings([]);
    setSelectedSeats([]);
    setMessage("Logged out successfully");
  };

  const toggleSeat = (seatNumber) => {
    if (!selectedMovie) return;

    if (selectedMovie.bookedSeats.includes(seatNumber)) {
      return;
    }

    setSelectedSeats((prev) => {
      if (prev.includes(seatNumber)) {
        return prev.filter((seat) => seat !== seatNumber);
      }

      return [...prev, seatNumber].sort((a, b) => a - b);
    });
  };

  const handleBooking = async () => {
    if (!token) {
      setMessage("Please login first");
      return;
    }

    if (!selectedMovie || !selectedShowtime || selectedSeats.length === 0) {
      setMessage("Choose a movie, a showtime, and some seats");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          movieId: selectedMovie._id,
          showtime: selectedShowtime,
          seats: selectedSeats
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Booking failed");
      }

      setMessage(data.message);
      setSelectedSeats([]);
      fetchMovies();
      fetchUserBookings();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="app-shell">
      {!user ? (
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <p className="eyebrow">Welcome</p>
              <h1>Movie Ticket Booking</h1>
            </div>

            <div className="toggle-buttons">
              <button
                className={authMode === "login" ? "active" : ""}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                className={authMode === "register" ? "active" : ""}
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="auth-form">
              {authMode === "register" && (
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={handleAuthChange}
                  required
                />
              )}

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={authForm.email}
                onChange={handleAuthChange}
                required
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
                value={authForm.password}
                onChange={handleAuthChange}
                required
              />

              <button type="submit" className="primary-btn">
                {authMode === "login" ? "Login" : "Create Account"}
              </button>
            </form>

            {message && <p className="message">{message}</p>}
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <header className="topbar">
            <div>
              <p className="eyebrow">Hello, {user.name}</p>
              <h2>Book your next movie</h2>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </header>

          <div className="content-grid">
            <section className="movie-panel">
              <div className="movie-list">
                {movies.map((movie) => (
                  <div
                    key={movie._id}
                    className={`movie-card ${
                      selectedMovie && selectedMovie._id === movie._id ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedMovieId(movie._id);
                      setSelectedShowtime(movie.showtimes[0]);
                      setSelectedSeats([]);
                    }}
                  >
                    <img src={movie.poster} alt={movie.title} />
                    <div className="movie-info">
                      <div className="movie-header">
                        <h3>{movie.title}</h3>
                        <span>⭐ {movie.rating}</span>
                      </div>
                      <p>{movie.genre} • {movie.language}</p>
                      <p>{movie.duration}</p>
                      <p className="price">₹{movie.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="booking-panel">
              {selectedMovie && (
                <>
                  <div className="booking-header">
                    <h3>{selectedMovie.title}</h3>
                    <p>{selectedMovie.description}</p>
                  </div>

                  <div className="showtime-list">
                    {selectedMovie.showtimes.map((time) => (
                      <button
                        key={time}
                        className={selectedShowtime === time ? "showtime selected" : "showtime"}
                        onClick={() => {
                          setSelectedShowtime(time);
                          setSelectedSeats([]);
                        }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>

                  <div className="seat-map">
                    <div className="screen">SCREEN</div>
                    {[...Array(selectedMovie.totalSeats)].map((_, index) => {
                      const seatNumber = index + 1;
                      const occupied = selectedMovie.bookedSeats.includes(seatNumber);
                      const selected = selectedSeats.includes(seatNumber);

                      return (
                        <button
                          key={seatNumber}
                          type="button"
                          className={`seat ${occupied ? "occupied" : ""} ${selected ? "chosen" : ""}`}
                          onClick={() => toggleSeat(seatNumber)}
                          disabled={occupied}
                        >
                          {seatNumber}
                        </button>
                      );
                    })}
                  </div>

                  <div className="booking-summary">
                    <p>
                      Selected seats:{" "}
                      {selectedSeats.length > 0 ? selectedSeats.join(", ") : "None"}
                    </p>
                    <p>
                      Total: ₹{selectedSeats.length * selectedMovie.price}
                    </p>
                    <button className="primary-btn" onClick={handleBooking}>
                      Confirm Booking
                    </button>
                  </div>
                </>
              )}

              {message && <p className="message">{message}</p>}
            </aside>
          </div>

          <section className="booking-history">
            <h3>Your bookings</h3>
            {bookings.length === 0 ? (
              <p>No bookings yet.</p>
            ) : (
              <div className="history-list">
                {bookings.map((booking) => (
                  <div key={booking._id} className="history-item">
                    <div className="history-img">
                      <img src={booking.movie.poster} alt={booking.movie.title} />
                    </div>
                    <div className="history-details">
                      <h4>{booking.movie.title}</h4>
                      <p>{booking.showtime}</p>
                      <p>Seats: {booking.seats.join(", ")}</p>
                      <p>Total: ₹{booking.totalPrice}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
