"use client"

import { useState } from 'react';
import { useUser } from "@clerk/nextjs";
import BranchForm from "@/components/branch-form";
import { useRouter } from "next/navigation";
import { BranchFormData } from "@/types/branch";

export default function CreateBranchPage() {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();
  const [error, setError] = useState<string | null>(null);

  // Check user role
  const userRole = user?.publicMetadata?.role as string;
  const canCreate = userRole && !['employee', 'demo'].includes(userRole);

  if (!isUserLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Access Denied: </strong>
            <span>You do not have permission to create branches.</span>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: BranchFormData) => {
    try {
      setError(null);
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 401) {
          throw new Error('Please sign in to create a branch');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to create branches');
        }
        throw new Error(errorData?.error || `Failed to create branch (${response.status})`);
      }

      // Navigate back to branches list after successful creation
      router.push('/dashboard/manage');
      router.refresh();
    } catch (err) {
      console.error('Error creating branch:', err);
      setError(err instanceof Error ? err.message : 'Failed to create branch');
      throw err; // Re-throw to let the form component handle the error UI
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Create New Branch</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
          >
            ← Back
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Error: </strong>
            <span>{error}</span>
          </div>
        )}

        <BranchForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
