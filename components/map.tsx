'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Branch, Department } from '@/types/branch';
import { format } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { BranchFilter } from './branch-filter';

interface MapComponentProps {
  branches: Branch[];
  onBranchClick?: (branch: Branch) => void;
  selectedBranch?: Branch | null;
}

export default function MapComponent({ branches, onBranchClick, selectedBranch }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const searchPopupRef = useRef<mapboxgl.Popup | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<string[]>([]);
  const [panelHeight, setPanelHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const startResizeY = useRef<number>(0);
  const startHeight = useRef<number>(0);
  const [activePopupBranch, setActivePopupBranch] = useState<Branch | null>(null);
  // Initialize with all branches since filters are all active by default
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>(branches);

  // Function to clean up search marker and popup
  const cleanupSearch = () => {
    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
      searchMarkerRef.current = null;
    }
    if (searchPopupRef.current) {
      searchPopupRef.current.remove();
      searchPopupRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSearch();
    };
  }, []);

  // Function to get marker color based on branch ID
  const getMarkerColor = (branchId: string) => {
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

  // Function to handle filter changes
  const handleFilterChange = (filters: string[]) => {
    // If no filters are selected, show no branches
    if (filters.length === 0) {
      setFilteredBranches([]);
    } else {
      // Show only branches that match the selected filters
      const filtered = branches.filter(branch => 
        filters.some(filter => branch.branchId.startsWith(filter))
      );
      setFilteredBranches(filtered);
    }
  };

  // Function to handle branch selection from dropdown
  const handleBranchSelect = (branch: Branch) => {
    if (onBranchClick) {
      onBranchClick(branch);
    }
    setIsPanelOpen(true);
    
    // Center map on selected branch
    if (map.current) {
      map.current.flyTo({
        center: [branch.longitude, branch.latitude],
        zoom: 15,
        duration: 1500
      });
    }
  };

  // Update filtered branches when branches prop changes, showing all branches initially
  useEffect(() => {
    // Get all branch types
    const branchTypes = ["A", "T", "C"];
    // Show all branches by default by filtering with all types
    const filtered = branches.filter(branch => 
      branchTypes.some(filter => branch.branchId.startsWith(filter))
    );
    setFilteredBranches(filtered);
  }, [branches]);

  // Function to parse hours string (e.g., "9:00 AM - 5:00 PM") into minutes since midnight
  const parseHoursToMinutes = (timeStr: string): number => {
    try {
      // Parse time like "9:00 AM" into hours and minutes
      const [time, period] = timeStr.trim().split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      
      // Convert to 24-hour format
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return hours * 60 + minutes;
    } catch (error) {
      console.error('Error parsing time:', error);
      return -1;
    }
  };

  // Function to parse hours string (e.g., "9:00 AM - 5:00 PM")
  const parseHours = (hoursStr?: string) => {
    if (!hoursStr || hoursStr.toLowerCase() === 'closed') return null;
    
    try {
      const [startStr, endStr] = hoursStr.split('-').map(str => str.trim());
      const startMinutes = parseHoursToMinutes(startStr);
      const endMinutes = parseHoursToMinutes(endStr);
      
      if (startMinutes === -1 || endMinutes === -1) return null;
      
      return { startMinutes, endMinutes };
    } catch (error) {
      console.error('Error parsing hours:', error);
      return null;
    }
  };

  // Function to get current time in branch's timezone
  const getBranchLocalTime = (branch: Branch) => {
    try {
      return formatInTimeZone(new Date(), branch.timezone, 'h:mm:ss a');
    } catch (error) {
      console.error('Error getting local time:', error);
      return format(new Date(), 'h:mm:ss a');
    }
  };

  // Function to get minutes since midnight for a given time in a timezone
  const getMinutesSinceMidnight = (timezone: string): number => {
    try {
      const now = toZonedTime(new Date(), timezone);
      return now.getHours() * 60 + now.getMinutes();
    } catch (error) {
      console.error('Error getting minutes since midnight:', error);
      return -1;
    }
  };

  // Function to get the current day's hours for parts department
  const getCurrentDayHours = (departments: Department[]) => {
    const partsDept = departments.find(d => 
      typeof d.name === 'string' && d.name.toLowerCase().includes('parts')
    );
    if (!partsDept) return null;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[new Date().getDay()];
    const hoursKey = `${currentDay}Hours` as keyof Department;
    const hours = partsDept[hoursKey];
    return typeof hours === 'string' ? hours : null;
  };

  // Function to determine if a branch is open, closed, or opening soon
  const getBranchStatus = (branch: Branch) => {
    try {
      const currentHours = getCurrentDayHours(branch.departments);
      if (!currentHours || currentHours.toLowerCase() === 'closed') {
        return { status: 'closed', color: '#ef4444' }; // red
      }

      const hours = parseHours(currentHours);
      if (!hours) return { status: 'closed', color: '#ef4444' };

      const currentMinutes = getMinutesSinceMidnight(branch.timezone);
      if (currentMinutes === -1) return { status: 'unknown', color: '#6b7280' };

      // If current time is between start and end time
      if (currentMinutes >= hours.startMinutes && currentMinutes <= hours.endMinutes) {
        return { status: 'open', color: '#22c55e' }; // green
      }

      // If branch opens within the next hour
      const minutesUntilOpen = hours.startMinutes - currentMinutes;
      if (minutesUntilOpen > 0 && minutesUntilOpen <= 60) {
        return { status: 'opening soon', color: '#eab308' }; // yellow
      }

      return { status: 'closed', color: '#ef4444' }; // red
    } catch (error) {
      console.error('Error getting branch status:', error);
      return { status: 'unknown', color: '#6b7280' }; // gray
    }
  };

  // Update active popup content
  useEffect(() => {
    if (!activePopupBranch) return;

    const updatePopupContent = () => {
      const popup = popupsRef.current.find(p => p.isOpen());
      if (popup) {
        const status = getBranchStatus(activePopupBranch);
        const localTime = getBranchLocalTime(activePopupBranch);

        // Remove any existing popup styles
        const existingStyle = document.querySelector('style[data-popup-style]');
        if (existingStyle) {
          existingStyle.remove();
        }

        // Add new popup styles with current status color
        const style = document.createElement('style');
        style.setAttribute('data-popup-style', 'true');
        style.textContent = `
          .branch-popup .mapboxgl-popup-content {
            background-color: ${status.color};
            color: white;
            padding: 10px;
            border-radius: 4px;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .branch-popup .mapboxgl-popup-tip {
            border-top-color: ${status.color};
          }
        `;
        document.head.appendChild(style);

        popup.setHTML(`
          <div>
            <div class="font-bold">${activePopupBranch.branchName}</div>
            <div>Local Time: ${localTime}</div>
            <div>Status: ${status.status}</div>
          </div>
        `);
      }
    };

    // Update immediately and then every second
    updatePopupContent();
    const interval = setInterval(updatePopupContent, 1000);

    return () => clearInterval(interval);
  }, [activePopupBranch]);

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsResizing(true);
    startResizeY.current = e.clientY;
    startHeight.current = panelHeight;
    document.body.style.cursor = 'row-resize';
  };

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const delta = startResizeY.current - e.clientY;
      const newHeight = Math.max(200, Math.min(800, startHeight.current + delta));
      setPanelHeight(newHeight);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  const toggleDepartment = (deptName: string) => {
    setExpandedDepts(prev => 
      prev.includes(deptName) 
        ? prev.filter(name => name !== deptName)
        : [...prev, deptName]
    );
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('Mapbox token is missing');
      return;
    }

    try {
      mapboxgl.accessToken = token;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-96, 37.8],
        zoom: 3
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      cleanupSearch();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const formatDepartmentHours = (dept: Department) => {
    const hours = [
      { day: 'Monday', hours: dept.mondayHours },
      { day: 'Tuesday', hours: dept.tuesdayHours },
      { day: 'Wednesday', hours: dept.wednesdayHours },
      { day: 'Thursday', hours: dept.thursdayHours },
      { day: 'Friday', hours: dept.fridayHours },
      { day: 'Saturday', hours: dept.saturdayHours },
      { day: 'Sunday', hours: dept.sundayHours }
    ].filter(({ hours }) => hours);

    return hours.map(({ day, hours }) => (
      <div key={day} className="flex items-center py-1.5 px-3 rounded-lg hover:bg-gray-100 transition-colors">
        <span className="font-medium text-gray-700 w-28">{day}</span>
        <span className="text-gray-600">{hours}</span>
      </div>
    ));
  };

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers and popups
    markersRef.current.forEach(marker => marker.remove());
    popupsRef.current.forEach(popup => popup.remove());
    markersRef.current = [];
    popupsRef.current = [];

    filteredBranches.forEach((branch) => {
      try {
        const el = document.createElement('div');
        el.className = 'cursor-pointer';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.backgroundImage = 'url(/dark-logo.png)';
        el.style.backgroundSize = 'cover';
        el.style.backgroundColor = getMarkerColor(branch.branchId);
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

        // Create popup
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 25,
          className: 'branch-popup'
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([branch.longitude, branch.latitude])
          .addTo(map.current!);

        // Show popup on hover
        el.addEventListener('mouseenter', () => {
          setActivePopupBranch(branch);
          popup.setLngLat([branch.longitude, branch.latitude]).addTo(map.current!);
        });

        el.addEventListener('mouseleave', () => {
          setActivePopupBranch(null);
          popup.remove();
        });

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setIsPanelOpen(true);
          if (onBranchClick) {
            onBranchClick(branch);
          }
        });

        markersRef.current.push(marker);
        popupsRef.current.push(popup);
      } catch (error) {
        console.error('Error adding marker for branch:', branch, error);
      }
    });

    if (filteredBranches.length > 0) {
      try {
        const bounds = new mapboxgl.LngLatBounds();
        filteredBranches.forEach(branch => {
          bounds.extend([branch.longitude, branch.latitude]);
        });
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15
        });
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  }, [filteredBranches, onBranchClick]);

  useEffect(() => {
    if (selectedBranch) {
      setIsPanelOpen(true);
      if (selectedBranch.departments.length > 0) {
        setExpandedDepts([selectedBranch.departments[0].name]);
      }
    }
  }, [selectedBranch]);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="bg-white border-b border-gray-200 p-4">
        <BranchFilter 
          onFilterChange={handleFilterChange}
          branches={branches}
          onBranchSelect={handleBranchSelect}
          selectedBranch={selectedBranch}
          onAddressSelect={(coordinates) => {
            if (map.current) {
              // Clean up existing search marker and popup
              cleanupSearch();

              // Create a new marker element
              const markerContainer = document.createElement('div');
              markerContainer.className = 'relative';

              // Create marker element
              const el = document.createElement('div');
              el.className = 'cursor-pointer';
              el.style.width = '30px';
              el.style.height = '30px';

              // Create remove button
              const removeButton = document.createElement('button');
              removeButton.className = 'absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors';
              removeButton.innerHTML = `
                <svg class="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              `;
              removeButton.onclick = (e) => {
                e.stopPropagation();
                cleanupSearch();
              };

              markerContainer.appendChild(el);
              markerContainer.appendChild(removeButton);
              el.style.backgroundImage = 'url(/search-marker.svg)';
              el.style.backgroundSize = 'cover';
              el.style.backgroundColor = '#3b82f6'; // blue color for search marker
              el.style.borderRadius = '50%';
              el.style.border = '2px solid white';
              el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

              // Create popup for search marker
              // Create popup for search marker with inline styles
              searchPopupRef.current = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                offset: 25,
                className: 'search-popup'
              })
                .setHTML(`
                  <style>
                    .search-popup .mapboxgl-popup-content {
                      background-color: #3b82f6;
                      color: white;
                      padding: 10px;
                      border-radius: 4px;
                      font-family: system-ui, -apple-system, sans-serif;
                    }
                    .search-popup .mapboxgl-popup-tip {
                      border-top-color: #3b82f6;
                    }
                  </style>
                  <div class="p-2 text-white">Search Location</div>
                `)
                .setLngLat([coordinates.lng, coordinates.lat]);

              // Create and add the new marker using the container
              searchMarkerRef.current = new mapboxgl.Marker(markerContainer)
                .setLngLat([coordinates.lng, coordinates.lat])
                .setPopup(searchPopupRef.current)
                .addTo(map.current);

              // Show popup on hover
              el.addEventListener('mouseenter', () => {
                if (searchPopupRef.current) {
                  searchPopupRef.current.addTo(map.current!);
                }
              });

              el.addEventListener('mouseleave', () => {
                if (searchPopupRef.current) {
                  searchPopupRef.current.remove();
                }
              });

              // Fly to the location
              map.current.flyTo({
                center: [coordinates.lng, coordinates.lat],
                zoom: 15,
                duration: 1500
              });
            }
          }}
        />
      </div>
      <div className="relative flex-1">
        <div ref={mapContainer} className="absolute inset-0" />
      </div>
      
      <div 
        className={`w-full bg-white border-t border-gray-200 transition-all duration-300 ease-in-out shadow-lg ${
          isPanelOpen && selectedBranch ? '' : 'h-0'
        } overflow-hidden relative`}
        style={{ height: isPanelOpen && selectedBranch ? `${panelHeight}px` : '0' }}
      >
        {/* Resize Handle */}
        <div 
          className="absolute top-0 left-0 right-0 h-2 cursor-row-resize group"
          onMouseDown={handleResizeStart}
        >
          {/* Notch/Grabber Element */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-8 h-2 flex flex-col items-center justify-center bg-white border-x border-b border-gray-300 rounded-b-lg shadow-sm">
            <div className="w-4 h-0.5 bg-gray-300 group-hover:bg-blue-400 rounded-full mb-0.5 transition-colors" />
          </div>
        </div>

        {selectedBranch && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-white border-b sticky top-0 z-10 mt-2">
              <h2 className="text-xl font-bold text-gray-900">{selectedBranch.branchName}</h2>
              <button 
                onClick={() => setIsPanelOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4">
                {/* Contact Information */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="text-gray-700 mb-3">{selectedBranch.address}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span> {selectedBranch.phone}
                    </p>
                    {selectedBranch.fax && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Fax:</span> {selectedBranch.fax}
                      </p>
                    )}
                    {selectedBranch.toll && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Toll:</span> {selectedBranch.toll}
                      </p>
                    )}
                    {selectedBranch.itPhone && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">IT Phone:</span> {selectedBranch.itPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Departments */}
                <div className="space-y-4">
                  {selectedBranch.departments.map((dept: Department) => (
                    <div key={dept.name} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleDepartment(dept.name)}
                        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <h3 className="font-semibold text-lg text-gray-900">{dept.name}</h3>
                        <svg
                          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                            expandedDepts.includes(dept.name) ? 'transform rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <div
                        className={`transition-all duration-200 ease-in-out ${
                          expandedDepts.includes(dept.name) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                        } overflow-y-auto`}
                      >
                        <div className="p-4 bg-white border-t border-gray-100">
                          {dept.notes?.content && (
                            <div className="mb-4 bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">
                              {dept.notes.content}
                            </div>
                          )}
                          
                          <div className="mb-4 bg-gray-50 rounded-lg py-2">
                            {formatDepartmentHours(dept)}
                          </div>

                          {dept.contacts.length > 0 && (
                            <div className="space-y-3">
                              {dept.contacts.map((contact, idx: number) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                                  <div className="font-medium text-gray-900">{contact.jobTitle}</div>
                                  {contact.name && <div className="text-gray-700 mt-1">{contact.name}</div>}
                                  {contact.phone && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      <span className="font-medium">Phone:</span> {contact.phone}
                                    </div>
                                  )}
                                  {contact.email && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      <span className="font-medium">Email:</span> {contact.email}
                                    </div>
                                  )}
                                  {contact.notes?.content && (
                                    <div className="text-sm text-gray-600 mt-2 bg-gray-100 p-2 rounded">
                                      {contact.notes.content}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
