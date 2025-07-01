import { NextRequest, NextResponse } from 'next/server';
import { updateLocation, deleteLocation } from '@/lib/db';

// PUT - Update location
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, lat, lng, day, time, description } = body;

    // Validate fields if provided
    const updates: any = {};
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Name must be a non-empty string' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (lat !== undefined) {
      if (typeof lat !== 'number' || lat < -90 || lat > 90) {
        return NextResponse.json(
          { success: false, error: 'Latitude must be a number between -90 and 90' },
          { status: 400 }
        );
      }
      updates.lat = lat;
    }

    if (lng !== undefined) {
      if (typeof lng !== 'number' || lng < -180 || lng > 180) {
        return NextResponse.json(
          { success: false, error: 'Longitude must be a number between -180 and 180' },
          { status: 400 }
        );
      }
      updates.lng = lng;
    }

    if (day !== undefined) {
      if (!['day1', 'day2', 'day3', 'day4', 'day5'].includes(day)) {
        return NextResponse.json(
          { success: false, error: 'Day must be one of: day1, day2, day3, day4, day5' },
          { status: 400 }
        );
      }
      updates.day = day;
    }

    if (time !== undefined) {
      if (typeof time !== 'string' || time.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Time must be a non-empty string' },
          { status: 400 }
        );
      }
      updates.time = time.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Description must be a non-empty string' },
          { status: 400 }
        );
      }
      updates.description = description.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const updatedLocation = await updateLocation(id, updates);

    return NextResponse.json({ 
      success: true, 
      data: updatedLocation 
    });

  } catch (error) {
    console.error('PUT /api/locations/[id] error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

// DELETE - Delete location
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid location ID' },
        { status: 400 }
      );
    }

    const success = await deleteLocation(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Location deleted successfully' 
    });

  } catch (error) {
    console.error('DELETE /api/locations/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}