export async function getCoordinatesFromAddress(
  address: string,
  city: string,
  zipCode: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_GEOCODING_API;

    if (!GOOGLE_API_KEY) {
      console.warn("GOOGLE_GEOCODING_API key is missing in environment variables.");
      return null;
    }

    // Construct a clean, full address string
    const fullAddress = `${address || ''}, ${city || ''}, ${zipCode || ''}, UK`.replace(/^, /, '').trim();
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error("Google Geocoding API HTTP error:", response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } else {
      console.warn(`Geocoding failed for address "${fullAddress}": ${data.status}`);
      if (data.error_message) {
        console.error(`Error details: ${data.error_message}`);
      }
      return null;
    }
  } catch (error) {
    console.error("Error in getCoordinatesFromAddress:", error);
    return null;
  }
}
