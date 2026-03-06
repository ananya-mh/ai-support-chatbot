/**
 * controllers/chatController.js
 *
 * Updated to use the agentic loop via MCP instead of direct LLM calls.
 */

import { runAgent } from '../services/agentService.js';
import eventBus from '../events/eventBus.js';
import ChatSession from '../schema/chatSessionModel.js';
import ChatMessage from '../schema/chatMessageModel.js';

export const handleMessage = async (req, res) => {
  const { sessionId = 'anonymous', message } = req.body;
  const timestamp = new Date();

  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message are required." });
  }

  try {
    // Emit event for logging/analytics
    eventBus.emit('message.received', { message, timestamp });

    // Save user message
    await ChatMessage.create({
      sessionId,
      sender: 'user',
      text: message,
      timestamp
    });

    // Load conversation history for context
    const history = await ChatMessage.find({ sessionId })
      .sort({ timestamp: 1 })
      .limit(20)
      .lean();

    const conversationHistory = history.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'bot',
      text: msg.text,
    }));

    // Run the agent loop (replaces getLLMResponse)
    console.log(`[Chat] Session ${sessionId}: "${message.substring(0, 80)}..."`);
    const reply = await runAgent(message, conversationHistory);

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