"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
export default function Navbar() {
  return (
    <nav className="bg-[#0D1117] text-white px-4 py-6 flex items-center justify-between">
      <Image
        src="/images/logo.png"
        alt="Logo"
        width={150}
        height={150}
        className="rounded-lg"
      />
      <button className="md:hidden">
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
    </nav>
  );
}
