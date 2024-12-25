"use client"

import dynamic from "next/dynamic";
import Link from "next/link";

const MapComponent = dynamic(() => import("./map"), {
  ssr: false,
});

export function LandingHero() {
  return (
    <div className="relative min-h-screen">
      {/* Map Background */}
      <div className="absolute inset-0">
        <MapComponent 
          branches={[]}
          onBranchClick={() => {}}
          selectedBranch={null}
        />
      </div>
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 text-white">
        <h1 className="text-5xl font-bold mb-6">Employee Dashboard</h1>
        <p className="text-xl mb-12 max-w-2xl text-center text-gray-200">
          Access and manage branch locations, communicate with AI assistance, and streamline your workflow all in one place.
        </p>
        <Link 
          href="/sign-in"
          className="bg-white text-black px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
