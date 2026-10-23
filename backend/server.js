import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/moviebooking";
const JWT_SECRET = process.env.JWT_SECRET || "moviebookingsecret";

app.use(cors());
app.use(express.json());

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" }
  },
  { timestamps: true }
);

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    genre: { type: String, required: true },
    language: { type: String, required: true },
    rating: { type: Number, default: 8.4 },
    poster: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: String, required: true },
    price: { type: Number, default: 220 },
    showtimes: [{ type: String }],
    bookedSeats: [{ type: Number }],
    totalSeats: { type: Number, default: 40 }
  },
  { timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true },
    showtime: { type: String, required: true },
    seats: [{ type: Number }],
    totalPrice: { type: Number, required: true },
    status: { type: String, default: "confirmed" }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Movie = mongoose.models.Movie || mongoose.model("Movie", movieSchema);
const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

const createToken = (user) => {
  return jwt.sign(
    {
      sub: user._id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const seedMovies = async () => {
  const count = await Movie.countDocuments();

  if (count > 0) return;

  const movies = [
    {
      title: "Dune: Part Two",
      genre: "Sci-Fi",
      language: "English",
      rating: 8.9,
      poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80",
      description: "Epic science fiction drama about power, survival, and destiny.",
      duration: "166 min",
      price: 280,
      showtimes: ["10:30 AM", "1:30 PM", "6:00 PM", "9:30 PM"],
      bookedSeats: [4, 7, 12, 18, 25],
      totalSeats: 40
    },
    {
      title: "Avatar: The Way of Water",
      genre: "Adventure",
      language: "English",
      rating: 8.6,
      poster: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80",
      description: "A breathtaking underwater odyssey full of wonder and action.",
      duration: "192 min",
      price: 320,
      showtimes: ["11:00 AM", "2:00 PM", "5:30 PM", "8:45 PM"],
      bookedSeats: [3, 9, 15, 21, 35],
      totalSeats: 40
    },
    {
      title: "Oppenheimer",
      genre: "Drama",
      language: "English",
      rating: 8.7,
      poster: "https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=800&q=80",
      description: "A gripping historical epic centered on the making of the atomic bomb.",
      duration: "180 min",
      price: 300,
      showtimes: ["9:45 AM", "12:45 PM", "4:15 PM", "7:30 PM"],
      bookedSeats: [5, 11, 19, 24, 31],
      totalSeats: 40
    },
    {
      title: "Spider-Man: Across the Spider-Verse",
      genre: "Animation",
      language: "English",
      rating: 8.8,
      poster: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=800&q=80",
      description: "An animated adventure with stunning visuals and a powerful emotional story.",
      duration: "140 min",
      price: 260,
      showtimes: ["10:00 AM", "12:30 PM", "3:30 PM", "6:45 PM"],
      bookedSeats: [6, 10, 17, 27, 33],
      totalSeats: 40
    }
  ];

  await Movie.insertMany(movies);
};

seedMovies();

app.get("/", (req, res) => {
  res.json({ message: "Movie Ticket Booking API is running" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    const token = createToken(newUser);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/movies", async (req, res) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/movies/:id", async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/bookings/my", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("movie")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/bookings", authMiddleware, async (req, res) => {
  try {
    const { movieId, showtime, seats } = req.body;

    if (!movieId || !showtime || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "Invalid booking data" });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const normalizedSeats = [...new Set(seats.map(Number))];

    const invalidSeats = normalizedSeats.filter(
      (seat) => seat < 1 || seat > movie.totalSeats || movie.bookedSeats.includes(seat)
    );

    if (invalidSeats.length > 0) {
      return res.status(400).json({
        message: `Some seats are already booked or invalid: ${invalidSeats.join(", ")}`
      });
    }

    const totalPrice = normalizedSeats.length * movie.price;

    const booking = await Booking.create({
      user: req.user._id,
      movie: movie._id,
      showtime,
      seats: normalizedSeats,
      totalPrice
    });

    movie.bookedSeats = [...new Set([...movie.bookedSeats, ...normalizedSeats])];
    await movie.save();

    const populatedBooking = await booking.populate("movie");

    res.status(201).json({
      message: "Booking confirmed successfully",
      booking: populatedBooking
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
