// src/components/ChatWindow.tsx
import MessageBubble from "./MessageBubble";
import InputBox from "./InputBox";
import { useChat } from "../hooks/useChat";

const ChatWindow = () => {
  const { messages, handleSend } = useChat();

  return (
    <div className="flex flex-col h-screen max-w-xl mx-auto bg-white shadow-md rounded-md overflow-hidden">
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} sender={msg.sender} text={msg.text} />
        ))}
      </div>
      <InputBox onSend={handleSend} />
    </div>
  );
};

export default ChatWindow;
