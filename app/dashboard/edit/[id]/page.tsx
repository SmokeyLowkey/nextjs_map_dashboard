"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import BranchForm from "@/components/branch-form"
import { Branch, BranchFormData } from "@/types/branch"

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function EditBranchPage({ params }: PageProps) {
  const [id, setId] = useState<string | null>(null);
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const [branch, setBranch] = useState<Branch | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Check user role
  const userRole = user?.publicMetadata?.role as string
  const canEdit = userRole && !['employee', 'demo'].includes(userRole)

  // Get the id from params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    const fetchBranch = async () => {
      if (!isUserLoaded || !id) return;
      
      try {
        setError(null);
        const response = await fetch(`/api/branches/${id}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          if (response.status === 401) {
            throw new Error('Please sign in to view this branch');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view this branch');
          } else if (response.status === 404) {
            throw new Error('Branch not found');
          }
          throw new Error(errorData?.error || `Failed to load branch (${response.status})`);
        }

        const data = await response.json();
        setBranch(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load branch');
        console.error('Error fetching branch:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isUserLoaded && id) {
      fetchBranch();
    }
  }, [id, isUserLoaded]);

  const handleSubmit = async (data: BranchFormData) => {
    if (!id) return;

    try {
      setSubmitError(null);
      const response = await fetch(`/api/branches/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 401) {
          throw new Error('Please sign in to update this branch');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to update this branch');
        } else if (response.status === 404) {
          throw new Error('Branch not found');
        }
        throw new Error(errorData?.error || `Failed to update branch (${response.status})`);
      }

      // Navigate back to branches list after successful update
      router.push('/dashboard/manage');
      router.refresh();
    } catch (err) {
      console.error('Error updating branch:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to update branch');
      throw err; // Re-throw to let the form component handle the error UI
    }
  };

  if (!isUserLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Access Denied: </strong>
            <span>You do not have permission to edit branches.</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button 
              onClick={() => {
                setError(null);
                setIsLoading(true);
                router.refresh();
              }}
              className="mt-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-1 px-2 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !id) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <strong className="font-bold">Not Found: </strong>
            <span>Branch not found</span>
          </div>
        </div>
      </div>
    );
  }

  const initialData: BranchFormData = {
    branchId: branch.branchId,
    branchName: branch.branchName,
    latitude: branch.latitude.toString(),
    longitude: branch.longitude.toString(),
    address: branch.address,
    phone: branch.phone,
    fax: branch.fax || '',
    toll: branch.toll || '',
    itPhone: branch.itPhone || '',
    timezone: branch.timezone || 'America/Toronto',
    departments: branch.departments
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit Branch: {branch.branchName}</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
          >
            ← Back
          </button>
        </div>

        {submitError && (
          <div className="mb-6 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Error: </strong>
            <span>{submitError}</span>
          </div>
        )}

        <BranchForm 
          initialData={initialData}
          onSubmit={handleSubmit}
          isEditing={true}
        />
      </div>
    </div>
  );
}
