import { getLLMResponse } from '../services/llmService.js';

export const handleMessage = async (req, res) => {
  const { message } = req.body;

  try {
    const reply = await getLLMResponse(message);
    res.json({ reply });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to get response from Gemini' });
  }
};
