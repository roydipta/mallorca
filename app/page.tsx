'use client';

import { useEffect, useRef } from 'react';
import { dayColors, dayNames, locations, type Location } from './mallorcaData';

export default function Home() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      alert('Google Maps API key is missing.');
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
        // Script is loading
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

    // ---- MAIN FUNCTION ----
    function main() {
      // ========================
      // All constants and helpers
      // ========================

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

      // ==== ALL THE JS LOGIC IS DIRECT COPY BELOW ====
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

      function updateCacheStatus() {
        const cacheCount = document.getElementById('cacheCount');
        const loadBtn = document.getElementById('loadPlacesBtn') as HTMLButtonElement;
        const status = document.getElementById('cacheStatus');
        
        if (cacheCount) cacheCount.textContent = String(cacheStatus.loaded);
        
        if (loadBtn) {
          if (cacheStatus.loading) {
            loadBtn.textContent = '⏳ Loading...';
            loadBtn.disabled = true;
          } else if (cacheStatus.loaded === cacheStatus.total) {
            loadBtn.textContent = '✅ All Loaded';
            loadBtn.disabled = true;
          } else {
            loadBtn.textContent = '📍 Load Place Data';
            loadBtn.disabled = false;
          }
        }
        
        if (status) {
          status.style.color = cacheStatus.loaded === cacheStatus.total ? '#2ecc71' : '#95a5a6';
        }
      }

      function getCacheKey(location: Location): string {
        return `${location.name}-${location.coords.lat}-${location.coords.lng}`;
      }

      function searchPlace(location: Location, index: number, callback: (result: any) => void) {
        const cacheKey = getCacheKey(location);
        if (placesCache[cacheKey]) {
          callback(placesCache[cacheKey]);
          return;
        }
        
        // If not cached, show basic info and offer to load
        callback(null);
      }

      function loadPlaceData(location: Location, index: number, callback: (result: any) => void) {
        const cacheKey = getCacheKey(location);
        if (placesCache[cacheKey]) {
          callback(placesCache[cacheKey]);
          return;
        }

        const request = {
          location: location.coords,
          radius: 1000,
          query: location.name
        };
        
        placesService.textSearch(request, (results: any, status: any) => {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            const place = results[0];
            const detailRequest = {
              placeId: place.place_id,
              fields: [
                'name', 'rating', 'reviews', 'photos', 'formatted_phone_number',
                'website', 'opening_hours', 'price_level', 'types', 'vicinity', 'url'
              ]
            };
            placesService.getDetails(detailRequest, (placeDetails: any, detailStatus: any) => {
              if (detailStatus === (window as any).google.maps.places.PlacesServiceStatus.OK) {
                placesCache[cacheKey] = placeDetails;
                cacheStatus.loaded++;
                updateCacheStatus();
                callback(placeDetails);
              } else {
                callback(null);
              }
            });
          } else {
            callback(null);
          }
        });
      }

      function loadAllPlacesData() {
        if (cacheStatus.loading) return;
        
        cacheStatus.loading = true;
        updateCacheStatus();
        
        let completedRequests = 0;
        const totalRequests = locations.length;
        
        locations.forEach((location, index) => {
          const cacheKey = getCacheKey(location);
          if (placesCache[cacheKey]) {
            completedRequests++;
            if (completedRequests === totalRequests) {
              cacheStatus.loading = false;
              updateCacheStatus();
            }
            return;
          }
          
          // Add delay between requests to avoid rate limiting
          setTimeout(() => {
            loadPlaceData(location, index, (result) => {
              completedRequests++;
              if (completedRequests === totalRequests) {
                cacheStatus.loading = false;
                updateCacheStatus();
              }
            });
          }, index * 200); // 200ms delay between requests
        });
      }

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
        
        if (!placeDetails) {
          content += `
            <div class="no-cache-notice">
              <p>📍 <strong>Place data not loaded yet</strong></p>
              <p style="font-size: 12px; color: #666; margin: 5px 0;">Click "Load Place Data" button to get photos, reviews, and details for all locations.</p>
            </div>
          `;
        } else {
          if (placeDetails.photos && placeDetails.photos.length > 0) {
            content += '<div class="info-photos">';
            const maxPhotos = Math.min(4, placeDetails.photos.length);
            for (let i = 0; i < maxPhotos; i++) {
              const photoUrl = placeDetails.photos[i].getUrl({maxWidth: 120, maxHeight: 90});
              content += `<img src="${photoUrl}" class="info-photo" onclick="window.open('${photoUrl}', '_blank')">`;
            }
            content += '</div>';
          }
          
          content += '<div class="info-details">';
          if (placeDetails.formatted_phone_number) {
            content += `<div class="info-detail">📞 ${placeDetails.formatted_phone_number}</div>`;
          }
          if (placeDetails.opening_hours && placeDetails.opening_hours.isOpen !== undefined) {
            const isOpen = placeDetails.opening_hours.isOpen();
            content += `<div class="info-detail">🕒 ${isOpen ? 'Open now' : 'Closed'}</div>`;
          }
          if (placeDetails.price_level !== undefined) {
            const priceSymbols = '€'.repeat(placeDetails.price_level + 1);
            content += `<div class="info-detail">💰 ${priceSymbols}</div>`;
          }
          if (placeDetails.types && placeDetails.types.length > 0) {
            const mainType = placeDetails.types[0].replace(/_/g, ' ');
            content += `<div class="info-detail">🏷️ ${mainType}</div>`;
          }
          content += '</div>';
          
          if (placeDetails.reviews && placeDetails.reviews.length > 0) {
            content += '<div class="info-reviews">';
            const maxReviews = Math.min(2, placeDetails.reviews.length);
            for (let i = 0; i < maxReviews; i++) {
              const review = placeDetails.reviews[i];
              const stars = '⭐'.repeat(review.rating);
              content += `
                <div class="info-review">
                  <div class="review-author">${review.author_name}</div>
                  <div class="review-rating">${stars}</div>
                  <div class="review-text">${review.text.substring(0, 100)}${review.text.length > 100 ? '...' : ''}</div>
                </div>
              `;
            }
            content += '</div>';
          }
          
          content += '<div class="info-actions">';
          if (placeDetails.website) {
            content += `<a href="${placeDetails.website}" target="_blank" class="info-btn">🌐 Website</a>`;
          }
          if (placeDetails.url) {
            content += `<a href="${placeDetails.url}" target="_blank" class="info-btn">📍 Google Maps</a>`;
          }
        }
        
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.coords.lat},${location.coords.lng}`;
        content += `<a href="${directionsUrl}" target="_blank" class="info-btn primary">🧭 Directions</a>`;
        
        if (placeDetails) {
          content += '</div>';
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
          `;
          item.addEventListener('click', () => {
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
        map.panTo(location.coords);
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

      function searchLocations() {
        const searchBox = document.getElementById('searchBox') as HTMLInputElement | null;
        const searchTerm = searchBox ? searchBox.value.toLowerCase() : '';
        const items = document.querySelectorAll('.location-item');
        let visibleCount = 0;
        items.forEach((item, index) => {
          const location = locations[index];
          const searchText = `${location.name} ${location.description} ${location.time}`.toLowerCase();
          const matchesSearch = searchText.includes(searchTerm);
          const matchesFilter = currentFilter === 'all' || location.day === currentFilter;
          if (matchesSearch && matchesFilter) {
            (item as HTMLElement).style.display = 'block';
            visibleCount++;
          } else {
            (item as HTMLElement).style.display = 'none';
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
        const bounds = new (window as any).google.maps.LatLngBounds();
        locations.forEach(location => {
          bounds.extend(location.coords);
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

      // === INITIALIZATION ===
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

      locations.forEach((location, index) => {
        const marker = new (window as any).google.maps.Marker({
          position: location.coords,
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
          
          // Always show basic content immediately
          const basicContent = createEnhancedInfoContent(location, null);
          infoWindow.setContent(basicContent);
          infoWindow.open(map, marker);
          
          // Check if we have cached data
          const cacheKey = getCacheKey(location);
          if (placesCache[cacheKey]) {
            const enhancedContent = createEnhancedInfoContent(location, placesCache[cacheKey]);
            infoWindow.setContent(enhancedContent);
          } else {
            // Show basic info with notice about loading place data
            const basicContent = createEnhancedInfoContent(location, null);
            infoWindow.setContent(basicContent);
          }
        });
        markers[index] = marker;
      });

      const dayRoutes: Record<string, any[]> = {
        day1: [], day2: [], day3: [], day4: [], day5: []
      };
      locations.forEach(location => {
        dayRoutes[location.day].push(location.coords);
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
      updateCacheStatus();

      // Attach functions for use in onClick/onInput
      (window as any).filterByDay = filterByDay;
      (window as any).toggleSidebar = toggleSidebar;
      (window as any).searchLocations = searchLocations;
      (window as any).toggleMapType = toggleMapType;
      (window as any).fitAllMarkers = fitAllMarkers;
      (window as any).toggleTraffic = toggleTraffic;
      (window as any).loadAllPlacesData = loadAllPlacesData;
    }

    loadGoogleMapsScript(main);

    // eslint-disable-next-line
  }, []);

  return (
    <>
      <style jsx>{`
        .cache-controls {
          margin: 10px 0;
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .cache-btn {
          width: 100%;
          padding: 8px 12px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          margin-bottom: 8px;
        }
        
        .cache-btn:hover:not(:disabled) {
          background: #2980b9;
          transform: translateY(-1px);
        }
        
        .cache-btn:disabled {
          background: #95a5a6;
          cursor: not-allowed;
          transform: none;
        }
        
        .cache-status {
          text-align: center;
          font-size: 12px;
          color: #95a5a6;
        }
        
        .no-cache-notice {
          background: #f8f9fa;
          border: 1px dashed #ddd;
          border-radius: 6px;
          padding: 10px;
          margin: 10px 0;
          text-align: center;
        }
        
        .no-cache-notice p {
          margin: 3px 0;
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
              <span className="stats-number" id="total-locations">26</span>
              Locations
            </div>
            <div className="stats-item">
              <span className="stats-number">5</span>
              Days
            </div>
            <div className="stats-item">
              <span className="stats-number" id="filtered-count">26</span>
              Showing
            </div>
          </div>
          <div className="search-container">
            <input
              type="text"
              className="search-box"
              placeholder="🔍 Search locations..."
              id="searchBox"
              onInput={() => (window as any).searchLocations()}
            />
          </div>
          <div className="cache-controls">
            <button className="cache-btn" id="loadPlacesBtn" onClick={() => (window as any).loadAllPlacesData()}>
              📍 Load Place Data
            </button>
            <div className="cache-status" id="cacheStatus">
              <span id="cacheCount">0</span>/26 places cached
            </div>
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
    </>
  );
}