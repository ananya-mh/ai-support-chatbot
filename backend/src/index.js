import http from 'http';
import dotenv from 'dotenv';
import app from './app.js'; // Include the `.js` extension explicitly
import './events/eventHandlers.js'; // <-- IMPORTANT: initialize event listeners

// Load environment variables from .env
dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
