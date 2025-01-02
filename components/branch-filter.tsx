"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Branch } from "@/types/branch"
import { Input } from "./ui/input"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { ScrollArea } from "./ui/scroll-area"

interface BranchFilterProps {
  onFilterChange: (filters: string[]) => void;
  branches?: Branch[];
  onBranchSelect?: (branch: Branch) => void;
  selectedBranch?: Branch | null;
  onAddressSelect?: (coordinates: { lng: number; lat: number }) => void;
}

interface GeocodingFeature {
  place_name: string;
  center: [number, number];
}

export function BranchFilter({ 
  onFilterChange, 
  branches = [], 
  onBranchSelect,
  selectedBranch,
  onAddressSelect
}: BranchFilterProps) {
  // Initialize with no branch types selected
  const branchTypes = ["A", "T", "C"]
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [searchValue, setSearchValue] = useState("")
  const [searchResults, setSearchResults] = useState<GeocodingFeature[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout>()
  const searchRef = useRef<HTMLDivElement>(null)

  // Handle clicks outside of search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
        setSearchValue("");
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const toggleFilter = (filter: string) => {
    const newFilters = activeFilters.includes(filter)
      ? activeFilters.filter(f => f !== filter)
      : [...activeFilters, filter]
    
    setActiveFilters(newFilters)
    onFilterChange(newFilters)
  }

  // Filter branches based on active filters
  const filteredBranches = branches.filter(branch => 
    activeFilters.some(filter => branch.branchId.startsWith(filter))
  )

  // Group filtered branches by type
  const groupedBranches = filteredBranches.reduce((acc, branch) => {
    const type = branch.branchId.charAt(0).toUpperCase()
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(branch)
    return acc
  }, {} as Record<string, Branch[]>)

  useEffect(() => {
    if (!searchValue) {
      setSearchResults([])
      return
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        if (!token) {
          console.error('Mapbox token is missing')
          return
        }

        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            searchValue
          )}.json?access_token=${token}&limit=5&types=address,place`
        )
        
        if (!response.ok) throw new Error('Geocoding request failed')
        
        const data = await response.json()
        setSearchResults(data.features)
      } catch (error) {
        console.error('Error searching addresses:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [searchValue])

  const handleAddressSelect = (feature: GeocodingFeature) => {
    setSearchValue("")  // Clear the search value instead of setting it to place name
    setSearchResults([])
    if (onAddressSelect) {
      onAddressSelect({ lng: feature.center[0], lat: feature.center[1] })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter by Branch Type:</span>
          <div className="flex gap-2">
            {branchTypes.map((type) => (
              <Button
                key={type}
                variant={activeFilters.includes(type) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFilter(type)}
                className="min-w-[40px]"
                style={{
                  backgroundColor: activeFilters.includes(type) 
                    ? type === "A" 
                      ? "#22c55e" 
                      : type === "C"
                      ? "#fbbf24"
                      : "#ef4444"
                    : "transparent",
                  borderColor: type === "A" 
                    ? "#22c55e" 
                    : type === "C"
                    ? "#fbbf24"
                    : "#ef4444",
                  color: activeFilters.includes(type) ? "white" : "inherit"
                }}
              >
                {type}
                {activeFilters.includes(type) && (
                  <Badge variant="secondary" className="ml-1 px-1">
                    ✓
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveFilters([])
                onFilterChange([])
              }}
              className="text-sm text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Branch Quick Select Dropdown */}
        {branches.length > 0 && onBranchSelect && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Quick Select:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="min-w-[200px] justify-between"
                  disabled={filteredBranches.length === 0}
                >
                  <span className="truncate">
                    {selectedBranch && activeFilters.includes(selectedBranch.branchId.charAt(0))
                      ? selectedBranch.branchName 
                      : "Select Branch"}
                  </span>
                  <svg
                    className="ml-2 h-4 w-4 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[300px]">
                <ScrollArea className="h-[400px]">
                  {activeFilters.map((type) => {
                    const typeBranches = groupedBranches[type] || []
                    if (typeBranches.length === 0) return null

                    return (
                      <div key={type}>
                        <DropdownMenuLabel>
                          Type {type} ({typeBranches.length})
                        </DropdownMenuLabel>
                        {typeBranches.map((branch) => (
                          <DropdownMenuItem
                            key={branch.id}
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => onBranchSelect(branch)}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: branch.branchId.startsWith("A")
                                    ? "#22c55e"
                                    : branch.branchId.startsWith("C")
                                    ? "#fbbf24"
                                    : "#ef4444",
                                }}
                              />
                              <span className="truncate">{branch.branchName}</span>
                            </div>
                            {selectedBranch?.id === branch.id && (
                              <svg
                                className="h-4 w-4 text-blue-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                      </div>
                    )
                  })}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Address Search */}
      <div className="relative" ref={searchRef}>
        <Input
          type="text"
          placeholder="Search for an address..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
            <ScrollArea className="max-h-[200px]">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                  onClick={() => handleAddressSelect(result)}
                >
                  {result.place_name}
                </button>
              ))}
            </ScrollArea>
          </div>
        )}
        {isSearching && (
          <div className="absolute right-3 top-2.5">
            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
