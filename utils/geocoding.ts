export async function getCoordinatesFromAddress(
  address: string,
  city: string,
  zipCode: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    // 1. Prioritize postcodes.io for accurate UK postcode geocoding
    if (zipCode) {
      const cleanPostcode = zipCode.replace(/\s+/g, "");
      const pcUrl = `https://api.postcodes.io/postcodes/${cleanPostcode}`;
      const pcRes = await fetch(pcUrl);
      if (pcRes.ok) {
        const pcData = await pcRes.json();
        if (pcData.status === 200 && pcData.result) {
          return {
            lat: pcData.result.latitude,
            lng: pcData.result.longitude,
          };
        }
      }
    }

    // 2. Fallback to Nominatim (OpenStreetMap) if postcodes.io fails or no zipCode
    const query = `${address}, ${city}, ${zipCode}, UK`.replace(/,\s*,/g, ",");
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "EatInOut-App/1.0",
      },
    });

    if (!response.ok) {
      console.error("Nominatim API error:", response.statusText);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    } else {
      const fallbackQuery = `${city}, ${zipCode}, UK`.replace(/,\s*,/g, ",");
      const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        fallbackQuery
      )}&format=json&limit=1`;

      const fallbackResponse = await fetch(fallbackUrl, {
        headers: {
          "User-Agent": "EatInOut-App/1.0",
        },
      });
      
      const fallbackData = await fallbackResponse.json();
      if (fallbackData && fallbackData.length > 0) {
        return {
          lat: parseFloat(fallbackData[0].lat),
          lng: parseFloat(fallbackData[0].lon),
        };
      }

      console.warn("No coordinates found for address:", query);
      return null;
    }
  } catch (error) {
    console.error("Error in getCoordinatesFromAddress:", error);
    return null;
  }
}
