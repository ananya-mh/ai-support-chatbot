// src/services/chatService.ts
export const fetchChatResponse = async (userMessage: string): Promise<string> => {
    try {
      const res = await fetch("http://localhost:5000/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      return data.reply;
    } catch (err) {
        console.error("Error in fetchChatResponse:", err);
        return "Sorry, something went wrong.";
      }
  };
  