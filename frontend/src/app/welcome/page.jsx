"use client";
import { useState } from "react";
import { Mic } from "lucide-react"; // You can install lucide-react if not yet
import { useAuth } from "@/context/AuthContext";

export default function WelcomeModal() {
  const [dbUrl, setDbUrl] = useState("");
  const [nlQuery, setNlQuery] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const { user } = useAuth(); // Assuming you have user data in context
  const handleConnect = () => {
    console.log("DB URL:", dbUrl);
    setIsVisible(false);
  };

  const handleMicClick = () => {
    console.log("Mic clicked - start listening...");
    // Insert voice-to-text logic here
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-[#4b546a] text-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
        <h2 className="text-2xl font-semibold mb-2 text-center">
          Welcome {user?.name}
        </h2>
        <p className="text-sm text-gray-300 mb-6 text-center">
          Connect your database and ask questions in natural language.
        </p>

        {/* Database URL input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Database URL"
            value={dbUrl}
            onChange={(e) => setDbUrl(e.target.value)}
            className="flex-1 px-4 py-2 rounded bg-[#1e293b] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleConnect}
            className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded text-white font-medium"
          >
            Connect
          </button>
        </div>

        {/* Mic Button + Query Input */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleMicClick}
            className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition"
            aria-label="Start voice input"
          >
            <Mic className="text-white w-5 h-5" />
          </button>
          <span className="text-sm text-gray-400">
            Tap mic or type your query below
          </span>
        </div>

        {/* Query Textarea */}
        <textarea
          placeholder="Enter your query or prompt here"
          rows={3}
          value={nlQuery}
          onChange={(e) => setNlQuery(e.target.value)}
          className="w-full bg-[#1e293b] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
