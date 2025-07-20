//app/api/locations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAllLocations, createLocation, initializeDatabase } from '@/lib/db';

// GET - Fetch all locations
export async function GET() {
  try {
    // Initialize database on first request
    await initializeDatabase();
    
    const locations = await getAllLocations();
    return NextResponse.json({ 
      success: true, 
      data: locations,
      count: locations.length 
    });
  } catch (error) {
    console.error('GET /api/locations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

// POST - Create new location
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { name, lat, lng, day, time, description } = body;
    
    if (!name || lat === undefined || lng === undefined || !day || !time || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate day format
    if (!['day1', 'day2', 'day3', 'day4', 'day5'].includes(day)) {
      return NextResponse.json(
        { success: false, error: 'Invalid day value' },
        { status: 400 }
      );
    }

    // Validate coordinates
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json(
        { success: false, error: 'Coordinates must be valid numbers' },
        { status: 400 }
      );
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return NextResponse.json(
        { success: false, error: 'Invalid coordinate values' },
        { status: 400 }
      );
    }

    const newLocation = await createLocation({
      name: name.trim(),
      lat: latNum,
      lng: lngNum,
      day,
      time: time.trim(),
      description: description.trim()
    });

    return NextResponse.json({ 
      success: true, 
      data: newLocation 
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/locations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create location' },
      { status: 500 }
    );
  }
}