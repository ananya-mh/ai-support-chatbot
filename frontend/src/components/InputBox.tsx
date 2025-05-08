// src/components/InputBox.tsx
import { useState } from "react";

interface Props {
  onSend: (text: string) => void;
}

const InputBox = ({ onSend }: Props) => {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 flex gap-2 border-t">
      <input
        type="text"
        className="flex-1 p-2 border rounded-md"
        placeholder="Type your message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
        Send
      </button>
    </form>
  );
};

export default InputBox;
