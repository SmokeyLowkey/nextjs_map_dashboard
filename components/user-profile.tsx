import { useEffect, useState } from 'react';
import { useUser } from "@clerk/nextjs";
import Image from 'next/image';

interface DbUser {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: string;
  avatar: string | null;
}

export default function UserProfile() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncUser = async () => {
      try {
        const response = await fetch('/api/user');
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        const userData = await response.json();
        setDbUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (isClerkLoaded && clerkUser) {
      syncUser();
    }
  }, [isClerkLoaded, clerkUser]);

  if (!isClerkLoaded || isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        Error loading profile
      </div>
    );
  }

  if (!dbUser) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      {dbUser.avatar ? (
        <div className="relative w-8 h-8">
          <Image
            src={dbUser.avatar}
            alt={`${dbUser.name}'s avatar`}
            fill
            className="rounded-full object-cover"
          />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-gray-600 text-sm font-medium">
            {dbUser.name.charAt(0)}
            {dbUser.lastName.charAt(0)}
          </span>
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {dbUser.name} {dbUser.lastName}
        </span>
        <span className="text-xs text-gray-500">
          {dbUser.email}
        </span>
        <input type="hidden" name="role" value={dbUser.role} />
      </div>
    </div>
  );
}
