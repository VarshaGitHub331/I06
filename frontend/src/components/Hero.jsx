"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Hero() {
  const router = useRouter();

  function handleClick() {
    console.log("Get Started button clicked!");
    router.push("/signup");
  }

  return (
    <section className="relative text-white text-center h-[420px] md:h-[580px] lg:h-[750px] overflow-hidden">
      {/* Background Image */}
      <Image
        src="/images/Future1.jpeg"
        alt="Sidebar Image"
        fill
        className="object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center px-6 md:px-12 lg:px-20">
        <div className="max-w-2xl md:max-w-3xl lg:max-w-5xl">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-snug md:leading-[3.5rem] lg:leading-[4.5rem] tracking-wide mb-8">
            AI-Powered Voice-to-SQL
            <br />
            with Schema-Aware Query Correction
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 leading-relaxed md:leading-loose lg:leading-loose max-w-xl mx-auto mb-4">
            Ask complex questions, and let our AI construct accurate SQL
            queries, even correcting schema mismatches for seamless data
            retrieval.
          </p>
          <button
            onClick={handleClick}
            className="mt-4 px-6 py-3 text-sm sm:text-base font-medium bg-blue-500 rounded-full hover:bg-blue-600 transition duration-200 shadow-md"
          >
            Get Started
          </button>
        </div>
      </div>
    </section>
  );
}
