"use client";
import { useState } from "react";
import { Mic } from "lucide-react"; // You can install lucide-react if not yet
import { useAuth } from "@/context/AuthContext";

export default function WelcomeModal() {
  const [dbUrl, setDbUrl] = useState("");
  const [nlQuery, setNlQuery] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const { user } = useAuth(); // Assuming you have user data in context
  const [alias, setAlias] = useState("");
  const handleConnect = async () => {
    const res = await fetch("http://localhost:3001/connection/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ connectionString: dbUrl, alias, userId: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Connection failed:", data.message);
      alert(data.message || "Connection failed. Please try again.");

      return;
    }
    console.log("Connection successful:", data);
    alert("Connection successful! You can now ask questions.");
    console.log("Connected to string ");
  };
  const generateQuery = async () => {
    const res = await fetch("http://localhost:3001/connection/generateQuery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ connectionString: dbUrl, prompt: nlQuery }),
    });
    const resultData = await res.json();
    if (!res.ok) {
      console.error("Connection failed:", data.message);
      alert(data.message || "Connection failed. Please try again.");

      return;
    }
    console.log("Generation successful:", resultData.data);
    alert("Query generation successful ! You can now ask questions.");
    console.log("Connected to string ");
  };

  const handleMicClick = () => {
    console.log("Mic clicked - start listening...");
    // Insert voice-to-text logic here
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-opacity-70 flex justify-center items-center z-50 m-auto mt-8">
      <div className="bg-[#4b546a] text-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
        <h2 className="text-2xl font-semibold mb-2 text-center">
          Welcome {user?.name}
        </h2>
        <p className="text-sm text-gray-300 mb-6 text-center">
          Connect your database and ask questions in natural language.
        </p>
        <div className="mb-3">
          <input
            type="text"
            placeholder="Connection Alias (e.g., MyDB)"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            className="w-full px-4 py-2 rounded bg-[#1e293b] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
            Create
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

        <button
          onClick={generateQuery}
          className="bg-blue-600 self-end-safe  transition px-4 py-2 rounded text-white font-medium"
        >
          Generate Query
        </button>
      </div>
    </div>
  );
}
