// subscribes to and handles events

import eventBus from './eventBus.js';

// Message received handler
eventBus.on('message.received', ({ userId, message, timestamp }) => {
  console.log(`[Event] Message received from user ${userId} at ${timestamp}: "${message}"`);
  
  // Optionally: log to a file, analytics service, or database
  // e.g., logMessageToDB(userId, message, timestamp);
}); 