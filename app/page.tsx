'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Calendar, Clock, Plus, Edit3, Trash2, Navigation, Satellite, Car, Grid3X3, X, Menu, Loader2 } from 'lucide-react';

// Modern color scheme with better contrast and sophistication
const dayColors: Record<string, string> = {
  day1: '#ff6b6b',  // Coral red
  day2: '#ffa726',  // Warm orange  
  day3: '#66bb6a',  // Fresh green
  day4: '#42a5f5',  // Sky blue
  day5: '#ab47bc'   // Purple
};

const dayNames: Record<string, string> = {
  day1: 'North Coast Adventure',
  day2: 'UNESCO Heritage Villages', 
  day3: 'Wine Country Journey',
  day4: 'Southeast Paradise',
  day5: 'West Coast Finale'
};

interface Location {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  day: string;
  time: string;
  description: string;
  created_at?: string;
  updated_at?: string;
  travelTimeFromPrevious?: string;
  distanceFromPrevious?: string;
}

// Mock components - replace with your actual components
const AddLocationForm = ({ isOpen, onClose, onLocationAdded }: any) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Location</h2>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <input 
            type="text" 
            placeholder="Location name"
            className="modal-input"
          />
          <textarea 
            placeholder="Description"
            className="modal-textarea"
          />
          <div className="modal-actions">
            <button onClick={onClose} className="modal-btn-secondary">
              Cancel
            </button>
            <button onClick={() => { onLocationAdded(); onClose(); }} className="modal-btn-primary">
              Add Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditLocationModal = ({ isOpen, location, onClose, onLocationUpdated }: any) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Location</h2>
          <button onClick={onClose} className="modal-close-btn">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <input 
            type="text" 
            defaultValue={location?.name}
            placeholder="Location name"
            className="modal-input"
          />
          <textarea 
            defaultValue={location?.description}
            placeholder="Description"
            className="modal-textarea"
          />
          <div className="modal-actions">
            <button onClick={onClose} className="modal-btn-secondary">
              Cancel
            </button>
            <button onClick={() => { onLocationUpdated(); onClose(); }} className="modal-btn-primary">
              Update Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ModernMallorcaMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Changed to false for mobile-first
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeLocation, setActiveLocation] = useState<number | null>(null);

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      // Auto-open sidebar on desktop
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch locations from API
  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/locations');
      const result = await response.json();
      
      if (result.success) {
        const locationsData = result.data;
        setLocations(locationsData);
        setError('');
        
        // Calculate travel times using simple distance calculation (no API needed)
        console.log('Calculating travel times using distance estimation...');
        const locationsWithTravelTimes = await calculateTravelTimes(locationsData);
        setLocations(locationsWithTravelTimes);
      } else {
        setError('Failed to load locations');
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError('Network error loading locations');
    } finally {
      setIsLoading(false);
    }
  };

  // Edit location
  const editLocation = (location: Location) => {
    setEditingLocation(location);
    setShowEditModal(true);
  };

  // Delete location
  const deleteLocation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchLocations(); // Refresh the list
        // Reinitialize the map with new data
        if ((window as any).google && (window as any).google.maps) {
          initializeMap();
        }
      } else {
        alert('Failed to delete location');
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Network error deleting location');
    }
  };

  // Calculate travel times between consecutive locations
  const calculateTravelTimes = async (locations: Location[]) => {
    if (!locations.length || !(window as any).google?.maps) return locations;

    const updatedLocations = [...locations];
    const service = new (window as any).google.maps.DistanceMatrixService();

    // Group locations by day and sort by time
    const locationsByDay: Record<string, Location[]> = {};
    locations.forEach(location => {
      if (!locationsByDay[location.day]) {
        locationsByDay[location.day] = [];
      }
      locationsByDay[location.day].push(location);
    });

    // Sort each day's locations by time
    Object.keys(locationsByDay).forEach(day => {
      locationsByDay[day].sort((a, b) => a.time.localeCompare(b.time));
    });

    // Calculate travel times for each day
    for (const day of Object.keys(locationsByDay)) {
      const dayLocations = locationsByDay[day];
      
      for (let i = 1; i < dayLocations.length; i++) {
        const origin = dayLocations[i - 1];
        const destination = dayLocations[i];
        
        try {
          const result = await new Promise<any>((resolve, reject) => {
            service.getDistanceMatrix({
              origins: [{ lat: origin.lat, lng: origin.lng }],
              destinations: [{ lat: destination.lat, lng: destination.lng }],
              travelMode: (window as any).google.maps.TravelMode.DRIVING,
              unitSystem: (window as any).google.maps.UnitSystem.METRIC,
              avoidHighways: false,
              avoidTolls: false
            }, (response: any, status: any) => {
              if (status === 'OK') {
                resolve(response);
              } else {
                reject(status);
              }
            });
          });

          if (result.rows[0]?.elements[0]?.status === 'OK') {
            const element = result.rows[0].elements[0];
            const locationIndex = updatedLocations.findIndex(loc => 
              loc.id === destination.id || 
              (loc.lat === destination.lat && loc.lng === destination.lng)
            );
            
            if (locationIndex !== -1) {
              updatedLocations[locationIndex] = {
                ...updatedLocations[locationIndex],
                travelTimeFromPrevious: element.duration.text,
                distanceFromPrevious: element.distance.text
              };
            }
          }
        } catch (error) {
          console.error('Error calculating travel time:', error);
        }
      }
    }

    return updatedLocations;
  };

  // Load locations on component mount
  useEffect(() => {
    fetchLocations();
  }, []);

  const initializeMap = () => {
    console.log('Initializing map...'); // Debug log
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key is missing.');
      setError('Google Maps API key is missing.');
      return;
    }

    // Helper to ensure script only loads once
    function loadGoogleMapsScript(cb: () => void) {
      if (typeof window === 'undefined') return;
      if ((window as any).google && (window as any).google.maps) {
        cb();
        return;
      }
      const scriptId = 'google-maps-script';
      if (document.getElementById(scriptId)) {
        (window as any).initMap = cb;
        return;
      }
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      (window as any).initMap = cb;
      document.body.appendChild(script);
    }

    function main() {
      console.log('Map main function called, locations:', locations.length); // Debug log
      
      if (!mapRef.current) {
        console.error('Map container ref not available');
        return;
      }
      
      // Initialize map even without locations (just like original)
      
      function createMarkerIcon(color: string, isHighlighted = false) {
        const size = isHighlighted ? 30 : 25;
        const svg = `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="3"/>
            ${isHighlighted ? '<circle cx="12" cy="12" r="6" fill="white" opacity="0.8"/>' : ''}
          </svg>
        `;
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
      }

      let map: any;
      let markers: any = {};
      let routeLines: any = {};
      let currentFilter = 'all';
      let highlightedMarker: number | null = null;
      let currentMapType = 'roadmap';
      let trafficLayer: any;
      let showingTraffic = false;
      let infoWindow: any;
      let placesService: any;
      let placesCache: { [key: string]: any } = {};

      // Initialize map first with mobile-optimized settings
      map = new (window as any).google.maps.Map(mapRef.current as HTMLDivElement, {
        zoom: 10,
        center: { lat: 39.6953, lng: 2.9139 },
        mapTypeId: 'roadmap',
        // MOBILE OPTIMIZATION: Allow one-finger map movement
        gestureHandling: 'greedy',
        // Additional mobile optimizations
        zoomControl: true,
        zoomControlOptions: {
          position: (window as any).google.maps.ControlPosition.RIGHT_BOTTOM
        },
        mapTypeControl: false, // We have our own control
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });
      console.log('Google Map created successfully:', map); // Debug log
      
      placesService = new (window as any).google.maps.places.PlacesService(map);
      infoWindow = new (window as any).google.maps.InfoWindow({
        maxWidth: isMobile ? 300 : 420
      });
      trafficLayer = new (window as any).google.maps.TrafficLayer();

      // Store map reference globally for access from other functions
      (window as any).mallorcaMap = map;
      (window as any).markers = markers;

      // Only add markers and routes if we have locations
      if (locations.length === 0) {
        // Attach functions to window for button clicks even without locations
        (window as any).filterByDay = (day: string) => setActiveFilter(day);
        (window as any).toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
        (window as any).toggleMapType = () => {
          if (currentMapType === 'roadmap') {
            map.setMapTypeId('satellite');
            currentMapType = 'satellite';
          } else {
            map.setMapTypeId('roadmap');
            currentMapType = 'roadmap';
          }
        };
        (window as any).fitAllMarkers = () => {
          // Do nothing if no markers
        };
        (window as any).toggleTraffic = () => {
          if (showingTraffic) {
            trafficLayer.setMap(null);
            showingTraffic = false;
          } else {
            trafficLayer.setMap(map);
            showingTraffic = true;
          }
        };
        return;
      }

      // Enhanced Places API functions
      async function findNearbyPlace(location: Location): Promise<any> {
        const cacheKey = `${location.lat},${location.lng}`;
        if (placesCache[cacheKey]) {
          return placesCache[cacheKey];
        }

        return new Promise((resolve) => {
          const request = {
            location: new (window as any).google.maps.LatLng(location.lat, location.lng),
            radius: 100, // Search within 100 meters
            type: 'tourist_attraction',
            keyword: location.name
          };

          placesService.nearbySearch(request, (results: any[], status: any) => {
            if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
              // Try to find the best match
              let bestMatch = results[0];
              for (const result of results) {
                if (result.name.toLowerCase().includes(location.name.toLowerCase()) ||
                    location.name.toLowerCase().includes(result.name.toLowerCase())) {
                  bestMatch = result;
                  break;
                }
              }
              placesCache[cacheKey] = bestMatch;
              resolve(bestMatch);
            } else {
              // If no results, try text search
              textSearchPlace(location).then(resolve);
            }
          });
        });
      }

      async function textSearchPlace(location: Location): Promise<any> {
        const cacheKey = `text_${location.name}`;
        if (placesCache[cacheKey]) {
          return placesCache[cacheKey];
        }

        return new Promise((resolve) => {
          const request = {
            query: `${location.name} Mallorca Spain`,
            location: new (window as any).google.maps.LatLng(location.lat, location.lng),
            radius: 1000
          };

          placesService.textSearch(request, (results: any[], status: any) => {
            if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
              placesCache[cacheKey] = results[0];
              resolve(results[0]);
            } else {
              resolve(null);
            }
          });
        });
      }

      async function getPlaceDetails(placeId: string): Promise<any> {
        if (placesCache[`details_${placeId}`]) {
          return placesCache[`details_${placeId}`];
        }

        return new Promise((resolve) => {
          const request = {
            placeId: placeId,
            fields: ['name', 'rating', 'reviews', 'photos', 'formatted_phone_number', 'website', 'opening_hours', 'price_level']
          };

          placesService.getDetails(request, (place: any, status: any) => {
            if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
              placesCache[`details_${placeId}`] = place;
              resolve(place);
            } else {
              resolve(null);
            }
          });
        });
      }

      function getPhotoUrl(photo: any, maxWidth = 400): string {
        return photo.getUrl({ maxWidth });
      }

      async function loadPlaceData(location: Location, locationIndex: number): Promise<any> {
        try {
          const place = await findNearbyPlace(location);
          if (place && place.place_id) {
            const details = await getPlaceDetails(place.place_id);
            return { place, details };
          }
          return { place: null, details: null };
        } catch (error) {
          console.error('Error loading place data:', error);
          return { place: null, details: null };
        }
      }

      function createEnhancedInfoContent(location: Location, placeData: any, isLoading = false) {
        let content = `
          <div class="modern-info-window">
            <div class="info-header">
              <div class="info-title">${location.name}</div>
        `;

        if (isLoading) {
          content += `
            <div class="info-rating">
              <div class="modern-loading-spinner"></div>
            </div>
          `;
        } else if (placeData?.details?.rating) {
          content += `
            <div class="info-rating">
              ⭐ ${placeData.details.rating}
            </div>
          `;
        }

        content += `
            </div>
            <div class="info-time">${location.time}</div>
            <div class="info-description">${location.description}</div>
        `;

        // Add photos if available (mobile-optimized)
        if (!isLoading && placeData?.details?.photos && placeData.details.photos.length > 0) {
          content += '<div class="info-photos">';
          const photosToShow = placeData.details.photos.slice(0, 3); // Show less photos on mobile
          photosToShow.forEach((photo: any, index: number) => {
            const photoUrl = getPhotoUrl(photo, isMobile ? 150 : 200);
            content += `
              <img src="${photoUrl}" 
                   alt="${location.name} photo ${index + 1}" 
                   class="info-photo"
                   onclick="window.open('${getPhotoUrl(photo, 800)}', '_blank')" />
            `;
          });
          content += '</div>';
        }

        // Add place details if available (mobile-optimized)
        if (!isLoading && placeData?.details) {
          const details = placeData.details;
          content += '<div class="info-details">';
          
          if (details.formatted_phone_number) {
            content += `
              <div class="info-detail">
                📞 ${details.formatted_phone_number}
              </div>
            `;
          }
          
          if (details.website) {
            content += `
              <div class="info-detail">
                🌐 <a href="${details.website}" target="_blank" style="color: #42a5f5;">Website</a>
              </div>
            `;
          }
          
          if (details.price_level !== undefined) {
            const priceLevel = '💰'.repeat(details.price_level || 1);
            content += `
              <div class="info-detail">
                ${priceLevel} Price Level
              </div>
            `;
          }
          
          if (details.opening_hours?.weekday_text) {
            const today = new Date().getDay();
            const todayHours = details.opening_hours.weekday_text[today === 0 ? 6 : today - 1];
            content += `
              <div class="info-detail">
                🕒 ${todayHours}
              </div>
            `;
          }
          
          content += '</div>';
        }

        // Add reviews if available (mobile-optimized)
        if (!isLoading && placeData?.details?.reviews && placeData.details.reviews.length > 0) {
          content += '<div class="info-reviews">';
          content += '<h4 style="margin: 10px 0 5px 0; color: #1e293b;">Recent Reviews:</h4>';
          
          const reviewsToShow = placeData.details.reviews.slice(0, isMobile ? 1 : 2); // Show less reviews on mobile
          reviewsToShow.forEach((review: any) => {
            const stars = '⭐'.repeat(review.rating);
            const reviewText = review.text.length > (isMobile ? 80 : 120) ? 
              review.text.substring(0, isMobile ? 80 : 120) + '...' : review.text;
            
            content += `
              <div class="info-review">
                <div class="review-author">${review.author_name}</div>
                <div class="review-rating">${stars}</div>
                <div class="review-text">${reviewText}</div>
              </div>
            `;
          });
          content += '</div>';
        }

        if (location.id) {
          content += `
            <div class="info-actions">
              <button onclick="window.editLocationFromMap(${location.id})" class="modern-info-btn edit-btn">✏️ Edit</button>
              <button onclick="window.deleteLocationFromMap(${location.id})" class="modern-info-btn delete-btn">🗑️ Delete</button>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}" target="_blank" class="modern-info-btn primary">🧭 Directions</a>
          `;
          
          if (placeData?.details?.website) {
            content += `
              <a href="${placeData.details.website}" target="_blank" class="modern-info-btn">🌐 Website</a>
            `;
          }
          
          content += '</div>';
        }
        
        content += '</div>';
        return content;
      }

      function populateLocationsList() {
        // This will be handled by React component instead of direct DOM manipulation
      }

      function highlightLocation(index: number) {
        setActiveLocation(index);
        
        if (highlightedMarker !== null) {
          const oldLocation = locations[highlightedMarker];
          markers[highlightedMarker].setIcon({
            url: createMarkerIcon(dayColors[oldLocation.day], false),
            scaledSize: new (window as any).google.maps.Size(25, 25),
            anchor: new (window as any).google.maps.Point(12, 12)
          });
        }
        const location = locations[index];
        markers[index].setIcon({
          url: createMarkerIcon(dayColors[location.day], true),
          scaledSize: new (window as any).google.maps.Size(30, 30),
          anchor: new (window as any).google.maps.Point(15, 15)
        });
        highlightedMarker = index;
      }

      function focusOnLocation(index: number) {
        const location = locations[index];
        map.panTo({lat: location.lat, lng: location.lng});
        map.setZoom(isMobile ? 12 : 13); // Slightly less zoom on mobile
        setTimeout(() => {
          (window as any).google.maps.event.trigger(markers[index], 'click');
        }, 500);
      }

      function filterByDay(day: string) {
        currentFilter = day;
        setActiveFilter(day);
        
        Object.keys(markers).forEach(index => {
          const location = locations[Number(index)];
          if (day === 'all' || location.day === day) {
            markers[Number(index)].setMap(map);
          } else {
            markers[Number(index)].setMap(null);
          }
        });
        Object.keys(routeLines).forEach(routeDay => {
          if (day === 'all' || routeDay === day) {
            routeLines[routeDay].setOptions({ strokeOpacity: 0.6 });
          } else {
            routeLines[routeDay].setOptions({ strokeOpacity: 0.1 });
          }
        });
      }

      function toggleSidebar() {
        setSidebarOpen(!sidebarOpen);
      }

      function toggleMapType() {
        if (currentMapType === 'roadmap') {
          map.setMapTypeId('satellite');
          currentMapType = 'satellite';
        } else {
          map.setMapTypeId('roadmap');
          currentMapType = 'roadmap';
        }
      }

      function fitAllMarkers() {
        if (locations.length === 0) return;
        const bounds = new (window as any).google.maps.LatLngBounds();
        locations.forEach(location => {
          bounds.extend({lat: location.lat, lng: location.lng});
        });
        map.fitBounds(bounds);
        (window as any).google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
          if (map.getZoom() > (isMobile ? 12 : 15)) {
            map.setZoom(isMobile ? 9 : 10);
          }
        });
      }

      function toggleTraffic() {
        if (showingTraffic) {
          trafficLayer.setMap(null);
          showingTraffic = false;
        } else {
          trafficLayer.setMap(map);
          showingTraffic = true;
        }
      }

      // Initialize map with mobile-optimized settings
      map = new (window as any).google.maps.Map(mapRef.current as HTMLDivElement, {
        zoom: 10,
        center: { lat: 39.6953, lng: 2.9139 },
        mapTypeId: 'roadmap',
        // MOBILE OPTIMIZATION: Allow one-finger map movement
        gestureHandling: 'greedy',
        zoomControl: true,
        zoomControlOptions: {
          position: (window as any).google.maps.ControlPosition.RIGHT_BOTTOM
        },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });
      placesService = new (window as any).google.maps.places.PlacesService(map);
      infoWindow = new (window as any).google.maps.InfoWindow({
        maxWidth: isMobile ? 300 : 420
      });
      trafficLayer = new (window as any).google.maps.TrafficLayer();

      // Create markers with enhanced click handlers
      locations.forEach((location, index) => {
        const marker = new (window as any).google.maps.Marker({
          position: {lat: location.lat, lng: location.lng},
          map: map,
          title: location.name,
          icon: {
            url: createMarkerIcon(dayColors[location.day]),
            scaledSize: new (window as any).google.maps.Size(25, 25),
            anchor: new (window as any).google.maps.Point(12, 12)
          }
        });

        marker.addListener('click', async () => {
          highlightLocation(index);
          
          // Show loading content first
          const loadingContent = createEnhancedInfoContent(location, null, true);
          infoWindow.setContent(loadingContent);
          infoWindow.open(map, marker);
          
          // Load place data in the background
          const placeData = await loadPlaceData(location, index);
          
          // Update with full content
          const finalContent = createEnhancedInfoContent(location, placeData, false);
          infoWindow.setContent(finalContent);
        });

        markers[index] = marker;
      });

      // Preload some place data for better performance
      async function preloadPlaceData() {
        console.log('Preloading place data...');
        const promises = locations.slice(0, 3).map((location, index) => // Load less on mobile
          loadPlaceData(location, index)
        );
        await Promise.all(promises);
        console.log('Initial place data loaded');
      }

      // Create route lines with travel time labels (no API calls)
      const dayRoutes: Record<string, any[]> = {
        day1: [], day2: [], day3: [], day4: [], day5: []
      };
      
      // Group and sort locations by day and time for proper route order
      const locationsByDay: Record<string, Location[]> = {};
      locations.forEach(location => {
        if (!locationsByDay[location.day]) {
          locationsByDay[location.day] = [];
        }
        locationsByDay[location.day].push(location);
      });
      
      // Sort each day's locations by time
      Object.keys(locationsByDay).forEach(day => {
        locationsByDay[day].sort((a, b) => a.time.localeCompare(b.time));
        dayRoutes[day] = locationsByDay[day].map(loc => ({lat: loc.lat, lng: loc.lng}));
      });

      // Create polylines and travel time markers
      Object.keys(dayRoutes).forEach(day => {
        if (dayRoutes[day].length > 1) {
          const polyline = new (window as any).google.maps.Polyline({
            path: dayRoutes[day],
            geodesic: true,
            strokeColor: dayColors[day],
            strokeOpacity: 0.6,
            strokeWeight: isMobile ? 2 : 3, // Thinner lines on mobile
            map: map
          });
          routeLines[day] = polyline;

          // Add travel time labels between consecutive points (using calculated times)
          const dayLocations = locationsByDay[day];
          for (let i = 1; i < dayLocations.length; i++) {
            const prevLocation = dayLocations[i - 1];
            const currentLocation = dayLocations[i];
            
            if (currentLocation.travelTimeFromPrevious) {
              // Calculate midpoint between locations
              const midLat = (prevLocation.lat + currentLocation.lat) / 2;
              const midLng = (prevLocation.lng + currentLocation.lng) / 2;
              
              // Create a custom marker for travel time
              const travelTimeMarker = new (window as any).google.maps.Marker({
                position: { lat: midLat, lng: midLng },
                map: map,
                icon: {
                  path: (window as any).google.maps.SymbolPath.CIRCLE,
                  scale: 0, // Invisible marker
                },
                title: `${currentLocation.travelTimeFromPrevious} (${currentLocation.distanceFromPrevious})`
              });

              // Create info window for travel time (mobile-optimized)
              const travelInfoWindow = new (window as any).google.maps.InfoWindow({
                content: `
                  <div style="
                    background: ${dayColors[day]};
                    color: white;
                    padding: ${isMobile ? '3px 6px' : '4px 8px'};
                    border-radius: 12px;
                    font-size: ${isMobile ? '10px' : '12px'};
                    font-weight: 600;
                    text-align: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                  ">
                    🚗 ${currentLocation.travelTimeFromPrevious}
                    <br>
                    <span style="font-size: ${isMobile ? '8px' : '10px'}; opacity: 0.9;">${currentLocation.distanceFromPrevious}</span>
                    <br>
                    <span style="font-size: ${isMobile ? '7px' : '9px'}; opacity: 0.7;">Estimated</span>
                  </div>
                `,
                disableAutoPan: true
              });

              // Show travel time on hover (desktop) or tap (mobile)
              if (isMobile) {
                travelTimeMarker.addListener('click', () => {
                  travelInfoWindow.open(map, travelTimeMarker);
                  setTimeout(() => travelInfoWindow.close(), 2000);
                });
              } else {
                travelTimeMarker.addListener('mouseover', () => {
                  travelInfoWindow.open(map, travelTimeMarker);
                });
                
                travelTimeMarker.addListener('mouseout', () => {
                  travelInfoWindow.close();
                });
              }
            }
          }
        }
      });

      fitAllMarkers();
      
      // Start preloading place data
      setTimeout(preloadPlaceData, 1000);

      // Attach functions to window for button clicks
      (window as any).filterByDay = filterByDay;
      (window as any).toggleSidebar = toggleSidebar;
      (window as any).toggleMapType = toggleMapType;
      (window as any).fitAllMarkers = fitAllMarkers;
      (window as any).toggleTraffic = toggleTraffic;
    }

    loadGoogleMapsScript(main);
  };

  useEffect(() => {
    // Initialize map regardless of locations, just like the original
    initializeMap();
  }, []);

  // Re-initialize map when locations change (for markers and routes)
  useEffect(() => {
    if (locations.length > 0 && (window as any).google?.maps) {
      initializeMap();
    }
  }, [locations]);

  // Attach delete and edit functions to window for map info windows
  useEffect(() => {
    (window as any).deleteLocationFromMap = deleteLocation;
    (window as any).deleteLocationFromList = deleteLocation;
    (window as any).editLocationFromMap = (id: number) => {
      const location = locations.find(loc => loc.id === id);
      if (location) editLocation(location);
    };
    (window as any).editLocationFromList = (id: number) => {
      const location = locations.find(loc => loc.id === id);
      if (location) editLocation(location);
    };
  }, [locations]);

  const handleLocationAdded = async () => {
    await fetchLocations(); // This will now automatically calculate travel times
  };

  const handleLocationClick = (index: number) => {
    setActiveLocation(index);
    // Close sidebar on mobile after selection
    if (isMobile) {
      setSidebarOpen(false);
    }
    // Add map focusing logic here
    if ((window as any).google && (window as any).google.maps) {
      const location = locations[index];
      // Trigger the map click event for the marker
      setTimeout(() => {
        (window as any).google.maps.event.trigger((window as any).markers?.[index], 'click');
      }, 100);
    }
  };

  const filteredLocations = activeFilter === 'all' 
    ? locations 
    : locations.filter(loc => loc.day === activeFilter);

  const dayFilters = [
    { key: 'all', label: 'All Days', color: 'all' },
    { key: 'day1', label: 'Day 1', color: 'day1' },
    { key: 'day2', label: 'Day 2', color: 'day2' },
    { key: 'day3', label: 'Day 3', color: 'day3' },
    { key: 'day4', label: 'Day 4', color: 'day4' },
    { key: 'day5', label: 'Day 5', color: 'day5' },
  ];

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-icon">
            <Loader2 size={32} />
          </div>
          <div className="loading-text">
            <h3>Loading Mallorca</h3>
            <p>Fetching your travel locations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">
            <X size={32} />
          </div>
          <div className="error-text">
            <h3>Error Loading Map</h3>
            <p>{error}</p>
            <button onClick={fetchLocations} className="retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-container">
        {/* Animated background elements */}
        <div className="background-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mobile-menu-btn"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Main container */}
        <div className="main-container">
          
          {/* Sidebar */}
          <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            
            {/* Header */}
            <div className="sidebar-header">
              <div className="header-content">
                <div className="header-icon">
                  <MapPin size={24} />
                </div>
                <div className="header-text">
                  <h1>Mallorca</h1>
                  <p>5-Day Island Paradise</p>
                </div>
                {!isMobile && (
                  <button 
                    className="sidebar-toggle-btn"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  >
                    {sidebarCollapsed ? '▶' : '◀'}
                  </button>
                )}
              </div>
              
              {/* Stats */}
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">{locations.length}</div>
                  <div className="stat-label">Locations</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">5</div>
                  <div className="stat-label">Days</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{filteredLocations.length}</div>
                  <div className="stat-label">Showing</div>
                </div>
              </div>
            </div>

            {/* Add Location Button */}
            <div className="add-location-section">
              <button 
                onClick={() => setShowAddForm(true)}
                className="add-location-btn"
              >
                <Plus size={20} />
                Add New Location
              </button>
            </div>

            {/* Day Filters */}
            <div className="filters-section">
              <h3 className="filters-title">Filter by Day</h3>
              <div className="filters-horizontal">
                {dayFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => {
                      setActiveFilter(filter.key);
                      if ((window as any).filterByDay) {
                        (window as any).filterByDay(filter.key);
                      }
                    }}
                    className={`filter-btn-horizontal ${filter.color} ${activeFilter === filter.key ? 'active' : ''}`}
                  >
                    <div className={`filter-marker ${filter.color}`}></div>
                    <span className="filter-label">{filter.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Locations List */}
            <div className="locations-section">
              {filteredLocations.map((location, index) => (
                <div
                  key={location.id}
                  onClick={() => handleLocationClick(index)}
                  className={`location-card ${activeLocation === index ? 'active' : ''}`}
                >
                  {/* Day badge */}
                  <div className="location-header">
                    <span 
                      className={`day-badge ${location.day}`}
                    >
                      {dayNames[location.day]}
                    </span>
                    <div className="location-actions">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          editLocation(location);
                        }}
                        className="action-btn edit"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (location.id) deleteLocation(location.id);
                        }}
                        className="action-btn delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Location info */}
                  <h4 className="location-name">
                    {location.name}
                  </h4>
                  
                  <div className="location-time">
                    <Clock size={16} />
                    <span>{location.time}</span>
                  </div>

                  {/* Travel time from previous location */}
                  {location.travelTimeFromPrevious && (
                    <div className="travel-time">
                      <Navigation size={14} />
                      <span>{location.travelTimeFromPrevious} from previous</span>
                      {location.distanceFromPrevious && (
                        <span className="travel-distance">({location.distanceFromPrevious}) ~est</span>
                      )}
                    </div>
                  )}

                  {/* Show calculating message only for consecutive locations without travel time */}
                  {!location.travelTimeFromPrevious && index > 0 && 
                   index < filteredLocations.length && 
                   filteredLocations[index - 1]?.day === location.day && (
                    <div className="travel-time-loading">
                      <Navigation size={14} />
                      <span>Calculating travel time...</span>
                    </div>
                  )}
                  
                  <p className="location-description">
                    {location.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Map Container */}
          <div className="map-container">
            {/* Map */}
            <div ref={mapRef} className="map" />

            {/* Floating map controls */}
            <div className="map-controls">
              <button 
                onClick={() => (window as any).toggleMapType?.()}
                className="map-control-btn"
              >
                <Satellite size={20} />
              </button>
              <button 
                onClick={() => (window as any).fitAllMarkers?.()}
                className="map-control-btn"
              >
                <Navigation size={20} />
              </button>
              <button 
                onClick={() => (window as any).toggleTraffic?.()}
                className="map-control-btn"
              >
                <Car size={20} />
              </button>
              <button className="map-control-btn">
                <Grid3X3 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && isMobile && (
          <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Modal Components */}
        <AddLocationForm
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          onLocationAdded={handleLocationAdded}
        />

        <EditLocationModal
          isOpen={showEditModal}
          location={editingLocation}
          onClose={() => {
            setShowEditModal(false);
            setEditingLocation(null);
          }}
          onLocationUpdated={handleLocationAdded}
        />
      </div>
    </>
  );
}