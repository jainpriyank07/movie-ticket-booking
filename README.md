# MERN Movie Ticket Booking Application

A full-stack movie ticket booking app built with MongoDB, Express.js, React, and Node.js.

Features:
- User registration and login
- Movie listing
- Showtime selection
- Real seat selection
- Booking confirmation
- My bookings history

Project structure:
- backend/
- frontend/

Run backend:
1. cd backend
2. npm install
3. npm run dev

Run frontend:
1. cd frontend
2. npm install
3. npm run dev

Default URLs:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

Make sure MongoDB is running locally on:
mongodb://127.0.0.1:27017/moviebooking

Optional:
Set environment variables in backend:
- PORT=5000
- MONGO_URI=mongodb://127.0.0.1:27017/moviebooking
- JWT_SECRET=moviebookingsecret
