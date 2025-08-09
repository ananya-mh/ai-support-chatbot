import mongoose from 'mongoose'

// const chatMessageSchema = new mongoose.Schema({
//   _id: { type: String, required: true },
//   sessionId: { type: String, required: true },
//   senderType: { type: String, required: true }, // 'user' or 'agent'
//   message: { type: String, required: true },
//   timestamp: { type: Date, required: true },
// });

const chatMessageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  sender: { type: String, enum: ['user', 'bot'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, {
  collection: 'ChatMessage'
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;

