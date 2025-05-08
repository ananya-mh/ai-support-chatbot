// src/hooks/useChat.ts
import { useState } from "react";
import { fetchChatResponse } from "../services/chatService";

export const useChat = () => {
  const [messages, setMessages] = useState<{ sender: "user" | "bot"; text: string }[]>([]);

  const handleSend = async (text: string) => {
    setMessages((prev) => [...prev, { sender: "user", text }]);

    const response = await fetchChatResponse(text);
    setMessages((prev) => [...prev, { sender: "bot", text: response }]);
  };

  return { messages, handleSend };
};
