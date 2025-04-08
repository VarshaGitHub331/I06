"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext"; // adjust if path is different

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3001/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      login({ user: data.user, token: data.token }); // Update context
      router.push("/dashboard"); // Or wherever you redirect
    } catch (err) {
      setError("Server error. Try again later.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#0f172a] px-4 py-6">
      <div className="w-full max-w-md bg-[#1e293b] p-8 pt-10 pb-10 rounded-xl shadow-lg">
        <h2 className="text-white text-2xl font-bold mb-8 text-center">
          Welcome Back
        </h2>
        <form className="space-y-6" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded bg-gray-800 text-white focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded bg-gray-800 text-white focus:outline-none"
            required
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
            Log In
          </button>
          <p className="text-center text-sm text-gray-300">
            Don’t have an account?{" "}
            <a
              href="/signup"
              className="underline text-blue-400 hover:text-blue-500"
            >
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
