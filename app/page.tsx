'use client';

import { useEffect, useRef, useState } from 'react';
import AddLocationForm from './components/AddLocationForm';
import EditLocationModal from './components/EditLocationModal';

// Constants from the original data
const dayColors: Record<string, string> = {
  day1: '#e74c3c',
  day2: '#f39c12',
  day3: '#2ecc71',
  day4: '#3498db',
  day5: '#9b59b6'
};

const dayNames: Record<string, string> = {
  day1: 'North Coast',
  day2: 'UNESCO Villages',
  day3: 'Wine Country',
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
}

export default function Home() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [error, setError] = useState('');

  // Fetch locations from API
  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/locations');
      const result = await response.json();
      
      if (result.success) {
        setLocations(result.data);
        setError('');
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

  // Load locations on component mount
  useEffect(() => {
    fetchLocations();
  }, []);

  const initializeMap = () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
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
      if (locations.length === 0) return;

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
      let cacheStatus = { loaded: 0, total: locations.length, loading: false };

      function createEnhancedInfoContent(location: Location, placeDetails: any) {
        let content = `
          <div class="enhanced-info-window">
            <div class="info-header">
              <div class="info-title">${location.name}</div>
        `;
        if (placeDetails && placeDetails.rating) {
          content += `
            <div class="info-rating">
              ⭐ ${placeDetails.rating}
            </div>
          `;
        }
        content += `
            </div>
            <div class="info-time">${location.time}</div>
            <div class="info-description">${location.description}</div>
        `;
        
        if (location.id) {
          content += `
            <div class="info-actions">
              <button onclick="window.editLocationFromMap(${location.id})" class="info-btn edit-btn">✏️ Edit</button>
              <button onclick="window.deleteLocationFromMap(${location.id})" class="info-btn delete-btn">🗑️ Delete</button>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}" target="_blank" class="info-btn primary">🧭 Directions</a>
            </div>
          `;
        }
        
        content += '</div>';
        return content;
      }

      function populateLocationsList() {
        const container = document.getElementById('locationsList');
        if (!container) return;
        container.innerHTML = '';
        locations.forEach((location, index) => {
          const item = document.createElement('div');
          item.className = 'location-item';
          (item as any).dataset.day = location.day;
          (item as any).dataset.index = index;
          item.innerHTML = `
            <div class="location-day ${location.day}-tag">${dayNames[location.day]}</div>
            <div class="location-name">${location.name}</div>
            <div class="location-time">${location.time}</div>
            <div class="location-description">${location.description}</div>
            <div class="location-actions">
              <button onclick="window.editLocationFromList(${location.id})" class="edit-btn-small">✏️</button>
              <button onclick="window.deleteLocationFromList(${location.id})" class="delete-btn-small">🗑️</button>
            </div>
          `;
          item.addEventListener('click', (e) => {
            if ((e.target as Element).closest('.delete-btn-small') || (e.target as Element).closest('.edit-btn-small')) return;
            highlightLocation(index);
            focusOnLocation(index);
          });
          container.appendChild(item);
        });
      }

      function highlightLocation(index: number) {
        document.querySelectorAll('.location-item').forEach(item => {
          item.classList.remove('active');
        });
        const items = document.querySelectorAll('.location-item');
        if (items[index]) {
          items[index].classList.add('active');
          (items[index] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
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
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lng);
        map.panTo({lat: lat, lng: lng});
        map.setZoom(13);
        setTimeout(() => {
          (window as any).google.maps.event.trigger(markers[index], 'click');
        }, 500);
      }

      function filterByDay(day: string) {
        currentFilter = day;
        document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.day-btn.${day}`)?.classList.add('active');
        const items = document.querySelectorAll('.location-item');
        let visibleCount = 0;
        items.forEach((item, index) => {
          const location = locations[index];
          if (day === 'all' || location.day === day) {
            (item as HTMLElement).style.display = 'block';
            visibleCount++;
          } else {
            (item as HTMLElement).style.display = 'none';
          }
        });
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
        const filteredCount = document.getElementById('filtered-count');
        if (filteredCount) filteredCount.textContent = String(visibleCount);
      }

      function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const isMobile = window.innerWidth <= 768;
        if (!sidebar) return;
        if (isMobile) {
          sidebar.classList.toggle('open');
        } else {
          sidebar.classList.toggle('collapsed');
        }
      }

      function toggleMapType() {
        if (currentMapType === 'roadmap') {
          map.setMapTypeId('satellite');
          currentMapType = 'satellite';
          document.querySelector('.map-control-btn')!.textContent = '🗺️ Map';
        } else {
          map.setMapTypeId('roadmap');
          currentMapType = 'roadmap';
          document.querySelector('.map-control-btn')!.textContent = '🛰️ Satellite';
        }
      }

      function fitAllMarkers() {
        if (locations.length === 0) return;
        const bounds = new (window as any).google.maps.LatLngBounds();
        locations.forEach(location => {
          const lat = parseFloat(location.lat);
          const lng = parseFloat(location.lng);
          bounds.extend({lat: lat, lng: lng});
        });
        map.fitBounds(bounds);
        (window as any).google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
          if (map.getZoom() > 15) {
            map.setZoom(10);
          }
        });
      }

      function toggleTraffic() {
        if (showingTraffic) {
          trafficLayer.setMap(null);
          showingTraffic = false;
          document.querySelectorAll('.map-control-btn')[2].textContent = '🚗 Traffic';
        } else {
          trafficLayer.setMap(map);
          showingTraffic = true;
          document.querySelectorAll('.map-control-btn')[2].textContent = '❌ Traffic';
        }
      }

      // Initialize map
      map = new (window as any).google.maps.Map(mapRef.current as HTMLDivElement, {
        zoom: 10,
        center: { lat: 39.6953, lng: 2.9139 },
        mapTypeId: 'roadmap',
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });
      placesService = new (window as any).google.maps.places.PlacesService(map);
      infoWindow = new (window as any).google.maps.InfoWindow();
      trafficLayer = new (window as any).google.maps.TrafficLayer();

      // Create markers
      locations.forEach((location, index) => {
        // Ensure coordinates are numbers for Google Maps
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lng);
        
        const marker = new (window as any).google.maps.Marker({
          position: {lat: lat, lng: lng},
          map: map,
          title: location.name,
          icon: {
            url: createMarkerIcon(dayColors[location.day]),
            scaledSize: new (window as any).google.maps.Size(25, 25),
            anchor: new (window as any).google.maps.Point(12, 12)
          }
        });
        marker.addListener('click', () => {
          highlightLocation(index);
          const content = createEnhancedInfoContent(location, null);
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        });
        markers[index] = marker;
      });

      // Create route lines
      const dayRoutes: Record<string, any[]> = {
        day1: [], day2: [], day3: [], day4: [], day5: []
      };
      locations.forEach(location => {
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lng);
        dayRoutes[location.day].push({lat: lat, lng: lng});
      });
      Object.keys(dayRoutes).forEach(day => {
        if (dayRoutes[day].length > 1) {
          const polyline = new (window as any).google.maps.Polyline({
            path: dayRoutes[day],
            geodesic: true,
            strokeColor: dayColors[day],
            strokeOpacity: 0.6,
            strokeWeight: 3,
            map: map
          });
          routeLines[day] = polyline;
        }
      });

      fitAllMarkers();
      populateLocationsList();

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
    if (locations.length > 0) {
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

  const handleLocationAdded = () => {
    fetchLocations();
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Mallorca locations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Map</h2>
        <p>{error}</p>
        <button onClick={fetchLocations} className="retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .loading-container, .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .retry-btn {
          padding: 10px 20px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 600;
          margin-top: 20px;
        }

        .add-location-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          margin: 10px 0;
          width: 100%;
          transition: all 0.3s ease;
        }

        .add-location-btn:hover {
          background: #218838;
          transform: translateY(-1px);
        }

        .location-actions {
          margin-top: 8px;
          text-align: right;
          display: flex;
          gap: 5px;
          justify-content: flex-end;
        }

        .delete-btn-small, .edit-btn-small {
          background: #dc3545;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .edit-btn-small {
          background: #f39c12;
        }

        .delete-btn-small:hover {
          background: #c82333;
        }

        .edit-btn-small:hover {
          background: #e67e22;
        }

        .info-btn.delete-btn {
          background: #dc3545;
          color: white;
        }

        .info-btn.delete-btn:hover {
          background: #c82333;
        }

        .info-btn.edit-btn {
          background: #f39c12;
          color: white;
        }

        .info-btn.edit-btn:hover {
          background: #e67e22;
        }
      `}</style>

      <button className="mobile-toggle" onClick={() => (window as any).toggleSidebar()}>☰</button>
      <div className="container">
        <div className="sidebar" id="sidebar">
          <div className="header">
            <h1>🏝️ Mallorca</h1>
            <p>5-Day Island Paradise</p>
            <button className="toggle-btn" onClick={() => (window as any).toggleSidebar()}>◀</button>
          </div>
          
          <div className="stats-container">
            <div className="stats-item">
              <span className="stats-number" id="total-locations">{locations.length}</span>
              Locations
            </div>
            <div className="stats-item">
              <span className="stats-number">5</span>
              Days
            </div>
            <div className="stats-item">
              <span className="stats-number" id="filtered-count">{locations.length}</span>
              Showing
            </div>
          </div>

          <div className="search-container">
            <button 
              className="add-location-btn"
              onClick={() => setShowAddForm(true)}
            >
              ➕ Add New Location
            </button>
          </div>

          <div className="day-filters">
            <button className="day-btn all active" onClick={() => (window as any).filterByDay('all')}>
              <span className="day-marker"></span>
              All Days
            </button>
            <button className="day-btn day1" onClick={() => (window as any).filterByDay('day1')}>
              <span className="day-marker"></span>
              Day 1
            </button>
            <button className="day-btn day2" onClick={() => (window as any).filterByDay('day2')}>
              <span className="day-marker"></span>
              Day 2
            </button>
            <button className="day-btn day3" onClick={() => (window as any).filterByDay('day3')}>
              <span className="day-marker"></span>
              Day 3
            </button>
            <button className="day-btn day4" onClick={() => (window as any).filterByDay('day4')}>
              <span className="day-marker"></span>
              Day 4
            </button>
            <button className="day-btn day5" onClick={() => (window as any).filterByDay('day5')}>
              <span className="day-marker"></span>
              Day 5
            </button>
          </div>
          
          <div className="locations-list" id="locationsList">
            {/* Locations will be populated by JS */}
          </div>
        </div>
        
        <div className="map-container">
          <div ref={mapRef} id="map" style={{ width: "100%", height: "100%" }} />
          <div className="map-controls">
            <button className="map-control-btn" onClick={() => (window as any).toggleMapType()}>🛰️ Satellite</button>
            <button className="map-control-btn" onClick={() => (window as any).fitAllMarkers()}>🎯 Show All</button>
            <button className="map-control-btn" onClick={() => (window as any).toggleTraffic()}>🚗 Traffic</button>
          </div>
        </div>
      </div>

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
    </>
  );
}