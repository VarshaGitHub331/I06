"use client";
import Hero from "../components/Hero";
import FeaturesSection from "../components/FeaturesSection";

export default function HomePage() {
  return (
    <div className="font-sans bg-[#0D1117] min-h-screen">
      <Hero />
      <FeaturesSection />
    </div>
  );
}
