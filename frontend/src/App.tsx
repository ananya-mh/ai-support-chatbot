import React from "react";
import Chatbot from "./chatbot/Chatbot";
import ChatWindow from "./components/ChatWindow";

const App = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <ChatWindow/>
    </div>
  );
};

export default App;
