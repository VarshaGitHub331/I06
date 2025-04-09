"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function Navbar() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="bg-[#0D1117] text-white px-4 py-6 flex items-center justify-between relative">
      <Image
        src="/images/logo.png"
        alt="Logo"
        width={150}
        height={150}
        className="rounded-lg cursor-pointer"
        onClick={() => router.push("/")}
      />

      <div className="relative">
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center space-x-2 focus:outline-none"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {menuOpen && user?.id && (
          <div className="absolute right-0 mt-2 w-40 bg-white text-black rounded-md shadow-lg z-50">
            <button
              onClick={() => {
                setMenuOpen(false);
                router.push("/dashboard");
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
