"use client"

import { useEffect, useState } from "react"
import { Branch } from "@/types/branch"
import MapComponent from "@/components/map"
import { BranchFilter } from "@/components/branch-filter"

export default function DashboardPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBranches = async () => {
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
          throw new Error(errorData?.error || `Failed to load branches (${response.status})`);
        }

        const data = await response.json();
        setBranches(data);
        setFilteredBranches(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load branches');
        console.error('Error fetching branches:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranches();
  }, []);

  const handleFilterChange = (filters: string[]) => {
    if (filters.length === 0) {
      setFilteredBranches(branches);
    } else {
      const filtered = branches.filter(branch => 
        filters.some(filter => branch.branchId.startsWith(filter))
      );
      setFilteredBranches(filtered);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <MapComponent 
        branches={filteredBranches}
        onBranchClick={setSelectedBranch}
        selectedBranch={selectedBranch}
      />
    </div>
  );
}
