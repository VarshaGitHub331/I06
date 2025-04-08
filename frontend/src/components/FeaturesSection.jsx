// src/components/FeaturesSection.jsx
import FeatureCard from "./FeatureCard";

export default function FeaturesSection() {
  const features = [
    {
      title: "Voice Querying",
      linkText: "Explore",
      image: "/images/Sidebar1.jpeg",
    },
    {
      title: "Schema Correction",
      linkText: "Learn More",
      image: "/images/Sidebar2.png",
    },
    {
      title: "Natural Language Processing",
      linkText: "",
      image: "/images/Future3.png",
    },
  ];

  return (
    <section className="bg-[#0D1117] px-4 py-6 space-y-4">
      <h2 className="text-white text-base font-semibold mb-2 m-auto">
        Ask Anything. Get Data.
      </h2>
      <div className="space-y-3">
        {features.map((f, i) => (
          <FeatureCard key={i} {...f} />
        ))}
      </div>
    </section>
  );
}
