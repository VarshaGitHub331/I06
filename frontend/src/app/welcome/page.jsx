"use client";
import { useState } from "react";
import { Mic } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SmartChart from "@/components/SmartChart"; // 👈 Import your chart component

export default function WelcomeModal() {
  const [dbUrl, setDbUrl] = useState("");
  const [nlQuery, setNlQuery] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [generatingQuery, setGeneratingQuery] = useState(false);
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const [alias, setAlias] = useState("");
  const [chartData, setChartData] = useState(null); // 👈 Chart response state

  const handleConnect = async () => {
    setCreating(true);
    const res = await fetch("http://localhost:3001/connection/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ connectionString: dbUrl, alias, userId: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Connection failed. Please try again.");
      setCreating(false);
      return;
    }
    alert("Connection successful! You can now ask questions.");
    setCreating(false);
  };

  const generateQuery = async () => {
    setGeneratingQuery(true);
    const res = await fetch("http://localhost:3001/connection/generateQuery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ connectionString: dbUrl, prompt: nlQuery }),
    });

    const resultData = await res.json();
    if (!res.ok) {
      alert(resultData.message || "Query generation failed. Try again.");
      setGeneratingQuery(false);
      return;
    }

    alert("Query generation successful!");
    setGeneratingQuery(false);
    setNlQuery(""); // Clear the input field after generation
    setChartData(resultData); // 👈 Store response to show chart
  };

  const handleMicClick = () => {
    console.log("Mic clicked - start listening...");
    // Insert voice-to-text logic here
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-opacity-70 flex justify-center items-start  mt-30">
      <div className="bg-[#4b546a] text-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
        <h2 className="text-2xl font-semibold mb-2 text-center">
          Welcome {user?.name}
        </h2>
        <p className="text-sm text-gray-300 mb-6 text-center">
          Connect your database and ask questions in natural language.
        </p>

        <input
          type="text"
          placeholder="Connection Alias (e.g., MyDB)"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          className="w-full px-4 py-2 mb-3 rounded bg-[#1e293b] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

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
            {!creating ? "Connect" : "Connecting..."}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleMicClick}
            className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition"
          >
            <Mic className="text-white w-5 h-5" />
          </button>
          <span className="text-sm text-gray-400">
            Tap mic or type your query below
          </span>
        </div>

        <textarea
          placeholder="Enter your query or prompt here"
          rows={3}
          value={nlQuery}
          onChange={(e) => setNlQuery(e.target.value)}
          className="w-full bg-[#1e293b] text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={generateQuery}
          className="bg-blue-600 mt-3 transition px-4 py-2 rounded text-white font-medium w-full"
        >
          {!generatingQuery ? "Generate Query" : "Generating..."}
        </button>
      </div>

      {/* Chart Viewer Modal */}
      {chartData && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-40 bg-black bg-opacity-60 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-5xl overflow-auto max-h-[90vh] relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
              onClick={() => setChartData(null)}
            >
              ✕
            </button>
            <SmartChart apiResponse={chartData} />
          </div>
        </div>
      )}
    </div>
  );
}
