/**
 * @fileOverview Master dataset for 200 agricultural commodities.
 * Features a deterministic seeded PRNG for consistent price history across sessions.
 */

export interface Crop {
  id: string;
  name: string;
  category: 'vegetable' | 'fruit' | 'crop' | 'seed';
  emoji: string;
  unit: string;
  basePrice: number;
  priceHistory: number[];
  forecastPrices: number[];
  trend: 'bullish' | 'bearish' | 'volatile' | 'stable';
  changeToday: number;
  season: string;
  states: string[];
  weather: { minTemp: number; maxTemp: number; rainfall: 'low' | 'medium' | 'high'; humidity: string };
  irrigation: { method: string; waterReq: string; frequency: string };
  pesticides: { name: string; target: string; dosage: string }[];
  fertilizers: { name: string; npk: string; timing: string }[];
  soilType: string;
  growthDays: number;
  yieldPerHectare: string;
  mspINR: number | null;
  tags: string[];
}

function seedRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return function() {
    h = (Math.imul(48271, h)) | 0;
    return (h >>> 0) / 2147483647;
  };
}

const CATEGORIES = {
  vegetable: ["Tomato", "Potato", "Onion", "Brinjal", "Capsicum", "Cabbage", "Cauliflower", "Carrot", "Radish", "Spinach", "Okra", "Bitter Gourd", "Bottle Gourd", "Ridge Gourd", "Snake Gourd", "Drumstick", "Peas", "French Beans", "Cluster Beans", "Cucumber", "Pumpkin", "Ash Gourd", "Colocasia", "Sweet Potato", "Turnip", "Beetroot", "Fenugreek", "Coriander", "Mint", "Curry Leaves", "Garlic", "Ginger", "Green Chilli", "Turmeric", "Leek", "Celery", "Zucchini", "Broccoli", "Lettuce", "Kale", "Spring Onion", "Amaranth", "Drumstick Leaves", "Raw Banana", "Jackfruit (raw)", "Raw Mango", "Arbi", "Parwal", "Tinda", "Luffa"],
  fruit: ["Mango", "Banana", "Apple", "Grapes", "Pomegranate", "Guava", "Papaya", "Watermelon", "Muskmelon", "Pineapple", "Litchi", "Strawberry", "Orange", "Mosambi", "Lemon", "Lime", "Sapota", "Custard Apple", "Jamun", "Fig", "Pear", "Peach", "Plum", "Cherry", "Kiwi", "Avocado", "Coconut", "Jackfruit (ripe)", "Dragon Fruit", "Passion Fruit", "Star Fruit", "Mulberry", "Gooseberry", "Tamarind", "Wood Apple", "Bael", "Mahua", "Karonda", "Ber", "Phalsa", "Kokum", "Amla", "Dates", "Cashew Apple", "Toddy Palm Fruit", "Longan", "Rambutan", "Mangosteen", "Breadfruit", "Durian"],
  crop: ["Wheat", "Rice", "Maize", "Sugarcane", "Soybean", "Cotton", "Groundnut", "Sunflower", "Mustard", "Sesame", "Linseed", "Castor", "Jowar", "Bajra", "Ragi", "Barley", "Oats", "Chickpea", "Pigeon Pea", "Black Gram", "Green Gram", "Lentil", "Kidney Beans", "Cowpea", "Horse Gram", "Moth Bean", "Adzuki Bean", "Field Pea", "Faba Bean", "Lupin", "Jute", "Hemp", "Flax", "Tobacco", "Coffee", "Tea", "Rubber", "Cocoa", "Cardamom", "Black Pepper", "Vanilla", "Saffron", "Areca Nut", "Betel Leaf", "Hops", "Aloe Vera", "Stevia", "Moringa", "Bamboo", "Vetiver"],
  seed: ["Tomato Hybrid Seed", "Onion Seed", "Carrot Seed", "Watermelon Seed", "Cucumber Seed", "Capsicum Seed", "Brinjal Seed", "Cabbage Seed", "Cauliflower Seed", "Pumpkin Seed", "Sunflower Seed", "Marigold Seed", "Coriander Seed", "Fennel Seed", "Cumin Seed", "Mustard Seed", "Fenugreek Seed", "Ajwain Seed", "Nigella Seed", "Sesame Seed", "Flaxseed", "Chia Seed", "Hemp Seed", "Pumpkin Seed (edible)", "Watermelon Kernel", "Muskmelon Seed", "Bitter Gourd Seed", "Bottle Gourd Seed", "Ridge Gourd Seed", "Snake Gourd Seed", "Okra Seed", "French Bean Seed", "Peas Seed", "Cluster Bean Seed", "Cowpea Seed", "Soybean Seed", "Groundnut Seed", "Sunflower Seed (oil)", "Cotton Seed", "Wheat Seed (certified)", "Rice Seed (hybrid)", "Maize Seed (hybrid)", "Jowar Seed", "Bajra Seed", "Ragi Seed", "Barley Seed", "Chickpea Seed", "Pigeon Pea Seed", "Green Gram Seed", "Black Gram Seed"]
};

