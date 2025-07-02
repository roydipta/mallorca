'use client';

import { useState, useEffect, useRef } from 'react';

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

interface EditLocationModalProps {
  isOpen: boolean;
  location: Location | null;
  onClose: () => void;
  onLocationUpdated: () => void;
}

export default function EditLocationModal({ isOpen, location, onClose, onLocationUpdated }: EditLocationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    lat: '',
    lng: '',
    day: 'day1',
    time: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isPlacesLoaded, setIsPlacesLoaded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [showManualEntry, setShowManualEntry] = useState(true);
  const [hasChangedFromPlaces, setHasChangedFromPlaces] = useState(false);
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const autocompleteInstance = useRef<any>(null);

  const dayOptions = [
    { value: 'day1', label: 'Day 1 - North Coast' },
    { value: 'day2', label: 'Day 2 - UNESCO Villages' },
    { value: 'day3', label: 'Day 3 - Wine Country' },
    { value: 'day4', label: 'Day 4 - Southeast Paradise' },
    { value: 'day5', label: 'Day 5 - West Coast Finale' }
  ];

  // Populate form when location changes
  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        day: location.day,
        time: location.time,
        description: location.description
      });
      setError('');
      setSelectedPlace(null);
      setShowManualEntry(true);
      setHasChangedFromPlaces(false);
      if (autocompleteRef.current) {
        autocompleteRef.current.value = '';
      }
    }
  }, [location]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (isOpen && !isPlacesLoaded) {
      const checkGoogleMaps = () => {
        if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
          if (!showManualEntry) {
            initializeAutocomplete();
          }
          setIsPlacesLoaded(true);
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      checkGoogleMaps();
    }
  }, [isOpen, isPlacesLoaded, showManualEntry]);

  const initializeAutocomplete = () => {
    if (autocompleteRef.current && (window as any).google) {
      try {
        // Set up autocomplete to bias towards Mallorca
        const mallorcaBounds = new (window as any).google.maps.LatLngBounds(
          new (window as any).google.maps.LatLng(39.2, 2.3), // Southwest
          new (window as any).google.maps.LatLng(39.9, 3.5)  // Northeast
        );

        autocompleteInstance.current = new (window as any).google.maps.places.Autocomplete(
          autocompleteRef.current,
          {
            bounds: mallorcaBounds,
            strictBounds: false,
            types: ['tourist_attraction'], // Single type to avoid mixing error
            componentRestrictions: { country: 'es' },
            fields: ['place_id', 'name', 'geometry', 'formatted_address', 'types', 'photos', 'rating', 'website']
          }
        );

        autocompleteInstance.current.addListener('place_changed', handlePlaceSelect);
      } catch (error) {
        console.error('Error initializing Autocomplete:', error);
        // Fallback to manual entry if autocomplete fails
        setShowManualEntry(true);
      }
    }
  };

  const handlePlaceSelect = () => {
    const place = autocompleteInstance.current.getPlace();
    
    if (place && place.geometry && place.geometry.location) {
      setSelectedPlace(place);
      setFormData(prev => ({
        ...prev,
        name: place.name || prev.name,
        lat: place.geometry.location.lat().toString(),
        lng: place.geometry.location.lng().toString(),
        description: generateDescription(place)
      }));
      setHasChangedFromPlaces(true);
      setError('');
    } else {
      setError('Please select a valid place from the dropdown');
    }
  };

  const generateDescription = (place: any): string => {
    let description = '';
    
    if (place.types) {
      const relevantTypes = place.types.filter((type: string) => 
        ['tourist_attraction', 'natural_feature', 'beach', 'museum', 'restaurant', 'park'].includes(type)
      );
      if (relevantTypes.length > 0) {
        description += relevantTypes[0].replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) + '. ';
      }
    }

    if (place.rating) {
      description += `Rated ${place.rating}/5 stars. `;
    }

    if (place.formatted_address) {
      const address = place.formatted_address.split(',')[0];
      description += `Located in ${address}.`;
    }

    return description || 'Popular destination in Mallorca.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location?.id) return;

    setIsSubmitting(true);
    setError('');

    // Validate coordinates
    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      setError('Please provide valid coordinates');
      setIsSubmitting(false);
      return;
    }

    // Validate that coordinates are roughly in Mallorca area
    if (lat < 39.0 || lat > 40.0 || lng < 2.0 || lng > 4.0) {
      if (!confirm('These coordinates appear to be outside of Mallorca. Continue anyway?')) {
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          lat: lat,
          lng: lng,
          day: formData.day,
          time: formData.time,
          description: formData.description
        }),
      });

      const result = await response.json();

      if (result.success) {
        onLocationUpdated();
        onClose();
      } else {
        setError(result.error || 'Failed to update location');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Error updating location:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDelete = async () => {
    if (!location?.id) return;
    
    if (!confirm(`Are you sure you want to delete "${location.name}"? This action cannot be undone.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        onLocationUpdated();
        onClose();
      } else {
        setError(result.error || 'Failed to delete location');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Error deleting location:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchToggle = () => {
    setShowManualEntry(!showManualEntry);
    if (showManualEntry && isPlacesLoaded) {
      // Switching to search mode
      setTimeout(initializeAutocomplete, 100);
    } else {
      // Switching to manual entry
      setSelectedPlace(null);
      setHasChangedFromPlaces(false);
      if (autocompleteRef.current) {
        autocompleteRef.current.value = '';
      }
    }
  };

  const resetToOriginal = () => {
    if (location) {
      setFormData({
        name: location.name,
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        day: location.day,
        time: location.time,
        description: location.description
      });
      setSelectedPlace(null);
      setHasChangedFromPlaces(false);
      if (autocompleteRef.current) {
        autocompleteRef.current.value = '';
      }
    }
  };

  if (!isOpen || !location) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Location</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="location-form">
          {error && <div className="error-message">{error}</div>}

          <div className="search-method-toggle">
            <button
              type="button"
              className={`toggle-btn ${!showManualEntry ? 'active' : ''}`}
              onClick={handleSearchToggle}
            >
              🔍 Search Places
            </button>
            <button
              type="button"
              className={`toggle-btn ${showManualEntry ? 'active' : ''}`}
              onClick={() => setShowManualEntry(true)}
            >
              📍 Manual Edit
            </button>
            {hasChangedFromPlaces && (
              <button
                type="button"
                className="reset-btn"
                onClick={resetToOriginal}
                title="Reset to original values"
              >
                ↺ Reset
              </button>
            )}
          </div>

          {!showManualEntry ? (
            <>
              <div className="form-group">
                <label htmlFor="place-search">Search for a Place</label>
                <input
                  ref={autocompleteRef}
                  type="text"
                  id="place-search"
                  placeholder="Search to replace current location..."
                  className="place-search-input"
                />
                <div className="search-help">
                  Search for a new place to replace coordinates and details
                </div>
              </div>

              {selectedPlace && (
                <div className="selected-place-info">
                  <h4>New Place Selected:</h4>
                  <div className="place-preview">
                    <div className="place-name">{selectedPlace.name}</div>
                    {selectedPlace.rating && (
                      <div className="place-rating">⭐ {selectedPlace.rating}</div>
                    )}
                    <div className="place-coordinates">
                      📍 {parseFloat(formData.lat).toFixed(4)}, {parseFloat(formData.lng).toFixed(4)}
                    </div>
                    {selectedPlace.formatted_address && (
                      <div className="place-address">{selectedPlace.formatted_address}</div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="edit-name">Location Name *</label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Cala Formentor"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-lat">Latitude *</label>
                  <input
                    type="number"
                    id="edit-lat"
                    name="lat"
                    value={formData.lat}
                    onChange={handleInputChange}
                    step="any"
                    required
                    placeholder="39.9597"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-lng">Longitude *</label>
                  <input
                    type="number"
                    id="edit-lng"
                    name="lng"
                    value={formData.lng}
                    onChange={handleInputChange}
                    step="any"
                    required
                    placeholder="3.2097"
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-day">Day *</label>
              <select
                id="edit-day"
                name="day"
                value={formData.day}
                onChange={handleInputChange}
                required
              >
                {dayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="edit-time">Time *</label>
              <input
                type="text"
                id="edit-time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                required
                placeholder="e.g., 7:00 AM"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-description">Description *</label>
            <textarea
              id="edit-description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={3}
              placeholder="Describe what makes this location special..."
            />
            {selectedPlace && !showManualEntry && (
              <div className="description-help">
                Description updated from place data. Feel free to edit!
              </div>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={handleDelete} 
              disabled={isSubmitting} 
              className="btn-danger"
            >
              {isSubmitting ? 'Deleting...' : '🗑️ Delete'}
            </button>
            <div className="action-group">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>

        <div className="help-text">
          <p><strong>Last updated:</strong> {location.updated_at ? new Date(location.updated_at).toLocaleDateString() : 'Unknown'}</p>
          <p><strong>Tip:</strong> {!showManualEntry ? 
            'Search for places to automatically update coordinates and details.' : 
            'Use the coordinate validation to ensure the location is in Mallorca.'
          }</p>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 0;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }

        .modal-header {
          padding: 20px 25px;
          border-bottom: 1px solid #eee;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(45deg, #f39c12, #e67e22);
          color: white;
          border-radius: 12px 12px 0 0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5em;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .location-form {
          padding: 25px;
        }

        .search-method-toggle {
          display: flex;
          gap: 5px;
          margin-bottom: 20px;
          background: #f8f9fa;
          padding: 5px;
          border-radius: 8px;
          align-items: center;
        }

        .toggle-btn {
          flex: 1;
          padding: 10px 15px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          color: #6c757d;
          transition: all 0.3s ease;
        }

        .toggle-btn.active {
          background: #f39c12;
          color: white;
          box-shadow: 0 2px 4px rgba(243, 156, 18, 0.3);
        }

        .toggle-btn:hover:not(.active) {
          background: #e9ecef;
          color: #f39c12;
        }

        .reset-btn {
          padding: 8px 12px;
          border: none;
          background: #6c757d;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .reset-btn:hover {
          background: #5a6268;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #2c3e50;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.3s ease;
        }

        .place-search-input {
          width: 100%;
          padding: 12px 15px;
          border: 2px solid #f39c12;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .place-search-input:focus {
          outline: none;
          border-color: #e67e22;
          box-shadow: 0 0 0 3px rgba(243, 156, 18, 0.1);
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #f39c12;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .search-help {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
          font-style: italic;
        }

        .description-help {
          font-size: 12px;
          color: #28a745;
          margin-top: 5px;
          font-style: italic;
        }

        .selected-place-info {
          background: #e8f5e8;
          border: 1px solid #28a745;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        }

        .selected-place-info h4 {
          margin: 0 0 10px 0;
          color: #155724;
          font-size: 14px;
        }

        .place-preview {
          background: white;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #c3e6cb;
        }

        .place-name {
          font-weight: 600;
          color: #2c3e50;
          font-size: 16px;
          margin-bottom: 5px;
        }

        .place-rating {
          color: #ffc107;
          font-size: 14px;
          margin-bottom: 5px;
        }

        .place-coordinates {
          color: #6c757d;
          font-size: 13px;
          font-family: monospace;
          margin-bottom: 5px;
        }

        .place-address {
          color: #666;
          font-size: 13px;
        }

        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .action-group {
          display: flex;
          gap: 10px;
        }

        .btn-primary,
        .btn-secondary,
        .btn-danger {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #f39c12;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #e67e22;
          transform: translateY(-1px);
        }

        .btn-primary:disabled {
          background: #95a5a6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: #f8f9fa;
          color: #6c757d;
          border: 1px solid #dee2e6;
        }

        .btn-secondary:hover {
          background: #e9ecef;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
          transform: translateY(-1px);
        }

        .btn-danger:disabled {
          background: #95a5a6;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 20px;
          border: 1px solid #f5c6cb;
        }

        .help-text {
          padding: 15px 25px;
          background: #f8f9fa;
          border-top: 1px solid #eee;
          margin-top: 0;
        }

        .help-text p {
          margin: 0 0 5px 0;
          font-size: 13px;
          color: #666;
        }

        .help-text p:last-child {
          margin-bottom: 0;
        }

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .modal-content {
            margin: 10px;
            max-height: 95vh;
          }

          .form-actions {
            flex-direction: column;
            gap: 15px;
            align-items: stretch;
          }

          .action-group {
            order: -1;
          }

          .btn-danger {
            order: 1;
          }

          .search-method-toggle {
            flex-wrap: wrap;
          }

          .reset-btn {
            flex-basis: 100%;
            margin-top: 5px;
          }
        }
      `}</style>
    </div>
  );
}