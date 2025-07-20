// File: app/services/googleMapService.ts
import type { RefObject, Dispatch, SetStateAction } from 'react';
import type { Location } from '../components/mapHelpers';
import { createMarkerIcon, loadPlaceData, createEnhancedInfoContent } from '../components/mapHelpers';

/**
 * Loads the Google Maps script dynamically.
 */
export function loadGoogleMapsScript(apiKey: string, cb: () => void) {
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

/**
 * Initializes the Google Map with markers, routes, and controls.
 */
export function initializeGoogleMap(
  mapRef: RefObject<HTMLDivElement | null>,
  locations: Location[],
  isMobile: boolean,
  dayColors: Record<string, string>,
  setError: Dispatch<SetStateAction<string>>
) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key is missing.');
    setError('Google Maps API key is missing.');
    return;
  }

  loadGoogleMapsScript(apiKey, () => {
    if (!mapRef.current) return;
    let map: any;
    let markers: Record<number, any> = {};
    let routeLines: Record<string, any> = {};
    let highlightedMarker: number | null = null;
    let currentMapType = 'roadmap';
    let showingTraffic = false;

    map = new (window as any).google.maps.Map(mapRef.current as HTMLDivElement, {
      zoom: 10,
      center: { lat: 39.6953, lng: 2.9139 },
      mapTypeId: 'roadmap',
      gestureHandling: 'greedy',
      zoomControl: true,
      zoomControlOptions: { position: (window as any).google.maps.ControlPosition.RIGHT_BOTTOM },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
    });

    const placesService = new (window as any).google.maps.places.PlacesService(map);
    const infoWindow = new (window as any).google.maps.InfoWindow({ maxWidth: isMobile ? 300 : 420 });
    const trafficLayer = new (window as any).google.maps.TrafficLayer();

    if (locations.length === 0) {
      // Stub global controls when no locations
      (window as any).filterByDay = () => {};
      (window as any).toggleSidebar = () => {};
      (window as any).toggleMapType = () => {
        if (currentMapType === 'roadmap') {
          map.setMapTypeId('satellite');
          currentMapType = 'satellite';
        } else {
          map.setMapTypeId('roadmap');
          currentMapType = 'roadmap';
        }
      };
      (window as any).fitAllMarkers = () => {};
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

    // Place markers
    locations.forEach((location, index) => {
      const marker = new (window as any).google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map,
        title: location.name,
        icon: {
          url: createMarkerIcon(dayColors[location.day]),
          scaledSize: new (window as any).google.maps.Size(25, 25),
          anchor: new (window as any).google.maps.Point(12, 12)
        }
      });

      marker.addListener('click', async () => {
        if (highlightedMarker !== null) {
          const old = locations[highlightedMarker];
          markers[highlightedMarker].setIcon({
            url: createMarkerIcon(dayColors[old.day], false),
            scaledSize: new (window as any).google.maps.Size(25, 25),
            anchor: new (window as any).google.maps.Point(12, 12)
          });
        }
        marker.setIcon({
          url: createMarkerIcon(dayColors[location.day], true),
          scaledSize: new (window as any).google.maps.Size(30, 30),
          anchor: new (window as any).google.maps.Point(15, 15)
        });
        highlightedMarker = index;

        const loadingContent = createEnhancedInfoContent(location, null, true, dayColors, isMobile);
        infoWindow.setContent(loadingContent);
        infoWindow.open(map, marker);

        const placeData = await loadPlaceData(location, index, placesService);
        const finalContent = createEnhancedInfoContent(location, placeData, false, dayColors, isMobile);
        infoWindow.setContent(finalContent);
      });

      markers[index] = marker;
    });

    // Preload first few place details
    setTimeout(async () => {
      const batch = locations.slice(0, isMobile ? 2 : 3).map((loc, i) => loadPlaceData(loc, i, placesService));
      await Promise.all(batch);
    }, 1000);

    // Draw routes
    const routes: Record<string, { lat: number; lng: number }[]> = {};
    locations.forEach(loc => {
      routes[loc.day] = routes[loc.day] || [];
      routes[loc.day].push({ lat: loc.lat, lng: loc.lng });
    });

    Object.keys(routes).forEach(day => {
      if (routes[day].length > 1) {
        const line = new (window as any).google.maps.Polyline({
          path: routes[day],
          geodesic: true,
          strokeColor: dayColors[day],
          strokeOpacity: 0.6,
          strokeWeight: isMobile ? 2 : 3,
          map
        });
        routeLines[day] = line;

        const dayLocs = locations
          .filter(l => l.day === day)
          .sort((a, b) => a.time.localeCompare(b.time));
        for (let i = 1; i < dayLocs.length; i++) {
          const prev = dayLocs[i - 1];
          const curr = dayLocs[i];
          if (curr.travelTimeFromPrevious) {
            const midLat = (prev.lat + curr.lat) / 2;
            const midLng = (prev.lng + curr.lng) / 2;
            const travelMarker = new (window as any).google.maps.Marker({
              position: { lat: midLat, lng: midLng },
              map,
              icon: { path: (window as any).google.maps.SymbolPath.CIRCLE, scale: 0 },
              title: `${curr.travelTimeFromPrevious} (${curr.distanceFromPrevious})`
            });
            const travelInfo = new (window as any).google.maps.InfoWindow({
              content: `<div style="background:${dayColors[day]};color:white;padding:${isMobile ? '3px 6px' : '4px 8px'};border-radius:12px;font-size:${isMobile ? '10px' : '12px'};font-weight:600;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
                    🚗 ${curr.travelTimeFromPrevious}<br><span style="font-size:${isMobile ? '8px' : '10px'};opacity:0.9">${curr.distanceFromPrevious}</span><br><span style="font-size:${isMobile ? '7px' : '9px'};opacity:0.7">Estimated</span>
                  </div>`,
              disableAutoPan: true
            });
            if (isMobile) {
              travelMarker.addListener('click', () => {
                travelInfo.open(map, travelMarker);
                setTimeout(() => travelInfo.close(), 2000);
              });
            } else {
              travelMarker.addListener('mouseover', () => travelInfo.open(map, travelMarker));
              travelMarker.addListener('mouseout', () => travelInfo.close());
            }
          }
        }
      }
    });

    // Fit map bounds
    const bounds = new (window as any).google.maps.LatLngBounds();
    locations.forEach(loc => bounds.extend({ lat: loc.lat, lng: loc.lng }));
    map.fitBounds(bounds);
    (window as any).google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      if (map.getZoom() > (isMobile ? 12 : 15)) {
        map.setZoom(isMobile ? 9 : 10);
      }
    });
  });
}
