console.log("Restaurant data collection started..");
const fs = require("fs");

async function collectRestaurants() {
  try {
    // 1. Find Benz Circle coordinates
    const place = "Benz Circle, Vijayawada, Andhra Pradesh, India";

    const geoUrl =
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;

    const geoResponse = await fetch(geoUrl, {
      headers: {
        "User-Agent": "VijayawadaFoodTourismDataCollector/1.0"
      }
    });

    if (!geoResponse.ok) {
      throw new Error("Could not find Benz Circle coordinates.");
    }

    const geoData = await geoResponse.json();

    if (!geoData.length) {
      throw new Error("Benz Circle location was not found.");
    }

    const lat = Number(geoData[0].lat);
    const lon = Number(geoData[0].lon);

    console.log("Benz Circle coordinates found:", lat, lon);

    // 2. Fetch mapped food places within 1.8 km
    const query = `
      [out:json][timeout:40];
      (
        nwr["amenity"~"^(restaurant|fast_food|cafe|food_court|ice_cream)$"]
        (around:1800,${lat},${lon});
      );
      out center tags;
    `;

   const endpoints = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];

let response;

for (const endpoint of endpoints) {
  try {
    console.log("Trying API:", endpoint);

    const currentResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "VijayawadaFoodTourismDataCollector/1.0"
      },
      body: "data=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(60000)
    });

    if (currentResponse.ok) {
      response = currentResponse;
      break;
    }

    console.log(
      "API response:",
      currentResponse.status,
      currentResponse.statusText
    );

  } catch (error) {
    console.log("API error:", error.message);
  }
}

if (!response) {
  throw new Error("All Overpass servers failed. Please try later.");
}
    const result = await response.json();

    // 3. Organize and remove duplicates
    const seen = new Set();

    const restaurants = result.elements
      .filter(item => item.tags?.name)
      .filter(item => {
        const uniqueId = `${item.type}-${item.id}`;

        if (seen.has(uniqueId)) return false;

        seen.add(uniqueId);
        return true;
      })
      .map(item => {
        const tags = item.tags || {};

        const latitude = item.lat ?? item.center?.lat ?? "";
        const longitude = item.lon ?? item.center?.lon ?? "";

        const address = [
          tags["addr:housenumber"],
          tags["addr:street"],
          tags["addr:suburb"],
          tags["addr:city"],
          tags["addr:postcode"]
        ].filter(Boolean).join(", ");

        return {
          name: tags.name || "",
          category: tags.amenity || "",
          address: address || "Not Available",
          latitude,
          longitude,
          cuisine: tags.cuisine || "Not Available",
          phone: tags.phone || tags["contact:phone"] || "Not Available",
          website: tags.website || tags["contact:website"] || "Not Available",
          opening_hours: tags.opening_hours || "Not Available",
          source: "OpenStreetMap",
          osm_id: `${item.type}/${item.id}`
        };
      });

    // 4. Export as CSV (opens in Excel)
    const columns = [
      "name", "category", "address", "latitude", "longitude",
      "cuisine", "phone", "website", "opening_hours",
      "source", "osm_id"
    ];

    const escapeCSV = value =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [
      columns.join(","),
      ...restaurants.map(place =>
        columns.map(column => escapeCSV(place[column])).join(",")
      )
    ].join("\n");

    fs.writeFileSync(
      "benz-circle-restaurants.csv",
      "\uFEFF" + csv,
      "utf8"
    );

    console.log(`Successfully collected ${restaurants.length} places.`);
    console.log("File created: benz-circle-restaurants.csv");

  } catch (error) {
    console.error("Error:", error.message);
  }
}

collectRestaurants();