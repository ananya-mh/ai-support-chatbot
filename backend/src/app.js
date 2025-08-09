import express from 'express';
import chatRoutes from './routes/chatRoutes.js';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

app.use(cors())
app.use(express.json()); // For parsing JSON
app.use('/api/chat', chatRoutes); // Chat endpoints

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
});
app.use(limiter);

app.get('/', (req, res) => {
  res.send('Chatbot backend is up!');
});

export default app;
