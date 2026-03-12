import { GoogleGenAI, Type } from "@google/genai";

export interface FrequencyInfo {
  frequency: string;
  service: string;
  description: string;
  modulation: string;
  isLikelyActive: boolean;
  origin: string;
  locationName: string;
  bearing: number;
  estimatedDistanceKm: number;
  isFallback?: boolean;
}

// Simple in-memory cache to reduce API calls
const cache = new Map<string, FrequencyInfo>();

// Cooldown state for 429 errors
let cooldownUntil = 0;

// Helper for exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getFrequencyIntelligence(frequency: number, retries = 3): Promise<FrequencyInfo> {
  const freqKey = frequency.toFixed(3);
  
  if (cache.has(freqKey)) {
    return cache.get(freqKey)!;
  }

  const now = Date.now();
  if (now < cooldownUntil) {
    console.warn(`API is in cooldown. Returning fallback for ${freqKey} MHz.`);
    return getFallback(freqKey, frequency);
  }

  // Create a new instance to ensure we have the latest environment state
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identify the likely usage of the radio frequency ${freqKey} MHz. 
      Consider both VHF (30-300 MHz) and UHF (300-3000 MHz) bands. 
      Provide details about the service (e.g., Aviation, Marine, Amateur, Public Safety), a brief description, common modulation (NFM, AM, WFM), 
      and a likely origin point (e.g., "Regional Airport", "Municipal Dispatch", "Amateur Repeater").
      Include a specific location name (e.g. "Sector 7G", "East Ridge", "Harbor Control").
      Provide a random estimated distance in km (between 0.5 and 50) and a bearing in degrees (0-359).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            frequency: { type: Type.STRING },
            service: { type: Type.STRING },
            description: { type: Type.STRING },
            modulation: { type: Type.STRING },
            isLikelyActive: { type: Type.BOOLEAN },
            origin: { type: Type.STRING },
            locationName: { type: Type.STRING },
            bearing: { type: Type.NUMBER },
            estimatedDistanceKm: { type: Type.NUMBER }
          },
          required: ["frequency", "service", "description", "modulation", "isLikelyActive", "origin", "locationName", "bearing", "estimatedDistanceKm"]
        }
      }
    });

    const data = JSON.parse(response.text);
    cache.set(freqKey, data);
    return data;
  } catch (error: any) {
    const errorMsg = JSON.stringify(error);
    const isRateLimit = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED");
    const isTransient = errorMsg.includes("500") || errorMsg.includes("503") || errorMsg.includes("xhr error");

    if (isRateLimit) {
      // Set cooldown for 60 seconds if we hit a rate limit
      cooldownUntil = Date.now() + 60000;
      console.error("Rate limit hit. Entering 60s cooldown.");
    }

    if ((isRateLimit || isTransient) && retries > 0) {
      const waitTime = isRateLimit 
        ? Math.pow(2, 4 - retries) * 5000 + Math.random() * 2000
        : 1000 * (4 - retries); // Shorter wait for transient 500s
      
      console.warn(`API Error (${isRateLimit ? '429' : 'Transient'}). Retrying in ${Math.round(waitTime/1000)}s... (${retries} retries left)`);
      await sleep(waitTime);
      return getFrequencyIntelligence(frequency, retries - 1);
    }

    console.error("Intelligence fetch failed, using fallback:", error);
    return getFallback(freqKey, frequency);
  }
}

function getFallback(freqKey: string, frequency: number): FrequencyInfo {
  // Fallback data to keep the app functional during rate limits
  const fallbacks = [
    { service: "Local Repeater", origin: "Hilltop Station", loc: "North Peak" },
    { service: "Emergency Services", origin: "County Dispatch", loc: "Downtown" },
    { service: "Aviation Traffic", origin: "Control Tower", loc: "Airfield" },
    { service: "Marine Radio", origin: "Coast Guard", loc: "Harbor" },
    { service: "Utility Network", origin: "Power Grid", loc: "Substation" }
  ];
  const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];

  return {
    frequency: `${freqKey} MHz`,
    service: fallback.service,
    description: `Signal detected at ${freqKey} MHz. Live intelligence is currently unavailable due to high demand.`,
    modulation: frequency < 108 ? "WFM" : (frequency < 137 ? "AM" : "NFM"),
    isLikelyActive: true,
    origin: fallback.origin,
    locationName: fallback.loc,
    bearing: Math.floor(Math.random() * 360),
    estimatedDistanceKm: Number((Math.random() * 20 + 1).toFixed(1)),
    isFallback: true
  };
}
