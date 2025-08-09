import { getLLMResponse } from '../services/llmService.js';
import eventBus from '../events/eventBus.js';
import ChatSession from '../schema/chatSessionModel.js';
import ChatMessage from '../schema/chatMessageModel.js';

// export const handleMessage = async (req, res) => {
//   const { userId = 'anonymous', message } = req.body;
//   const timestamp = new Date().toISOString();
//   if (!message) {
//     return res.status(400).json({ error: "Message is required." });
//   }  

//   try {
//     // Emit 'message.received' event
//     eventBus.emit('message.received', { userId, message, timestamp });

//     // Call Gemini API
//     const reply = await getLLMResponse(message);

//     res.json({ reply });
//   } catch (error) {
//     console.error('Gemini API error:', error);
//     res.status(500).json({ error: 'Failed to get response from Gemini' });
//   }
// };


export const handleMessage = async (req, res) => {
  const { sessionId = 'anonymous', message } = req.body;
  const timestamp = new Date();

  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message are required." });
  }

  try {
    // Emit event for logging/analytics (optional)
    eventBus.emit('message.received', { message, timestamp });

    // Save user message
    await ChatMessage.create({
      sessionId,
      sender: 'user',
      text: message,
      timestamp
    });

    // Get LLM response (no history required)
    const reply = await getLLMResponse(message);

    // Save bot response
    await ChatMessage.create({
      sessionId,
      sender: 'bot',
      text: reply,
      timestamp: new Date()
    });

    res.json({ reply });

  } catch (error) {
    console.error('handleMessage error:', error);
    res.status(500).json({ error: 'Error handling message' });
  }
};



export const createSession = async (req, res) => {
  try {
    // const { _id, ticketId, startedAt, initiatedBy } = req.body;

    // const newSession = new ChatSession({
    //   _id,
    //   ticketId,
    //   startedAt: new Date(startedAt),
    //   initiatedBy,
    // });

    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message are required." });
    }

    
// Check or create session
    let session = await ChatSession.findById(sessionId);
    if (!session) {
      session = new ChatSession({
        _id: sessionId,
        startedAt: new Date(),
      });
      await session.save();
    }

    res.status(201).json({ message: 'Chat session created', session: session });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create chat session' });
  }

};