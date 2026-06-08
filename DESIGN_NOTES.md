# KrishiShield AI: Design Philosophy & Engineering Notes

## 1. The Opening Cinematic
We opted for a **WebGL-based Instanced Mesh approach** over video for three reasons:
- **Performance**: 80,000 instances are rendered in a single draw call, maintaining 60fps on modern desktops.
- **Interactivity**: The wind shader (diagonal sine wavefront) responds to coordinate space, creating a living field rather than a looping clip.
- **Narrative**: The slow dolly and micro-tilt are calculated to trigger a "flow state" in the user before they enter the technical dashboard.

## 2. The Color Palette
- **Forest Green (#1B5E20)**: Grounded in agricultural growth. Used primarily for healthy states and positive progression.
- **Precision Blue (#1976D2)**: Borrowed from high-frequency trading terminals. It signals the "AI Layer"—predictions, blockchain stubs, and forecasting.
- **Zenith Indigo (#0F1123)**: Used for deep contrast backgrounds (like the smart contract stub) to focus the eye on critical technical data.

## 3. The "Field Mode" Theme
Traditional light/dark modes often fail in direct sunlight (field conditions). 
- **Hue**: Warm cream (#FDF6E3) reduces eye strain from blue light.
- **Contrast**: Pure black text (#000000) on the cream background maximizes readability at high screen brightness.

## 4. Dashboard Mission Control
The **Crop Health Orb** is designed to provide immediate status without reading text.
- Rotating conic gradient (CSS variable updated via `requestAnimationFrame`) provides a subtle "active" heartbeat to the UI.
- Conic gradients are calculated directly from the health score to ensure data fidelity.

## 5. Intelligence Feed
The feed uses **monospaced timestamps** and **category-based badges** to mimic military/intelligence briefings. This density of information is intentional, treating the farmer as an operator of a sophisticated asset (the farm).

## 6. NDVI Canvas Logic
The Satellite screen uses a custom **HTML Canvas procedural renderer**.
- Irregular polygon mapping mimics real plot boundaries.
- The pulsing dashed border on the "Stress Patch" uses `setLineDash` with an offset, creating an "active threat" visualization.

## 7. Animation Orchestration
Instead of heavy libraries (GSAP/Framer), we used a **single IntersectionObserver** combined with CSS Custom Properties.
- Stagger delays are calculated via `(index * 80)ms`.
- Transition curves follow `cubic-bezier(0.22, 1, 0.36, 1)`, providing a "slick but heavy" feel—movement starts fast and decelerates with weight.

## 8. Financial Engine
The Eligibility Check uses **400ms staggered intervals** to simulate real-time processing of high-volume data (Satellite/Identity/Health). This "mechanical" verification builds trust in the AI's decision-making process.
