"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Branch } from "@/types/branch"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { BranchFilter } from "@/components/branch-filter"

export default function ManageBranchesPage() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const [branches, setBranches] = useState<Branch[]>([])
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Check user role
  const userRole = user?.publicMetadata?.role as string
  const canManage = userRole && !['employee', 'demo'].includes(userRole)

  // Function to get color based on branch ID
  const getBranchColor = (branchId: string) => {
    const prefix = branchId.charAt(0).toUpperCase();
    switch (prefix) {
      case 'A':
        return '#22c55e'; // green
      case 'C':
        return '#fbbf24'; // construction yellow
      case 'T':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray for unknown prefixes
    }
  };

  useEffect(() => {
    const fetchBranches = async () => {
      if (!isUserLoaded) return;

      try {
        setError(null);
        const response = await fetch('/api/branches', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          if (response.status === 401) {
            throw new Error('Please sign in to view branches');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view branches');
          }
          throw new Error(errorData?.error || `Failed to load branches (${response.status})`);
        }

        const data: Branch[] = await response.json();
        setBranches(data);
        // Initialize with all branches filtered by type
        const branchTypes = ["A", "T", "C"];
        const filtered = data.filter((branch: Branch) => 
          branchTypes.some(filter => branch.branchId.startsWith(filter))
        );
        setFilteredBranches(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load branches');
        console.error('Error fetching branches:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isUserLoaded) {
      fetchBranches();
    }
  }, [isUserLoaded]);

  const handleFilterChange = (filters: string[]) => {
    // If no filters are selected, show no branches
    if (filters.length === 0) {
      setFilteredBranches([]);
    } else {
      // Show only branches that match the selected filters
      const filtered = branches.filter((branch: Branch) => 
        filters.some(filter => branch.branchId.startsWith(filter))
      );
      setFilteredBranches(filtered);
    }
  };

  const handleDelete = async (branchId: string) => {
    try {
      setDeleteError(null);
      setIsDeleting(branchId);

      const response = await fetch(`/api/branches/${branchId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 401) {
          throw new Error('Please sign in to delete this branch');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to delete branches');
        }
        throw new Error(errorData?.error || `Failed to delete branch (${response.status})`);
      }

      // Remove the deleted branch from both states
      setBranches(prev => prev.filter(branch => branch.id !== branchId));
      setFilteredBranches(prev => prev.filter(branch => branch.id !== branchId));
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete branch');
      console.error('Error deleting branch:', err);
    } finally {
      setIsDeleting(null);
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

  if (!canManage) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Access Denied: </strong>
            <span>You do not have permission to manage branches.</span>
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Manage Branches</h1>
          <div className="space-x-4">
            <Link href="/dashboard">
              <Button variant="outline">View Map</Button>
            </Link>
            <Link href="/dashboard/create">
              <Button>Create New Branch</Button>
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <BranchFilter onFilterChange={handleFilterChange} />
        </div>

        {deleteError && (
          <div className="mb-6 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Error: </strong>
            <span>{deleteError}</span>
          </div>
        )}

        <div className="space-y-4">
          {filteredBranches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:border-gray-300 transition-colors"
              style={{ borderLeft: `4px solid ${getBranchColor(branch.branchId)}` }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{branch.branchName}</h2>
                    <span 
                      className="px-2 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: getBranchColor(branch.branchId) }}
                    >
                      {branch.branchId}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">{branch.address}</p>
                </div>
                <div className="space-x-2">
                  <Link href={`/dashboard/edit/${branch.id}`}>
                    <Button variant="outline" size="sm">Edit</Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(branch.id)}
                    disabled={isDeleting === branch.id}
                  >
                    {isDeleting === branch.id ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </div>
                    ) : (
                      'Delete'
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><span className="font-medium">Phone:</span> {branch.phone}</p>
                  {branch.fax && <p><span className="font-medium">Fax:</span> {branch.fax}</p>}
                </div>
                <div>
                  {branch.toll && <p><span className="font-medium">Toll:</span> {branch.toll}</p>}
                  {branch.itPhone && <p><span className="font-medium">IT Phone:</span> {branch.itPhone}</p>}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-medium mb-2">Departments ({branch.departments.length})</h3>
                <div className="text-sm text-gray-600">
                  {branch.departments.map((dept) => (
                    <span key={dept.name} className="inline-block bg-gray-100 rounded px-2 py-1 mr-2 mb-2">
                      {dept.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {filteredBranches.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {branches.length === 0 
                ? "No branches found. Click \"Create New Branch\" to add one."
                : "No branches match the selected filters."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
