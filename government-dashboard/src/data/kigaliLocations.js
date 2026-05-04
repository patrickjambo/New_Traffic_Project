// Kigali Districts, Sectors, Cells, Zones and Major Locations
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
      cells: [
        // Remera cells
        "Nyabisindu", "Rukiri I", "Rukiri II", "Nyarutarama", "Gishushu",
        // Kimironko cells
        "Bibare", "Kibagabaga", "Kimironko", "Nyagatovu", "Zindiro",
        // Kacyiru cells
        "Kamatamu", "Kamutwa", "Kibaza", "Mwana Umugiraneza", "Kamukina",
        // Kimihurura cells
        "Kamahwa", "Kamutwa", "Rugando", "Ubumwe",
        // Gisozi cells
        "Gasharu", "Musezero", "Ruhango", "Mburabuturo", "Kabusunzu",
        // Kinyinya cells
        "Gacuriro", "Kagugu", "Kinyinya", "Murama", "Agatare"
      ],
      popularAreas: [
        "Nyarutarama", "Gishushu", "Gacuriro", "Kagugu", "Kibagabaga",
        "Zindiro", "Kanombe", "Kabeza", "Remera", "Kimironko",
        "Kacyiru", "Kimihurura", "Gisozi", "Nyabugogo", "Gatsata"
      ]
    },
    {
      id: 2,
      name: "Kicukiro",
      sectors: [
        "Gahanga", "Gatenga", "Gikondo", "Kagarama", "Kanombe",
        "Kicukiro", "Kigarama", "Masaka", "Niboye", "Nyarugunga"
      ],
      cells: [
        // Kanombe cells
        "Busanza", "Kabeza", "Karama", "Murindi", "Nyarurama",
        // Gikondo cells
        "Gikondo", "Kagunga", "Kanserege", "Kinunga", "Rwimbogo",
        // Kicukiro cells
        "Gasharu", "Kamashashi", "Ngoma", "Kigarama",
        // Niboye cells
        "Gatare", "Kigali", "Niboye", "Nyakabanda",
        // Kagarama cells
        "Karembure", "Kagarama", "Muyange", "Rukatsa",
        // Nyarugunga cells
        "Kamashashi", "Nonko", "Nyarugunga", "Rwampara"
      ],
      popularAreas: [
        "Kabeza", "Kanombe", "Gikondo", "Kicukiro Centre", "Masaka",
        "Rebero", "Niboye", "Kagarama", "Gatenga", "Sonatube",
        "Nyarugunga", "Busanza", "Prince House", "Simba Supermarket"
      ]
    },
    {
      id: 3,
      name: "Nyarugenge",
      sectors: [
        "Gitega", "Kanyinya", "Kigali", "Kimisagara", "Mageragere",
        "Muhima", "Nyakabanda", "Nyamirambo", "Nyarugenge", "Rwezamenyo"
      ],
      cells: [
        // Nyamirambo cells
        "Cyivugiza", "Mumena", "Rugarama", "Biryogo",
        // Kimisagara cells
        "Kimisagara", "Katabaro", "Gakinjiro", "Nyabugogo",
        // Muhima cells
        "Akabahizi", "Agatare", "Muhima", "Ubumwe",
        // Nyarugenge cells
        "Rwampara", "Rugenge", "Kiyovu",
        // Gitega cells
        "Akabahizi", "Rebero", "Gitega"
      ],
      popularAreas: [
        "Downtown Kigali", "Kiyovu", "Nyamirambo", "Kimisagara", "Muhima",
        "Biryogo", "Nyabugogo", "Gitega", "Nyakabanda", "Rugenge",
        "City Centre", "CBD", "Bus Park", "Nyabugogo Market"
      ]
    }
  ],
  
  majorStreets: [
    // Main boulevards and avenues
    "KN 1 Rd", "KN 2 Ave", "KN 3 Ave", "KN 4 Ave", "KN 5 Rd",
    "KN 6 Ave", "KN 7 Ave", "KN 8 Ave", "KN 9 Ave", "KN 10 Ave",
    "KN 67 St", "KN 78 St", "KN 82 St", "KN 83 St", "KN 84 St",
    "KG 1 Ave", "KG 2 Ave", "KG 3 Ave", "KG 5 Ave", "KG 7 Ave",
    "KG 9 Ave", "KG 11 Ave", "KG 13 Ave", "KG 15 Ave", "KG 17 Ave",
    "KG 19 Ave", "KG 549 St", "KG 550 St", "KG 551 St",
    "KK 1 Ave", "KK 3 Ave", "KK 15 Ave", "KK 19 Ave", "KK 21 Ave",
    "Boulevard de l'Umuganda", "Umuganda Boulevard",
    "Boulevard de la Revolution", "Revolution Boulevard",
    "Avenue de la Paix", "Avenue de l'Armée", "Avenue de Kigali",
    "Airport Road", "Route de l'Aéroport",
    "Nyabugogo Road", "Remera Road", "Kimironko Road",
    "Kicukiro Road", "Gikondo Road", "Rebero Road"
  ],

  landmarks: [
    // Transport hubs
    { name: "Kigali International Airport", lat: -1.9686, lng: 30.1395, type: "transport" },
    { name: "Nyabugogo Bus Park", lat: -1.9372, lng: 30.0435, type: "transport" },
    { name: "Nyabugogo Taxi Park", lat: -1.9380, lng: 30.0448, type: "transport" },
    { name: "Remera Bus Stop", lat: -1.9460, lng: 30.1162, type: "transport" },
    { name: "Downtown Bus Stop", lat: -1.9540, lng: 30.0610, type: "transport" },
    { name: "Kimironko Bus Stop", lat: -1.9495, lng: 30.1270, type: "transport" },
    
    // Major roundabouts & junctions
    { name: "Kacyiru Roundabout", lat: -1.9425, lng: 30.0904, type: "junction" },
    { name: "Kimihurura Roundabout", lat: -1.9458, lng: 30.1039, type: "junction" },
    { name: "Sonatube Roundabout", lat: -1.9739, lng: 30.0964, type: "junction" },
    { name: "Prince House Roundabout", lat: -1.9731, lng: 30.1012, type: "junction" },
    { name: "Remera Roundabout", lat: -1.9448, lng: 30.1140, type: "junction" },
    { name: "Gisimenti Roundabout", lat: -1.9412, lng: 30.0758, type: "junction" },
    { name: "Nyabugogo Roundabout", lat: -1.9385, lng: 30.0440, type: "junction" },
    { name: "Kicukiro Roundabout", lat: -1.9897, lng: 30.1011, type: "junction" },
    { name: "Kanombe Roundabout", lat: -1.9686, lng: 30.1350, type: "junction" },
    { name: "Airport Roundabout", lat: -1.9680, lng: 30.1380, type: "junction" },
    
    // Government & official buildings
    { name: "Kigali Convention Centre", lat: -1.9503, lng: 30.0946, type: "landmark" },
    { name: "Parliament", lat: -1.9489, lng: 30.0920, type: "government" },
    { name: "Prime Minister's Office", lat: -1.9475, lng: 30.0912, type: "government" },
    { name: "City Hall", lat: -1.9536, lng: 30.0606, type: "government" },
    { name: "RDB Office", lat: -1.9510, lng: 30.0910, type: "government" },
    
    // Hospitals
    { name: "King Faisal Hospital", lat: -1.9558, lng: 30.0823, type: "hospital" },
    { name: "CHUK Hospital", lat: -1.9563, lng: 30.0610, type: "hospital" },
    { name: "Rwanda Military Hospital", lat: -1.9690, lng: 30.1360, type: "hospital" },
    { name: "Kibagabaga Hospital", lat: -1.9445, lng: 30.1180, type: "hospital" },
    { name: "Masaka Hospital", lat: -1.9920, lng: 30.1050, type: "hospital" },
    { name: "Kacyiru Hospital", lat: -1.9430, lng: 30.0900, type: "hospital" },
    { name: "Legacy Clinic Kimihurura", lat: -1.9470, lng: 30.1040, type: "hospital" },
    
    // Shopping & Markets
    { name: "Kimironko Market", lat: -1.9487, lng: 30.1262, type: "market" },
    { name: "Nyabugogo Market", lat: -1.9378, lng: 30.0441, type: "market" },
    { name: "Nyamirambo Market", lat: -1.9633, lng: 30.0356, type: "market" },
    { name: "Kicukiro Market", lat: -1.9897, lng: 30.1011, type: "market" },
    { name: "Simba Supermarket Kicukiro", lat: -1.9850, lng: 30.1000, type: "shopping" },
    { name: "Simba Supermarket Kimironko", lat: -1.9490, lng: 30.1260, type: "shopping" },
    { name: "Kigali Heights", lat: -1.9505, lng: 30.0945, type: "shopping" },
    { name: "MTN Center", lat: -1.9538, lng: 30.0608, type: "shopping" },
    { name: "UTC Mall", lat: -1.9535, lng: 30.0612, type: "shopping" },
    { name: "Kigali City Tower", lat: -1.9540, lng: 30.0610, type: "shopping" },
    
    // Stadiums & Sports
    { name: "Amahoro Stadium", lat: -1.9444, lng: 30.0839, type: "stadium" },
    { name: "Kigali Arena", lat: -1.9446, lng: 30.0842, type: "stadium" },
    { name: "Nyamirambo Stadium", lat: -1.9640, lng: 30.0360, type: "stadium" },
    
    // Education
    { name: "University of Rwanda - Gikondo", lat: -1.9819, lng: 30.0687, type: "education" },
    { name: "University of Rwanda - Remera", lat: -1.9456, lng: 30.1159, type: "education" },
    { name: "AUCA University", lat: -1.9700, lng: 30.1010, type: "education" },
    { name: "Kigali Independent University", lat: -1.9580, lng: 30.0640, type: "education" },
    
    // Hotels
    { name: "Kigali Marriott Hotel", lat: -1.9505, lng: 30.0945, type: "hotel" },
    { name: "Radisson Blu Kigali", lat: -1.9500, lng: 30.0940, type: "hotel" },
    { name: "Serena Hotel Kigali", lat: -1.9475, lng: 30.0905, type: "hotel" },
    { name: "Hotel des Mille Collines", lat: -1.9520, lng: 30.0630, type: "hotel" },
    
    // Popular areas/neighborhoods
    { name: "Downtown Kigali", lat: -1.9536, lng: 30.0606, type: "area" },
    { name: "Kiyovu", lat: -1.9550, lng: 30.0620, type: "area" },
    { name: "Nyarutarama", lat: -1.9400, lng: 30.1100, type: "area" },
    { name: "Gishushu", lat: -1.9430, lng: 30.1050, type: "area" },
    { name: "Gacuriro", lat: -1.9320, lng: 30.1080, type: "area" },
    { name: "Kagugu", lat: -1.9280, lng: 30.1020, type: "area" },
    { name: "Kibagabaga", lat: -1.9445, lng: 30.1180, type: "area" },
    { name: "Zindiro", lat: -1.9380, lng: 30.1320, type: "area" },
    { name: "Kabeza", lat: -1.9720, lng: 30.1300, type: "area" },
    { name: "Kanombe", lat: -1.9680, lng: 30.1350, type: "area" },
    { name: "Busanza", lat: -1.9750, lng: 30.1280, type: "area" },
    { name: "Remera", lat: -1.9456, lng: 30.1159, type: "area" },
    { name: "Nyamirambo", lat: -1.9633, lng: 30.0356, type: "area" },
    { name: "Kicukiro Centre", lat: -1.9897, lng: 30.1011, type: "area" },
    { name: "Gikondo Industrial", lat: -1.9819, lng: 30.0687, type: "area" },
    { name: "Rebero", lat: -1.9823, lng: 30.1142, type: "area" },
    { name: "Masaka", lat: -1.9920, lng: 30.1050, type: "area" },
    { name: "Niboye", lat: -1.9870, lng: 30.1080, type: "area" },
    { name: "Kagarama", lat: -1.9800, lng: 30.1100, type: "area" },
    { name: "Gatenga", lat: -1.9780, lng: 30.0720, type: "area" },
    { name: "Nyanza", lat: -1.9737, lng: 30.0924, type: "area" },
    { name: "Kimisagara", lat: -1.9600, lng: 30.0450, type: "area" },
    { name: "Biryogo", lat: -1.9620, lng: 30.0380, type: "area" },
    { name: "Muhima", lat: -1.9550, lng: 30.0550, type: "area" },
    { name: "Nyabugogo", lat: -1.9378, lng: 30.0441, type: "area" },
    { name: "Gatsata", lat: -1.9250, lng: 30.0500, type: "area" },
    { name: "Gisozi", lat: -1.9350, lng: 30.0650, type: "area" },
    
    // Memorials
    { name: "Gisozi Genocide Memorial", lat: -1.9350, lng: 30.0650, type: "memorial" },
    { name: "Kigali Genocide Memorial", lat: -1.9350, lng: 30.0650, type: "memorial" }
  ],
  
  // Quick access popular places for autocomplete
  popularPlaces: [
    // Most searched areas
    { name: "Kabeza", district: "Kicukiro", lat: -1.9720, lng: 30.1300 },
    { name: "Kanombe", district: "Kicukiro", lat: -1.9680, lng: 30.1350 },
    { name: "Remera", district: "Gasabo", lat: -1.9456, lng: 30.1159 },
    { name: "Kimironko", district: "Gasabo", lat: -1.9487, lng: 30.1262 },
    { name: "Gisozi", district: "Gasabo", lat: -1.9350, lng: 30.0650 },
    { name: "Kacyiru", district: "Gasabo", lat: -1.9425, lng: 30.0904 },
    { name: "Kimihurura", district: "Gasabo", lat: -1.9458, lng: 30.1039 },
    { name: "Nyarutarama", district: "Gasabo", lat: -1.9400, lng: 30.1100 },
    { name: "Gishushu", district: "Gasabo", lat: -1.9430, lng: 30.1050 },
    { name: "Gacuriro", district: "Gasabo", lat: -1.9320, lng: 30.1080 },
    { name: "Kagugu", district: "Gasabo", lat: -1.9280, lng: 30.1020 },
    { name: "Kibagabaga", district: "Gasabo", lat: -1.9445, lng: 30.1180 },
    { name: "Zindiro", district: "Gasabo", lat: -1.9380, lng: 30.1320 },
    { name: "Nyabugogo", district: "Nyarugenge", lat: -1.9378, lng: 30.0441 },
    { name: "Downtown", district: "Nyarugenge", lat: -1.9536, lng: 30.0606 },
    { name: "Kiyovu", district: "Nyarugenge", lat: -1.9550, lng: 30.0620 },
    { name: "Nyamirambo", district: "Nyarugenge", lat: -1.9633, lng: 30.0356 },
    { name: "Kimisagara", district: "Nyarugenge", lat: -1.9600, lng: 30.0450 },
    { name: "Biryogo", district: "Nyarugenge", lat: -1.9620, lng: 30.0380 },
    { name: "Muhima", district: "Nyarugenge", lat: -1.9550, lng: 30.0550 },
    { name: "Kicukiro", district: "Kicukiro", lat: -1.9897, lng: 30.1011 },
    { name: "Gikondo", district: "Kicukiro", lat: -1.9819, lng: 30.0687 },
    { name: "Rebero", district: "Kicukiro", lat: -1.9823, lng: 30.1142 },
    { name: "Masaka", district: "Kicukiro", lat: -1.9920, lng: 30.1050 },
    { name: "Niboye", district: "Kicukiro", lat: -1.9870, lng: 30.1080 },
    { name: "Kagarama", district: "Kicukiro", lat: -1.9800, lng: 30.1100 },
    { name: "Gatenga", district: "Kicukiro", lat: -1.9780, lng: 30.0720 },
    { name: "Busanza", district: "Kicukiro", lat: -1.9750, lng: 30.1280 },
    { name: "Sonatube", district: "Kicukiro", lat: -1.9739, lng: 30.0964 },
    { name: "Nyanza (KBC)", district: "Kicukiro", lat: -1.9737, lng: 30.0924 },
    { name: "Gatsata", district: "Gasabo", lat: -1.9250, lng: 30.0500 },
    { name: "Jabana", district: "Gasabo", lat: -1.9100, lng: 30.0400 },
    { name: "Ndera", district: "Gasabo", lat: -1.9200, lng: 30.1500 },
    { name: "Rusororo", district: "Gasabo", lat: -1.9000, lng: 30.1200 }
  ]
};

