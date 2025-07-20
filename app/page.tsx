// File: app/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Satellite, Car, Grid3X3, X, Menu, Loader2, Navigation } from 'lucide-react';
import Sidebar from './components/Sidebar';
import {
  calculateTravelTimes,
  createMarkerIcon,
  createEnhancedInfoContent,
  Location
} from './components/mapHelpers';
import { initializeGoogleMap } from './services/googleMapService';

const dayColors: Record<string, string> = {
  day1: '#ff6b6b',
  day2: '#ffa726',
  day3: '#66bb6a',
  day4: '#42a5f5',
  day5: '#ab47bc'
};

const dayNames: Record<string, string> = {
  day1: 'North Coast Adventure',
  day2: 'UNESCO Heritage Villages',
  day3: 'Wine Country Journey',
  day4: 'Southeast Paradise',
  day5: 'West Coast Finale'
};

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeLocation, setActiveLocation] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/locations');
      const result = await response.json();
      if (result.success) {
        let data = result.data;
        setError('');
        const withTimes = await calculateTravelTimes(data);
        setLocations(withTimes);
      } else {
        setError('Failed to load locations');
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Network error loading locations');
    } finally {
      setIsLoading(false);
    }
  };

  const editLocation = (location: Location) => {
    setEditingLocation(location);
    setShowEditModal(true);
  };

  const deleteLocation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        await fetchLocations();
        initializeGoogleMap(mapRef, locations, isMobile, dayColors, setError);
      } else {
        alert('Failed to delete location');
      }
    } catch (err) {
      console.error('Error deleting location:', err);
      alert('Network error deleting location');
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // initialize or re-initialize map whenever locations or mobile layout changes
  useEffect(() => {
    initializeGoogleMap(mapRef, locations, isMobile, dayColors, setError);
  }, [locations, isMobile]);

  useEffect(() => {
    (window as any).deleteLocationFromMap = deleteLocation;
    (window as any).deleteLocationFromList = deleteLocation;
    (window as any).editLocationFromMap = (id: number) => {
      const loc = locations.find(l => l.id === id);
      if (loc) editLocation(loc);
    };
    (window as any).editLocationFromList = (id: number) => {
      const loc = locations.find(l => l.id === id);
      if (loc) editLocation(loc);
    };
  }, [locations]);

  const handleLocationAdded = async () => {
    await fetchLocations();
  };

  const handleLocationClick = (index: number) => {
    setActiveLocation(index);
    if (isMobile) setSidebarOpen(false);
    setTimeout(() => {
      (window as any).google.maps.event.trigger(
        (window as any).markers?.[index],
        'click'
      );
    }, 100);
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
        <div className="background-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mobile-menu-btn"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className="main-container">
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            locations={locations}
            filteredLocations={filteredLocations}
            dayNames={dayNames}
            dayFilters={dayFilters}
            activeFilter={activeFilter}
            setActiveFilter={(filter) => {
              setActiveFilter(filter);
              if ((window as any).filterByDay) {
                (window as any).filterByDay(filter);
              }
            }}
            activeLocation={activeLocation}
            handleLocationClick={handleLocationClick}
            editLocation={editLocation}
            deleteLocation={deleteLocation}
            isMobile={isMobile}
            setShowAddForm={() => setShowAddForm(true)}
          />

          <div className="map-container">
            <div ref={mapRef} className="map" />

            <div className="map-controls">
              <button onClick={() => (window as any).toggleMapType?.()} className="map-control-btn">
                <Satellite size={20} />
              </button>
              <button onClick={() => (window as any).fitAllMarkers?.()} className="map-control-btn">
                <Navigation size={20} />
              </button>
              <button onClick={() => (window as any).toggleTraffic?.()} className="map-control-btn">
                <Car size={20} />
              </button>
              <button className="map-control-btn">
                <Grid3X3 size={20} />
              </button>
            </div>
          </div>
        </div>

        {sidebarOpen && isMobile && (
          <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
        )}

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