const EMOJIS: Record<string, string> = {
  vegetable: "🥦", fruit: "🍎", crop: "🌾", seed: "🌱",
  Tomato: "🍅", Potato: "🥔", Onion: "🧅", Mango: "🥭", Banana: "🍌", Wheat: "🌾", Rice: "🍚"
};

function generateCrops(): Crop[] {
  const allCrops: Crop[] = [];
  
  (Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).forEach(cat => {
    CATEGORIES[cat].forEach(name => {
      const id = name.toLowerCase().replace(/\s+/g, '-');
      const rand = seedRandom(id);
      
      const basePrice = Math.floor(rand() * 80) + 15;
      const history: number[] = [basePrice];
      for (let i = 1; i < 180; i++) {
        const last = history[i - 1];
        const walk = (rand() - 0.495) * (last * 0.04);
        history.push(Math.max(5, parseFloat((last + walk).toFixed(2))));
      }
      
      const forecast: number[] = [history[179]];
      const bias = rand() > 0.6 ? 0.002 : -0.001;
      for (let i = 1; i < 180; i++) {
        const last = forecast[i - 1];
        const walk = (rand() - 0.49) * (last * 0.05) + (last * bias);
        forecast.push(Math.max(5, parseFloat((last + walk).toFixed(2))));
      }

      allCrops.push({
        id,
        name,
        category: cat,
        emoji: EMOJIS[name] || EMOJIS[cat] || "🌿",
        unit: cat === 'seed' ? 'kg' : (['Wheat', 'Rice', 'Maize'].includes(name) ? 'quintal' : 'kg'),
        basePrice: history[179],
        priceHistory: history,
        forecastPrices: forecast,
        trend: rand() > 0.7 ? 'bullish' : rand() > 0.4 ? 'stable' : 'volatile',
        changeToday: parseFloat(((rand() - 0.5) * 6).toFixed(2)),
        season: "Oct–Feb",
        states: ["Maharashtra", "Karnataka", "Punjab"].sort(() => rand() - 0.5).slice(0, 2),
        weather: { minTemp: 18, maxTemp: 32, rainfall: 'medium', humidity: "60-70%" },
        irrigation: { method: "Drip", waterReq: "Medium", frequency: "Weekly" },
        pesticides: [{ name: "Neem Oil", target: "Aphids", dosage: "5ml/L" }],
        fertilizers: [{ name: "Urea", npk: "46-0-0", timing: "Sowing" }],
        soilType: "Loamy",
        growthDays: 120,
        yieldPerHectare: "25-30 tons",
        mspINR: cat === 'crop' ? Math.floor(basePrice * 0.8) : null,
        tags: [cat, "market-ready"]
      });
    });
  });

  return allCrops;
}

export const CROPS = generateCrops();
