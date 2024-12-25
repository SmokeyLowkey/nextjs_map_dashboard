"use client";

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export function UserSync() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function syncUser() {
      if (isSignedIn) {
        try {
          const response = await fetch('/api/user');
          if (!response.ok) {
            console.error('Failed to sync user with database');
          }
        } catch (error) {
          console.error('Error syncing user:', error);
        }
      }
    }

    if (isLoaded) {
      syncUser();
    }
  }, [isSignedIn, isLoaded]);

  return null;
}
