import express from 'express';
import chatRoutes from './routes/chatRoutes.js';
import cors from 'cors';

const app = express();

app.use(cors())
app.use(express.json()); // For parsing JSON
app.use('/api/chat', chatRoutes); // Chat endpoints

app.get('/', (req, res) => {
  res.send('Chatbot backend is up!');
});

export default app;
