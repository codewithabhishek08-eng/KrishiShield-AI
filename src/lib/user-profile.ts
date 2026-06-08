/**
 * @fileOverview Single source of truth for user profile and prompt construction.
 */

export interface UserProfile {
  name: string;
  city: string;
  state: string;
  country: string;
  crops: string[];
  fieldSize: string;
  soilType: string;
  irrigationType: string;
}

export const STORAGE_KEY = 'krishiProfile';

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Kisan Farmer',
  city: 'Your City',
  state: 'Your State',
  country: 'India',
  crops: ['tomato'],
  fieldSize: '1.0 hectares',
  soilType: 'Loamy',
  irrigationType: 'Drip',
};

export const INDIAN_STATES = [
  "Maharashtra", "Punjab", "Haryana", "Karnataka", "Gujarat", 
  "Uttar Pradesh", "Rajasthan", "Madhya Pradesh", "Tamil Nadu", "Andhra Pradesh",
  "Telangana", "West Bengal", "Bihar", "Odisha", "Kerala", "Assam"
];

export function getProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_PROFILE;
  try {
    const parsed = JSON.parse(saved);
    // Ensure critical fields aren't blank
    if (!parsed.city) parsed.city = DEFAULT_PROFILE.city;
    if (!parsed.state) parsed.state = DEFAULT_PROFILE.state;
    return parsed;
  } catch (e) {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: UserProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event('profileUpdated'));
}

export function hasProfile(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(STORAGE_KEY);
}

export const PROMPT_TEMPLATES = {
  NDVI: "NDVI score is {ndvi} for {crop} in {city}, {state}, week {week}. Current trend: {trend_direction}. Diagnose in 2 sentences and give one specific action the farmer must take today.",
  DISEASE: "Disease probability is {prob}% for {crop} in {city}, {state}. Humidity {h}%, Temp {t}°C, recent rainfall {mm}mm. Name the most likely pathogen, explain why conditions favour it, and give the earliest intervention step.",
  YIELD: "Projected yield is {yield}kg/acre vs regional average {avg}kg/acre for {crop} in {city}, {state}. Explain the yield gap cause in one sentence and give one corrective measure with expected recovery percentage.",
  RAINFALL: "Rainfall deficit is {deficit}mm this week for {crop} needing {need}mm in {city}, {state}. Give a precise irrigation recommendation — method, timing, and quantity — in 2 sentences.",
  MARKET_FORECAST: "Forecast {crop} price trend for {city}, {state} market over next 6 months. Current price ₹{price}/kg. Give 3 key drivers and a price range prediction in 3 sentences.",
  MARKET_WEATHER: "Analyze ideal growing temperature and season suitability for {crop} in {state}. Best sowing months? Frost/heat risks for {city}?",
  MARKET_IRRIGATION: "Water requirement for {crop} in {city}, {state} per acre per week. Recommended method based on {soil} soil? Current deficit/surplus assessment.",
  MARKET_PEST: "Top 3 active pest threats for {crop} in {state} this season. Outbreak probability in {city}? Recommended pesticide and organic alternative.",
  MARKET_SOIL: "NPK recommendation for {crop} in {state} on {soil} soil. Application schedule and estimated cost per acre."
};

export function buildPrompt(templateKey: keyof typeof PROMPT_TEMPLATES, profile: UserProfile, extras: any = {}) {
  let template = PROMPT_TEMPLATES[templateKey];
  return template
    .replaceAll('{name}', profile.name)
    .replaceAll('{city}', profile.city)
    .replaceAll('{state}', profile.state)
    .replaceAll('{soil}', profile.soilType)
    .replaceAll('{crop}', extras.crop || (profile.crops && profile.crops[0]) || 'wheat')
    .replaceAll('{ndvi}', extras.ndvi || '0.0')
    .replaceAll('{prob}', extras.prob || '0')
    .replaceAll('{h}', extras.h || '0')
    .replaceAll('{t}', extras.t || '0')
    .replaceAll('{mm}', extras.mm || '0')
    .replaceAll('{yield}', extras.yield || '0')
    .replaceAll('{avg}', extras.avg || '0')
    .replaceAll('{deficit}', extras.deficit || '0')
    .replaceAll('{need}', extras.need || '0')
    .replaceAll('{price}', extras.price || '0')
    .replaceAll('{trend_direction}', extras.trend_direction || 'stable')
    .replaceAll('{week}', extras.week || 'W1');
}