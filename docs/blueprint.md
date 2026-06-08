# **App Name**: KrishiShield AI

## Core Features:

- WebGL Field Entry Preloader: Procedural wheat field cinematic rendered with Three.js instanced meshes and Perlin noise, featuring a GLSL transition shader into the application shell.
- Crop Health Command Orb: Interactive SVG-based command center displaying real-time farm metrics with connected satellite nodes for Nitrogen, Moisture, and Pest risk data.
- AI Intelligence Feed Tool: Real-time tool calling Groq API to generate localized agricultural briefings for specific crops and regions using LLM reasoning.
- Predictive Price Forecaster: Data-rich Chart.js visualization comparing historical price trends with AI-predicted blue-line projections and confidence intervals.
- NDVI & Disease Intelligence Tool: Procedural Canvas NDVI heatmap paired with a diagnostic timeline tool using AI to suggest specific disease treatment protocols based on humidity/spore data.
- Harvest-Backed Finance Engine: A 4-step eligibility flow using staggered UI animations to verify crop health scores against blockchain-ready smart contract stubs for low-interest loans.
- Impact Storytelling Generator: Generates emotional farmer narratives using Groq and creates abstract unique circular avatars using name-to-hue hashing algorithms.

## Style Guidelines:

- Primary: Forest Green (#1B5E20) used for healthy growth metrics and navigation elements to anchor the agricultural theme.
- Accent: Precision Blue (#1976D2) for AI predictions, chart data, and 'Lock Price' workflows to symbolize technical trust.
- Background: Field Mode utilizes a warm cream base (#FDF6E3) with pure black text for sunlight visibility, contrasting with the Cinematic Zenith Indigo (#0F1123) used in headers.
- Headlines use 'Anybody' (Variable, Weight 900) with an animated italic axis; body text uses 'Inter' (300/500) for a neutral, technical Bloomberg-esque aesthetic.
- Note: currently only Google Fonts are supported. 'Source Code Pro' is used for monospaced timestamps and Smart Contract stubs.
- Dynamic layout shifting between a mobile bottom bar and a desktop left rail (64px) with context-sensitive top bars featuring sticky biometric clocks.
- A unified viewport orchestration system using IntersectionObserver for 500ms staggered entrances and high-frequency requestAnimationFrame loops for the rotating health orb.