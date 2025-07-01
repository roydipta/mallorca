'use client';

import { useState } from 'react';

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

  const dayOptions = [
    { value: 'day1', label: 'Day 1 - North Coast' },
    { value: 'day2', label: 'Day 2 - UNESCO Villages' },
    { value: 'day3', label: 'Day 3 - Wine Country' },
    { value: 'day4', label: 'Day 4 - Southeast Paradise' },
    { value: 'day5', label: 'Day 5 - West Coast Finale' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
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
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Adding...' : 'Add Location'}
            </button>
          </div>
        </form>

        <div className="help-text">
          <p><strong>Tip:</strong> You can find coordinates by right-clicking on Google Maps and selecting the coordinates that appear.</p>
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
        }
      `}</style>
    </div>
  );
}