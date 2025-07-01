import { sql } from '@vercel/postgres';

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
}

export async function initializeDatabase() {
  try {
    // Create the locations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        lat DECIMAL(10, 8) NOT NULL,
        lng DECIMAL(11, 8) NOT NULL,
        day VARCHAR(10) NOT NULL,
        time VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Check if table is empty and seed with initial data
    const { rows } = await sql`SELECT COUNT(*) as count FROM locations`;
    const count = parseInt(rows[0].count as string);

    if (count === 0) {
      console.log('Seeding database with initial locations...');
      await seedInitialData();
    }

    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error };
  }
}

export async function getAllLocations(): Promise<Location[]> {
  try {
    const { rows } = await sql`
      SELECT * FROM locations 
      ORDER BY 
        CASE day 
          WHEN 'day1' THEN 1 
          WHEN 'day2' THEN 2 
          WHEN 'day3' THEN 3 
          WHEN 'day4' THEN 4 
          WHEN 'day5' THEN 5 
          ELSE 6 
        END,
        id
    `;
    return rows as Location[];
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
}

export async function createLocation(location: Omit<Location, 'id' | 'created_at' | 'updated_at'>): Promise<Location> {
  try {
    const { rows } = await sql`
      INSERT INTO locations (name, lat, lng, day, time, description)
      VALUES (${location.name}, ${location.lat}, ${location.lng}, ${location.day}, ${location.time}, ${location.description})
      RETURNING *
    `;
    return rows[0] as Location;
  } catch (error) {
    console.error('Error creating location:', error);
    throw error;
  }
}

export async function updateLocation(id: number, location: Partial<Omit<Location, 'id' | 'created_at' | 'updated_at'>>): Promise<Location> {
  try {
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (location.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(location.name);
    }
    if (location.lat !== undefined) {
      updateFields.push(`lat = $${paramIndex++}`);
      values.push(location.lat);
    }
    if (location.lng !== undefined) {
      updateFields.push(`lng = $${paramIndex++}`);
      values.push(location.lng);
    }
    if (location.day !== undefined) {
      updateFields.push(`day = $${paramIndex++}`);
      values.push(location.day);
    }
    if (location.time !== undefined) {
      updateFields.push(`time = $${paramIndex++}`);
      values.push(location.time);
    }
    if (location.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(location.description);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE locations 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows } = await sql.query(query, values);
    return rows[0] as Location;
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
}

export async function deleteLocation(id: number): Promise<boolean> {
  try {
    await sql`DELETE FROM locations WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
}

async function seedInitialData() {
  const initialLocations = [
    // Day 1: North Coast
    { name: "Cala Formentor", lat: 39.9597, lng: 3.2097, day: "day1", time: "7:00 AM", description: "Pristine golden beach, must arrive before 10 AM road closure" },
    { name: "Medieval Alcúdia", lat: 39.8499, lng: 3.1214, day: "day1", time: "11:00 AM", description: "Roman ruins, perfectly preserved 13th-century walls" },
    { name: "Playa de Alcúdia", lat: 39.8389, lng: 3.1281, day: "day1", time: "2:00 PM", description: "3.5km family-friendly beach, shallow calm waters" },
    { name: "Pollença", lat: 39.8708, lng: 3.0208, day: "day1", time: "6:00 PM", description: "Climb 365 Calvary Steps for sunset views. Dinner at Stay Restaurant" },

    // Day 2: UNESCO Mountain Villages
    { name: "Valldemossa", lat: 39.7097, lng: 2.6225, day: "day2", time: "8:00 AM", description: "Chopin's former home, honey-stone village charm" },
    { name: "Deià", lat: 39.7481, lng: 2.6486, day: "day2", time: "10:30 AM", description: "Artist colony, Robert Graves museum, ochre houses" },
    { name: "Cala Deià", lat: 39.7417, lng: 2.6444, day: "day2", time: "11:30 AM", description: "Hidden pebble cove via hiking trail" },
    { name: "Sóller", lat: 39.7650, lng: 2.7142, day: "day2", time: "2:00 PM", description: "Golden valley town, Moorish gardens, Gaudí-influenced church" },
    { name: "Port de Sóller", lat: 39.7961, lng: 2.6900, day: "day2", time: "5:30 PM", description: "Horseshoe bay, evening swimming. Dinner at Béns d'Avall or Es Blai" },

    // Day 3: Wine Country & Villages
    { name: "Binissalem", lat: 39.6875, lng: 2.8497, day: "day3", time: "9:00 AM", description: "José Luis Ferrer winery tour, indigenous grapes" },
    { name: "Macià Batle Winery", lat: 39.6933, lng: 2.8619, day: "day3", time: "11:00 AM", description: "Traditional family winery since 1856" },
    { name: "Sineu", lat: 39.6431, lng: 3.0197, day: "day3", time: "2:30 PM", description: "Authentic market town, Wednesday livestock market" },
    { name: "Vins Miquel Gelabert", lat: 39.6106, lng: 3.1319, day: "day3", time: "4:00 PM", description: "Artisan 'Madman of Manacor' wines" },
    { name: "Son Fornés", lat: 39.6339, lng: 3.0306, day: "day3", time: "6:30 PM", description: "Bronze Age archaeological site. Dinner in Montuïri at S'Hostal" },

    // Day 4: Southeast Paradise
    { name: "Cala Mondragó", lat: 39.3417, lng: 3.1856, day: "day4", time: "7:30 AM", description: "Protected natural park, pristine beaches" },
    { name: "Cala des Moro", lat: 39.3275, lng: 3.1781, day: "day4", time: "10:30 AM", description: "Instagram-famous tiny turquoise cove" },
    { name: "Cala Llombards", lat: 39.3247, lng: 3.1647, day: "day4", time: "2:00 PM", description: "Sheltered cove with fishing huts" },
    { name: "Es Trenc", lat: 39.3500, lng: 2.9667, day: "day4", time: "4:00 PM", description: "7km 'Caribbean-style' white sand (expect crowds)" },
    { name: "Santuari de Sant Blai", lat: 39.3631, lng: 3.0347, day: "day4", time: "5:30 PM", description: "Hilltop monastery, panoramic sunset views" },
    { name: "Porto Colom", lat: 39.4175, lng: 3.2656, day: "day4", time: "Dinner", description: "Sa Llotja harbor views, fresh daily catch" },

    // Day 5: West Coast Finale
    { name: "Sant Elm", lat: 39.5803, lng: 2.3531, day: "day5", time: "8:30 AM", description: "Westernmost beach, Sa Dragonera island views" },
    { name: "Sa Dragonera", lat: 39.5850, lng: 2.3167, day: "day5", time: "10:30 AM", description: "Uninhabited nature reserve island boat trip" },
    { name: "Sa Trapa", lat: 39.5719, lng: 2.3619, day: "day5", time: "2:30 PM", description: "Clifftop monastery ruins hike, dramatic views" },
    { name: "Andratx", lat: 39.5433, lng: 2.3833, day: "day5", time: "4:00 PM", description: "Authentic market town, contemporary art center" },
    { name: "Estellencs", lat: 39.6519, lng: 2.5003, day: "day5", time: "5:30 PM", description: "MA-10 UNESCO coastal route" },
    { name: "Banyalbufar", lat: 39.6792, lng: 2.5167, day: "day5", time: "Evening", description: "MA-10 route, sunset dinner at Es Grau with Mediterranean views" }
  ];

  for (const location of initialLocations) {
    await sql`
      INSERT INTO locations (name, lat, lng, day, time, description)
      VALUES (${location.name}, ${location.lat}, ${location.lng}, ${location.day}, ${location.time}, ${location.description})
    `;
  }
}