export const dayColors: Record<string, string> = {
    day1: '#e74c3c',
    day2: '#f39c12',
    day3: '#2ecc71',
    day4: '#3498db',
    day5: '#9b59b6'
  };
  
  export const dayNames: Record<string, string> = {
    day1: 'North Coast',
    day2: 'UNESCO Villages',
    day3: 'Wine Country',
    day4: 'Southeast Paradise',
    day5: 'West Coast Finale'
  };
  
  export interface Location {
    name: string;
    coords: {
      lat: number;
      lng: number;
    };
    day: string;
    time: string;
    description: string;
  }
  
  export const locations: Location[] = [
    // Day 1: North Coast
    {
      name: "Cala Formentor",
      coords: {lat: 39.9597, lng: 3.2097},
      day: "day1",
      time: "7:00 AM",
      description: "Pristine golden beach, must arrive before 10 AM road closure"
    },
    {
      name: "Medieval Alcúdia",
      coords: {lat: 39.8499, lng: 3.1214},
      day: "day1",
      time: "11:00 AM",
      description: "Roman ruins, perfectly preserved 13th-century walls"
    },
    {
      name: "Playa de Alcúdia",
      coords: {lat: 39.8389, lng: 3.1281},
      day: "day1",
      time: "2:00 PM",
      description: "3.5km family-friendly beach, shallow calm waters"
    },
    {
      name: "Pollença",
      coords: {lat: 39.8708, lng: 3.0208},
      day: "day1",
      time: "6:00 PM",
      description: "Climb 365 Calvary Steps for sunset views. Dinner at Stay Restaurant"
    },
  
    // Day 2: UNESCO Mountain Villages
    {
      name: "Valldemossa",
      coords: {lat: 39.7097, lng: 2.6225},
      day: "day2",
      time: "8:00 AM",
      description: "Chopin's former home, honey-stone village charm"
    },
    {
      name: "Deià",
      coords: {lat: 39.7481, lng: 2.6486},
      day: "day2",
      time: "10:30 AM",
      description: "Artist colony, Robert Graves museum, ochre houses"
    },
    {
      name: "Cala Deià",
      coords: {lat: 39.7417, lng: 2.6444},
      day: "day2",
      time: "11:30 AM",
      description: "Hidden pebble cove via hiking trail"
    },
    {
      name: "Sóller",
      coords: {lat: 39.7650, lng: 2.7142},
      day: "day2",
      time: "2:00 PM",
      description: "Golden valley town, Moorish gardens, Gaudí-influenced church"
    },
    {
      name: "Port de Sóller",
      coords: {lat: 39.7961, lng: 2.6900},
      day: "day2",
      time: "5:30 PM",
      description: "Horseshoe bay, evening swimming. Dinner at Béns d'Avall or Es Blai"
    },
  
    // Day 3: Wine Country & Villages
    {
      name: "Binissalem",
      coords: {lat: 39.6875, lng: 2.8497},
      day: "day3",
      time: "9:00 AM",
      description: "José Luis Ferrer winery tour, indigenous grapes"
    },
    {
      name: "Macià Batle Winery",
      coords: {lat: 39.6933, lng: 2.8619},
      day: "day3",
      time: "11:00 AM",
      description: "Traditional family winery since 1856"
    },
    {
      name: "Sineu",
      coords: {lat: 39.6431, lng: 3.0197},
      day: "day3",
      time: "2:30 PM",
      description: "Authentic market town, Wednesday livestock market"
    },
    {
      name: "Vins Miquel Gelabert",
      coords: {lat: 39.6106, lng: 3.1319},
      day: "day3",
      time: "4:00 PM",
      description: "Artisan 'Madman of Manacor' wines"
    },
    {
      name: "Son Fornés",
      coords: {lat: 39.6339, lng: 3.0306},
      day: "day3",
      time: "6:30 PM",
      description: "Bronze Age archaeological site. Dinner in Montuïri at S'Hostal"
    },
  
    // Day 4: Southeast Paradise
    {
      name: "Cala Mondragó",
      coords: {lat: 39.3417, lng: 3.1856},
      day: "day4",
      time: "7:30 AM",
      description: "Protected natural park, pristine beaches"
    },
    {
      name: "Cala des Moro",
      coords: {lat: 39.3275, lng: 3.1781},
      day: "day4",
      time: "10:30 AM",
      description: "Instagram-famous tiny turquoise cove"
    },
    {
      name: "Cala Llombards",
      coords: {lat: 39.3247, lng: 3.1647},
      day: "day4",
      time: "2:00 PM",
      description: "Sheltered cove with fishing huts"
    },
    {
      name: "Es Trenc",
      coords: {lat: 39.3500, lng: 2.9667},
      day: "day4",
      time: "4:00 PM",
      description: "7km 'Caribbean-style' white sand (expect crowds)"
    },
    {
      name: "Santuari de Sant Blai",
      coords: {lat: 39.3631, lng: 3.0347},
      day: "day4",
      time: "5:30 PM",
      description: "Hilltop monastery, panoramic sunset views"
    },
    {
      name: "Porto Colom",
      coords: {lat: 39.4175, lng: 3.2656},
      day: "day4",
      time: "Dinner",
      description: "Sa Llotja harbor views, fresh daily catch"
    },
  
    // Day 5: West Coast Finale
    {
      name: "Sant Elm",
      coords: {lat: 39.5803, lng: 2.3531},
      day: "day5",
      time: "8:30 AM",
      description: "Westernmost beach, Sa Dragonera island views"
    },
    {
      name: "Sa Dragonera",
      coords: {lat: 39.5850, lng: 2.3167},
      day: "day5",
      time: "10:30 AM",
      description: "Uninhabited nature reserve island boat trip"
    },
    {
      name: "Sa Trapa",
      coords: {lat: 39.5719, lng: 2.3619},
      day: "day5",
      time: "2:30 PM",
      description: "Clifftop monastery ruins hike, dramatic views"
    },
    {
      name: "Andratx",
      coords: {lat: 39.5433, lng: 2.3833},
      day: "day5",
      time: "4:00 PM",
      description: "Authentic market town, contemporary art center"
    },
    {
      name: "Estellencs",
      coords: {lat: 39.6519, lng: 2.5003},
      day: "day5",
      time: "5:30 PM",
      description: "MA-10 UNESCO coastal route"
    },
    {
      name: "Banyalbufar",
      coords: {lat: 39.6792, lng: 2.5167},
      day: "day5",
      time: "Evening",
      description: "MA-10 route, sunset dinner at Es Grau with Mediterranean views"
    }
  ];