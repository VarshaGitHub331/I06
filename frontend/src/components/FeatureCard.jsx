// src/components/FeatureCard.jsx
import Image from "next/image";
export default function FeatureCard({ title, linkText, image }) {
  return (
    <div className="flex w-1/2 justify-between m-auto mb-4 text-md items-center gap-4 bg-[#0D1117] rounded-lg border border-gray-700 px-4 py-3">
      <div>
        <h3 className="text-white text-sm font-medium">{title}</h3>
        {linkText && (
          <p className="text-blue-400 text-xs mt-1 cursor-pointer hover:underline">
            {linkText}
          </p>
        )}
      </div>

      <Image
        src={image}
        alt="Feature Icon"
        width={50}
        height={50}
        className="rounded-lg object-cover"
      />
    </div>
  );
}
