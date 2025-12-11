// Kigali Districts, Sectors, and Major Streets/Locations
export const kigaliLocations = {
  districts: [
    {
      id: 1,
      name: "Gasabo",
      sectors: [
        "Bumbogo", "Gatsata", "Jali", "Gikomero", "Gisozi", "Jabana",
        "Kacyiru", "Kimihurura", "Kimironko", "Kinyinya", "Ndera",
        "Nduba", "Remera", "Rusororo", "Rutunga"
      ],
      majorLocations: [
        "Kigali Convention Centre", "Parliament", "Prime Minister's Office",
        "Kigali International Airport", "Nyabugogo Taxi Park", "Kimihurura Roundabout",
        "Kacyiru Roundabout", "Remera", "Kimironko Market", "Gisozi Genocide Memorial"
      ]
    },
    {
      id: 2,
      name: "Kicukiro",
      sectors: [
        "Gahanga", "Gatenga", "Gikondo", "Kagarama", "Kanombe",
        "Kicukiro", "Kigarama", "Masaka", "Niboye", "Nyarugunga"
      ],
      majorLocations: [
        "Nyanza District (KBC)", "Sonatube Roundabout", "Gikondo Industrial Area",
        "Rebero", "Kicukiro Centre", "Kanombe Military Camp", "Masaka"
      ]
    },
    {
      id: 3,
      name: "Nyarugenge",
      sectors: [
        "Gitega", "Kanyinya", "Kigali", "Kimisagara", "Mageragere",
        "Muhima", "Nyakabanda", "Nyamirambo", "Nyarugenge", "Rwezamenyo"
      ],
      majorLocations: [
        "Downtown Kigali", "City Hall", "Central Business District (CBD)",
        "Nyabugogo Bus Station", "Nyamirambo", "Kimisagara", "Nyarugenge Market",
        "Kigali Central Prison", "King Faisal Hospital", "Amahoro Stadium"
      ]
    }
  ],
  
  majorStreets: [
    // Main boulevards
    "KN 3 Ave (Umuganda Blvd)",
    "KN 4 Ave",
    "KN 5 Rd",
    "KN 6 Ave",
    "KN 7 Ave", 
    "KN 8 Ave",
    "KN 67 St",
    "KN 78 St",
    "KN 82 St",
    "Boulevard de l'Umuganda",
    "Boulevard de la Revolution",
    "Avenue de la Paix",
    "Avenue de l'Armée",
    "Route de Kigali-Gatuna",
    "Route de l'Aéroport",
    "Route de Nyanza",
    "Route de Gikondo"
  ],

  landmarks: [
    { name: "Kigali International Airport", lat: -1.9686, lng: 30.1395, type: "transport" },
    { name: "Kigali Convention Centre", lat: -1.9503, lng: 30.0946, type: "landmark" },
    { name: "Nyabugogo Taxi Park", lat: -1.9378, lng: 30.0441, type: "transport" },
    { name: "Kimironko Market", lat: -1.9487, lng: 30.1262, type: "market" },
    { name: "Downtown Kigali", lat: -1.9536, lng: 30.0606, type: "district" },
    { name: "Kacyiru Roundabout", lat: -1.9425, lng: 30.0904, type: "junction" },
    { name: "Kimihurura Roundabout", lat: -1.9458, lng: 30.1039, type: "junction" },
    { name: "Sonatube Roundabout", lat: -1.9739, lng: 30.0964, type: "junction" },
    { name: "Amahoro Stadium", lat: -1.9444, lng: 30.0839, type: "landmark" },
    { name: "King Faisal Hospital", lat: -1.9558, lng: 30.0823, type: "hospital" },
    { name: "Nyanza District (KBC)", lat: -1.9737, lng: 30.0924, type: "district" },
    { name: "Rebero", lat: -1.9823, lng: 30.1142, type: "area" },
    { name: "Remera", lat: -1.9456, lng: 30.1159, type: "area" },
    { name: "Nyamirambo", lat: -1.9633, lng: 30.0356, type: "area" },
    { name: "Kicukiro Centre", lat: -1.9897, lng: 30.1011, type: "area" },
    { name: "Gikondo Industrial", lat: -1.9819, lng: 30.0687, type: "industrial" }
  ]
};

// Function to search locations
export const searchKigaliLocation = (query) => {
  if (!query || query.length < 2) return [];
  
  const searchTerm = query.toLowerCase();
  const results = [];

  // Search in major streets
  kigaliLocations.majorStreets.forEach(street => {
    if (street.toLowerCase().includes(searchTerm)) {
      results.push({ type: 'street', name: street, label: `📍 ${street}` });
    }
  });

  // Search in landmarks
  kigaliLocations.landmarks.forEach(landmark => {
    if (landmark.name.toLowerCase().includes(searchTerm)) {
      results.push({ 
        type: 'landmark', 
        name: landmark.name, 
        label: `🏛️ ${landmark.name}`,
        lat: landmark.lat,
        lng: landmark.lng
      });
    }
  });

  // Search in districts and sectors
  kigaliLocations.districts.forEach(district => {
    if (district.name.toLowerCase().includes(searchTerm)) {
      results.push({ type: 'district', name: district.name, label: `🏙️ ${district.name} District` });
    }
    
    district.sectors.forEach(sector => {
      if (sector.toLowerCase().includes(searchTerm)) {
        results.push({ 
          type: 'sector', 
          name: sector, 
          district: district.name,
          label: `📌 ${sector}, ${district.name}` 
        });
      }
    });

    district.majorLocations.forEach(location => {
      if (location.toLowerCase().includes(searchTerm)) {
        results.push({ 
          type: 'location', 
          name: location, 
          district: district.name,
          label: `📍 ${location}` 
        });
      }
    });
  });

  return results.slice(0, 10); // Return top 10 matches
};

// Get coordinates for a location (simplified - in production use geocoding API)
export const getLocationCoordinates = (locationName) => {
  const landmark = kigaliLocations.landmarks.find(l => 
    l.name.toLowerCase() === locationName.toLowerCase()
  );
  
  if (landmark) {
    return { lat: landmark.lat, lng: landmark.lng };
  }
  
  // Default to Kigali center
  return { lat: -1.9536, lng: 30.0606 };
};
