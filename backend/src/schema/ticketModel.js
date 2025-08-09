const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, required: true },
  createdAt: { type: Date, required: true },
});

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;
