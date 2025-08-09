import http from 'http';
import dotenv from 'dotenv';
import app from './app.js'; // Include the `.js` extension explicitly
import './events/eventHandlers.js'; // <-- IMPORTANT: initialize event listeners
import mongoose from "mongoose"

// Load environment variables from .env
dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const MONGO_URI = process.env.MONGO_URI

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));


server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
