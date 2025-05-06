import express from 'express';
import chatRoutes from './routes/chatRoutes.js';

const app = express();

app.use(express.json()); // For parsing JSON
app.use('/api/chat', chatRoutes); // Chat endpoints

app.get('/', (req, res) => {
  res.send('Chatbot backend is up!');
});

export default app;
