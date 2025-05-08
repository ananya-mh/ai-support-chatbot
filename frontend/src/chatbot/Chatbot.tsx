import { useState } from "react";

const Chatbot = () => {
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (input.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: input, isUser: true },
      ]);
      setInput("");
      
      // Send the user message to your backend API
      const response = await fetch("http://localhost:5000/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });
      const data = await response.json();
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: data.reply, isUser: false },
      ]);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto mt-8 bg-white p-4 rounded-xl shadow-lg">
      <div className="overflow-y-auto max-h-96 w-full mb-4">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                msg.isUser ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
      </div>
      <div className="flex w-full">
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
        />
        <button
          onClick={handleSend}
          className="px-4 bg-blue-500 text-white rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