// Function to search locations - improved to search all sources
export const searchKigaliLocation = (query) => {
  if (!query || query.length < 2) return [];
  
  const searchTerm = query.toLowerCase().trim();
  const results = [];
  const addedNames = new Set(); // Prevent duplicates

  // Helper to add result without duplicates
  const addResult = (item) => {
    const key = item.name.toLowerCase();
    if (!addedNames.has(key)) {
      addedNames.add(key);
      results.push(item);
    }
  };

  // 1. Search in popular places first (most likely what users want)
  kigaliLocations.popularPlaces.forEach(place => {
    if (place.name.toLowerCase().includes(searchTerm)) {
      addResult({ 
        type: 'popular', 
        name: place.name, 
        district: place.district,
        lat: place.lat,
        lng: place.lng,
        label: `📍 ${place.name}, ${place.district}` 
      });
    }
  });

  // 2. Search in landmarks
  kigaliLocations.landmarks.forEach(landmark => {
    if (landmark.name.toLowerCase().includes(searchTerm)) {
      addResult({ 
        type: 'landmark', 
        name: landmark.name, 
        lat: landmark.lat,
        lng: landmark.lng,
        label: `🏛️ ${landmark.name}`
      });
    }
  });

  // 3. Search in districts, sectors, cells, and popular areas
  kigaliLocations.districts.forEach(district => {
    // District name
    if (district.name.toLowerCase().includes(searchTerm)) {
      addResult({ 
        type: 'district', 
        name: district.name, 
        label: `🏙️ ${district.name} District` 
      });
    }
    
    // Sectors
    district.sectors.forEach(sector => {
      if (sector.toLowerCase().includes(searchTerm)) {
        addResult({ 
          type: 'sector', 
          name: sector, 
          district: district.name,
          label: `📌 ${sector}, ${district.name}` 
        });
      }
    });

    // Cells
    if (district.cells) {
      district.cells.forEach(cell => {
        if (cell.toLowerCase().includes(searchTerm)) {
          addResult({ 
            type: 'cell', 
            name: cell, 
            district: district.name,
            label: `📍 ${cell}, ${district.name}` 
          });
        }
      });
    }

    // Popular areas within district
    if (district.popularAreas) {
      district.popularAreas.forEach(area => {
        if (area.toLowerCase().includes(searchTerm)) {
          addResult({ 
            type: 'area', 
            name: area, 
            district: district.name,
            label: `📍 ${area}, ${district.name}` 
          });
        }
      });
    }
  });

  // 4. Search in major streets
  kigaliLocations.majorStreets.forEach(street => {
    if (street.toLowerCase().includes(searchTerm)) {
      addResult({ type: 'street', name: street, label: `🛣️ ${street}` });
    }
  });

  return results.slice(0, 10); // Return top 10 matches
};

// Get coordinates for a location
export const getLocationCoordinates = (locationName) => {
  const name = locationName.toLowerCase();
  
  // Check landmarks first
  const landmark = kigaliLocations.landmarks.find(l => 
    l.name.toLowerCase() === name || l.name.toLowerCase().includes(name)
  );
  if (landmark) {
    return { lat: landmark.lat, lng: landmark.lng };
  }
  
  // Check popular places
  const popular = kigaliLocations.popularPlaces.find(p => 
    p.name.toLowerCase() === name || p.name.toLowerCase().includes(name)
  );
  if (popular) {
    return { lat: popular.lat, lng: popular.lng };
  }
  
  // Default to Kigali center
  return { lat: -1.9536, lng: 30.0606 };
};
