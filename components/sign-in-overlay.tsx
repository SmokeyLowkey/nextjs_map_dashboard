import { SignIn } from "@clerk/nextjs";

export function SignInOverlay() {
  return (
    <div className="fixed inset-0 z-50">
      {/* Dark overlay with blur */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />
      
      {/* Centered sign-in card with frosted glass effect */}
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="bg-white/70 dark:bg-gray-800/70 p-8 rounded-lg shadow-xl backdrop-blur-lg border border-white/20 dark:border-gray-700/30 w-full max-w-md">
          <SignIn afterSignInUrl="/dashboard" routing="hash" />
        </div>
      </div>
    </div>
  );
}
