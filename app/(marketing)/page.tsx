import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-8">
            Employee Dashboard
          </h1>
          <p className="text-xl text-gray-300 mb-12">
            Access and manage branch locations, communicate with AI assistance, and streamline your workflow all in one place.
          </p>
          
          {/* Auth Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-in"
              className="bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-gray-800/50 p-8 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Branch Management</h3>
            <p className="text-gray-300">
              View and manage branch locations with an interactive map interface.
            </p>
          </div>
          <div className="bg-gray-800/50 p-8 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">AI Assistant</h3>
            <p className="text-gray-300">
              Get instant help and insights with our AI-powered chat assistant.
            </p>
          </div>
          <div className="bg-gray-800/50 p-8 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Real-time Updates</h3>
            <p className="text-gray-300">
              Stay informed with real-time updates and notifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
