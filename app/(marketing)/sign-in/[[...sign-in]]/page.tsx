import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <SignIn afterSignInUrl="/dashboard" routing="hash" />
      </div>
    </div>
  );
}
