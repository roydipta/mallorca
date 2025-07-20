// app/components/mapHelpers.ts
'use client';

export interface Location {
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

export const calculateTravelTimes = async (locations: Location[]): Promise<Location[]> => {
  if (!locations.length || !(window as any).google?.maps) return locations;
  const updatedLocations = [...locations];
  const service = new (window as any).google.maps.DistanceMatrixService();
  const locationsByDay: Record<string, Location[]> = {};
  locations.forEach(location => {
    if (!locationsByDay[location.day]) {
      locationsByDay[location.day] = [];
    }
    locationsByDay[location.day].push(location);
  });
  Object.keys(locationsByDay).forEach(day => {
    locationsByDay[day].sort((a, b) => a.time.localeCompare(b.time));
  });
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
            if (status === 'OK') resolve(response);
            else reject(status);
          });
        });
        if (result.rows[0]?.elements[0]?.status === 'OK') {
          const element = result.rows[0].elements[0];
          const idx = updatedLocations.findIndex(loc =>
            loc.id === destination.id ||
            (loc.lat === destination.lat && loc.lng === destination.lng)
          );
          if (idx !== -1) {
            updatedLocations[idx] = {
              ...updatedLocations[idx],
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

export function createMarkerIcon(color: string, isHighlighted = false): string {
  const size = isHighlighted ? 30 : 25;
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="3"/>
      ${isHighlighted ? '<circle cx="12" cy="12" r="6" fill="white" opacity="0.8"/>' : ''}
    </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

export async function findNearbyPlace(location: Location, placesService: any): Promise<any> {
  const cacheKey = `${location.lat},${location.lng}`;
  const placesCache: Record<string, any> = (window as any)._placesCache || ((window as any)._placesCache = {});
  if (placesCache[cacheKey]) return placesCache[cacheKey];
  return new Promise(resolve => {
    const request = {
      location: new (window as any).google.maps.LatLng(location.lat, location.lng),
      radius: 100,
      type: 'tourist_attraction',
      keyword: location.name
    };
    placesService.nearbySearch(request, (results: any[], status: any) => {
      if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
        let bestMatch = results[0];
        for (const r of results) {
          if (
            r.name.toLowerCase().includes(location.name.toLowerCase()) ||
            location.name.toLowerCase().includes(r.name.toLowerCase())
          ) {
            bestMatch = r;
            break;
          }
        }
        placesCache[cacheKey] = bestMatch;
        resolve(bestMatch);
      } else {
        resolve(null);
      }
    });
  });
}

export async function textSearchPlace(location: Location, placesService: any): Promise<any> {
  const cacheKey = `text_${location.name}`;
  const placesCache: Record<string, any> = (window as any)._placesCache || ((window as any)._placesCache = {});
  if (placesCache[cacheKey]) return placesCache[cacheKey];
  return new Promise(resolve => {
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

export async function getPlaceDetails(placeId: string, placesService: any): Promise<any> {
  const cacheKey = `details_${placeId}`;
  const placesCache: Record<string, any> = (window as any)._placesCache || ((window as any)._placesCache = {});
  if (placesCache[cacheKey]) return placesCache[cacheKey];
  return new Promise(resolve => {
    const request = {
      placeId,
      fields: ['name', 'rating', 'reviews', 'photos', 'formatted_phone_number', 'website', 'opening_hours', 'price_level']
    };
    placesService.getDetails(request, (place: any, status: any) => {
      if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
        placesCache[cacheKey] = place;
        resolve(place);
      } else {
        resolve(null);
      }
    });
  });
}

export function getPhotoUrl(photo: any, maxWidth = 400): string {
  return photo.getUrl({ maxWidth });
}

export async function loadPlaceData(location: Location, index: number, placesService: any): Promise<any> {
  try {
    const place = await findNearbyPlace(location, placesService);
    if (place?.place_id) {
      const details = await getPlaceDetails(place.place_id, placesService);
      return { place, details };
    }
  } catch (e) {
    console.error('Error loading place data:', e);
  }
  return { place: null, details: null };
}

export function createEnhancedInfoContent(
  location: Location,
  placeData: any,
  isLoading = false,
  dayColors: Record<string, string>,
  isMobile: boolean
): string {
  let content = `<div class="modern-info-window"><div class="info-header"><div class="info-title">${location.name}</div>`;
  if (isLoading) {
    content += `<div class="info-rating"><div class="modern-loading-spinner"></div></div>`;
  } else if (placeData?.details?.rating) {
    content += `<div class="info-rating">⭐ ${placeData.details.rating}</div>`;
  }
  content += `</div><div class="info-time">${location.time}</div><div class="info-description">${location.description}</div>`;
  if (!isLoading && placeData?.details?.photos?.length) {
    content += '<div class="info-photos">';
    const photosToShow = placeData.details.photos.slice(0, 3);
    photosToShow.forEach((photo: any, i: number) => {
      const url = getPhotoUrl(photo, isMobile ? 150 : 200);
      content += `<img src="${url}" alt="${location.name} photo ${i+1}" class="info-photo" onclick="window.open('${getPhotoUrl(photo,800)}','_blank')" />`;
    });
    content += '</div>';
  }
  if (!isLoading && placeData?.details) {
    const d = placeData.details;
    content += '<div class="info-details">';
    if (d.formatted_phone_number) content += `<div class="info-detail">📞 ${d.formatted_phone_number}</div>`;
    if (d.website) content += `<div class="info-detail">🌐 <a href="${d.website}" target="_blank" style="color:#42a5f5">Website</a></div>`;
    if (d.price_level !== undefined) {
      const priceLevel = '💰'.repeat(d.price_level || 1);
      content += `<div class="info-detail">${priceLevel} Price Level</div>`;
    }
    if (d.opening_hours?.weekday_text) {
      const today = new Date().getDay();
      const hours = d.opening_hours.weekday_text[today === 0 ? 6 : today - 1];
      content += `<div class="info-detail">🕒 ${hours}</div>`;
    }
    content += '</div>';
  }
  if (!isLoading && placeData?.details?.reviews?.length) {
    content += '<div class="info-reviews"><h4 style="margin:10px 0 5px;color:#1e293b">Recent Reviews:</h4>';
    const reviewsToShow = placeData.details.reviews.slice(0, isMobile ? 1 : 2);
    reviewsToShow.forEach((r: any) => {
      const stars = '⭐'.repeat(r.rating);
      const text = r.text.length > (isMobile ? 80 : 120) ? r.text.substring(0, isMobile ? 80 : 120) + '...' : r.text;
      content += `<div class="info-review"><div class="review-author">${r.author_name}</div><div class="review-rating">${stars}</div><div class="review-text">${text}</div></div>`;
    });
    content += '</div>';
  }
  if (location.id) {
    content += `<div class="info-actions">
      <button onclick="window.editLocationFromMap(${location.id})" class="modern-info-btn edit-btn">✏️ Edit</button>
      <button onclick="window.deleteLocationFromMap(${location.id})" class="modern-info-btn delete-btn">🗑️ Delete</button>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}" target="_blank" class="modern-info-btn primary">🧭 Directions</a>`;
    if (placeData?.details?.website) content += `<a href="${placeData.details.website}" target="_blank" class="modern-info-btn">🌐 Website</a>`;
    content += '</div>';
  }
  content += '</div>';
  return content;
}
