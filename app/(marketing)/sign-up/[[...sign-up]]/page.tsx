import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <SignUp 
          afterSignUpUrl="/api/set-role?redirect=/dashboard"
          routing="hash"
        />
      </div>
    </div>
  );
}
