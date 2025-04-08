"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3001/user/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name: username }),
      });
      console.log(res);
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Something went wrong");
        return;
      }
      console.log(data);
      // save token and user using context
      login({ token: data.token, user: data.user });

      // redirect to dashboard/home
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Error during registration");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#0f172a] px-4">
      <div className="w-full max-w-md bg-[#1e293b] p-8 pt-10 pb-10 rounded-xl shadow-lg">
        <h2 className="text-white text-2xl font-bold mb-8 text-center">
          Create an account
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded bg-gray-800 text-white focus:outline-none"
          />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-3 rounded bg-gray-800 text-white focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded bg-gray-800 text-white focus:outline-none"
          />
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign Up
          </button>
          <p className="text-center text-sm text-gray-300">
            Already have an account?{" "}
            <a
              href="/login"
              className="underline text-blue-400 hover:text-blue-500"
            >
              Log in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
