'use client';

import { useState, useEffect, useRef } from 'react';

interface AddLocationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationAdded: () => void;
}

export default function AddLocationForm({ isOpen, onClose, onLocationAdded }: AddLocationFormProps) {
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
  const [showManualEntry, setShowManualEntry] = useState(false);
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const autocompleteInstance = useRef<any>(null);

  const dayOptions = [
    { value: 'day1', label: 'Day 1 - North Coast' },
    { value: 'day2', label: 'Day 2 - UNESCO Villages' },
    { value: 'day3', label: 'Day 3 - Wine Country' },
    { value: 'day4', label: 'Day 4 - Southeast Paradise' },
    { value: 'day5', label: 'Day 5 - West Coast Finale' }
  ];

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (isOpen && !isPlacesLoaded) {
      const checkGoogleMaps = () => {
        if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
          initializeAutocomplete();
          setIsPlacesLoaded(true);
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      checkGoogleMaps();
    }
  }, [isOpen, isPlacesLoaded]);

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
      const response = await fetch('/api/locations', {
        method: 'POST',
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
        // Reset form
        setFormData({
          name: '',
          lat: '',
          lng: '',
          day: 'day1',
          time: '',
          description: ''
        });
        setSelectedPlace(null);
        setShowManualEntry(false);
        if (autocompleteRef.current) {
          autocompleteRef.current.value = '';
        }
        onLocationAdded();
        onClose();
      } else {
        setError(result.error || 'Failed to add location');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Error adding location:', error);
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

  const handleManualToggle = () => {
    setShowManualEntry(!showManualEntry);
    setSelectedPlace(null);
    setFormData(prev => ({
      ...prev,
      name: '',
      lat: '',
      lng: '',
      description: ''
    }));
    if (autocompleteRef.current) {
      autocompleteRef.current.value = '';
    }
  };

  const searchNearbyPlace = async (query: string) => {
    if (!(window as any).google || !query.trim()) return;

    const service = new (window as any).google.maps.places.PlacesService(document.createElement('div'));
    const mallorcaCenter = new (window as any).google.maps.LatLng(39.6953, 2.9139);

    const request = {
      query: `${query} Mallorca Spain`,
      location: mallorcaCenter,
      radius: 50000
    };

    service.textSearch(request, (results: any[], status: any) => {
      if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
        const place = results[0];
        setSelectedPlace(place);
        setFormData(prev => ({
          ...prev,
          name: place.name,
          lat: place.geometry.location.lat().toString(),
          lng: place.geometry.location.lng().toString(),
          description: generateDescription(place)
        }));
        if (autocompleteRef.current) {
          autocompleteRef.current.value = place.name;
        }
      } else {
        setError('No places found. Try a different search term or enter coordinates manually.');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Location</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="location-form">
          {error && <div className="error-message">{error}</div>}

          <div className="search-method-toggle">
            <button
              type="button"
              className={`toggle-btn ${!showManualEntry ? 'active' : ''}`}
              onClick={() => setShowManualEntry(false)}
            >
              🔍 Search Places
            </button>
            <button
              type="button"
              className={`toggle-btn ${showManualEntry ? 'active' : ''}`}
              onClick={handleManualToggle}
            >
              📍 Manual Entry
            </button>
          </div>

          {!showManualEntry ? (
            <>
              <div className="form-group">
                <label htmlFor="place-search">Search for a Place *</label>
                <input
                  ref={autocompleteRef}
                  type="text"
                  id="place-search"
                  placeholder="e.g., Cala Formentor, Palma Cathedral, Port de Sóller..."
                  className="place-search-input"
                />
                <div className="search-help">
                  Start typing to search for places in Mallorca
                </div>
              </div>

              {selectedPlace && (
                <div className="selected-place-info">
                  <h4>Selected Place:</h4>
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
                <label htmlFor="name">Location Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Cala Formentor"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="lat">Latitude *</label>
                  <input
                    type="number"
                    id="lat"
                    name="lat"
                    value={formData.lat}
                    onChange={handleInputChange}
                    step="any"
                    required
                    placeholder="39.9597"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lng">Longitude *</label>
                  <input
                    type="number"
                    id="lng"
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
              <label htmlFor="day">Day *</label>
              <select
                id="day"
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
              <label htmlFor="time">Time *</label>
              <input
                type="text"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                required
                placeholder="e.g., 7:00 AM"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={3}
              placeholder="Describe what makes this location special..."
            />
            {selectedPlace && !showManualEntry && (
              <div className="description-help">
                Description auto-generated from place data. Feel free to edit!
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || (!showManualEntry && !selectedPlace)} 
              className="btn-primary"
            >
              {isSubmitting ? 'Adding...' : 'Add Location'}
            </button>
          </div>
        </form>

        <div className="help-text">
          <p><strong>Tip:</strong> {!showManualEntry ? 
            'Search for places to automatically get coordinates and details.' : 
            'You can find coordinates by right-clicking on Google Maps and selecting the coordinates that appear.'
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
          background: linear-gradient(45deg, #1e3c72, #2a5298);
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
          background: #2a5298;
          color: white;
          box-shadow: 0 2px 4px rgba(42, 82, 152, 0.3);
        }

        .toggle-btn:hover:not(.active) {
          background: #e9ecef;
          color: #2a5298;
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
          border: 2px solid #2a5298;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .place-search-input:focus {
          outline: none;
          border-color: #1e3c72;
          box-shadow: 0 0 0 3px rgba(42, 82, 152, 0.1);
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2a5298;
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
          gap: 10px;
          justify-content: flex-end;
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #2a5298;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1e3c72;
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
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .modal-content {
            margin: 10px;
            max-height: 95vh;
          }

          .search-method-toggle {
            flex-direction: column;
          }

          .toggle-btn {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}