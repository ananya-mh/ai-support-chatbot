import React, { useEffect } from "react";
import Chatbot from "./chatbot/Chatbot";
import ChatWindow from "./components/ChatWindow";

const App = () => {
  useEffect(() => {
    const existingSessionId = localStorage.getItem('sessionId');
    if (!existingSessionId) {
      const newSessionId = generateUUID();
      localStorage.setItem('sessionId', newSessionId);
    }
  }, []);

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <ChatWindow/>
    </div>
  );
};

export default App;
