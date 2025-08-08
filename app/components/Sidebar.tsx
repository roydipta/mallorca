// app/components/Sidebar.tsx
'use client';

import React from 'react';
import { MapPin, Plus, Edit3, Trash2, Clock, Navigation } from 'lucide-react';

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

interface DayFilter {
  key: string;
  label: string;
  color: string;
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  locations: Location[];
  filteredLocations: Location[];
  dayNames: Record<string, string>;
  dayFilters: DayFilter[];
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  activeLocation: number | null;
  handleLocationClick: (index: number) => void;
  editLocation: (location: Location) => void;
  deleteLocation: (id: number) => void;
  isMobile: boolean;
  setShowAddForm: () => void;
  isFromCache?: boolean;
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  locations,
  filteredLocations,
  dayNames,
  dayFilters,
  activeFilter,
  setActiveFilter,
  activeLocation,
  handleLocationClick,
  editLocation,
  deleteLocation,
  isMobile,
  setShowAddForm,
  isFromCache = false
}: SidebarProps) {
  return (
    <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
            <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
              {sidebarCollapsed ? '▶' : '◀'}
            </button>
          )}
        </div>
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
          {isFromCache && (
            <div className="stat-item cache-indicator">
              <div className="stat-number">📋</div>
              <div className="stat-label">Cached</div>
            </div>
          )}
        </div>
      </div>

      <div className="add-location-section">
        <button onClick={setShowAddForm} className="add-location-btn">
          <Plus size={20} />
          Add New Location
        </button>
      </div>

      <div className="filters-section">
        <h3 className="filters-title">Filter by Day</h3>
        <div className="filters-horizontal">
          {dayFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`filter-btn-horizontal ${filter.color} ${activeFilter === filter.key ? 'active' : ''}`}
            >
              <div className={`filter-marker ${filter.color}`}></div>
              <span className="filter-label">{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="locations-section">
        {filteredLocations.map((location, index) => (
          <div
            key={location.id}
            onClick={() => handleLocationClick(index)}
            className={`location-card ${activeLocation === index ? 'active' : ''}`}
          >
            <div className="location-header">
              <span className={`day-badge ${location.day}`}>{dayNames[location.day]}</span>
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

            <h4 className="location-name">{location.name}</h4>

            <div className="location-time">
              <Clock size={16} />
              <span>{location.time}</span>
            </div>

            {location.travelTimeFromPrevious && (
              <div className="travel-time">
                <Navigation size={14} />
                <span>{location.travelTimeFromPrevious} from previous</span>
                {location.distanceFromPrevious && (
                  <span className="travel-distance">({location.distanceFromPrevious}) ~est</span>
                )}
              </div>
            )}

            {!location.travelTimeFromPrevious && index > 0 && index < filteredLocations.length && filteredLocations[index - 1]?.day === location.day && (
              <div className="travel-time-loading">
                <Navigation size={14} />
                <span>Calculating travel time...</span>
              </div>
            )}

            <p className="location-description">{location.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
