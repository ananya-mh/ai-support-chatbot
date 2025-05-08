// import { getLLMResponse } from '../services/llmService.js';

// export const handleMessage = async (req, res) => {
//   const { message } = req.body;

//   try {
//     const reply = await getLLMResponse(message);
//     res.json({ reply });
//   } catch (error) {
//     console.error('Gemini API error:', error);
//     res.status(500).json({ error: 'Failed to get response from Gemini' });
//   }
// };

import { getLLMResponse } from '../services/llmService.js';
import eventBus from '../events/eventBus.js';

export const handleMessage = async (req, res) => {
  const { userId = 'anonymous', message } = req.body;
  const timestamp = new Date().toISOString();

  try {
    // Emit 'message.received' event
    eventBus.emit('message.received', { userId, message, timestamp });

    // Call Gemini API
    const reply = await getLLMResponse(message);

    res.json({ reply });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to get response from Gemini' });
  }
};
