import mongoose from 'mongoose'

// const chatSessionSchema = new mongoose.Schema({
//   _id: { type: String, required: true },
//   ticketId: { type: String, required: true },
//   startedAt: { type: Date, required: true },
//   initiatedBy: { type: String, required: true },
// },

const chatSessionSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // this is the sessionId from frontend
  startedAt: { type: Date, required: true },
  initiatedBy: { type: String, default: 'anonymous' },
  ticketId: { type: String }, // optional, added only when user creates a ticket
},
{
  collection: 'ChatSession'  // <-- match your existing collection name
});

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;
