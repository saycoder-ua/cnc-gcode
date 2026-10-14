<div align="center">

# ⚙️ CNC-GCode-v.1.0

### Advanced Web-Based CNC Turning Calculator & G-Code Generation Suite

Production-grade web toolkit for Swiss-type lathe optimization, geometric contour building, AI blueprint vision parsing, safety auditing, and advanced G-code generation.

<br>

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

### 🏭 Calculate • Optimize • Generate • Verify

Built for professional CNC programmers, setup specialists, machinists, and manufacturing engineers.

</div>

---

# 📑 Table of Contents

- [🚀 Overview](#-overview)
- [✨ Key Features](#-key-features)
- [🛠 Technology Stack](#-technology-stack)
- [⚡ Quick Start](#-quick-start)
- [📦 Build & Production](#-build--production)
- [📄 License](#-license)

---

# 🚀 Overview

**CNC-GCode-v.1.0** is a modern browser-based manufacturing suite designed to eliminate manual spreadsheet calculations and reduce programming errors on the shop floor. It integrates geometry handling, material-specific cutting data, automated safety rules, and multi-dialect G-code output.

The application runs entirely client-side or locally, offering seamless support for standard 2-axis CNC lathes and complex Swiss-type sliding headstock machines (Tsugami, Star, Citizen).

---

# ✨ Key Features

1. **Drawing & Contour Builder**: Interactive geometric contour creation supporting chamfers, radii, threads, and multi-step turning profiles.
2. **AI Blueprint Vision Parser**: Upload part drawings or blueprint photos to automatically extract dimensions, tolerances, and features.
3. **Advanced G-Code Generation (Fanuc & Siemens Dialects)**:
   - Supports G71 roughing, G70 finishing, G76 threading, G84 tapping, and standard canned cycles.
   - Swiss-type sliding headstock single-pass optimization (Tsugami, Star, Citizen Cincom).
4. **Automated Safety Audit (Safety Check Engine)**:
   - Mandatory **G50** spindle speed clamping check before constant surface speed ($G96$).
   - Slenderness ratio ($L/D$) deflection and vibration warnings.
   - Chuck/collet interference zone collision detection ($Z_{\text{limit}}$).
5. **Machine & Material Database**:
   - Comprehensive specs for Tsugami S206/B0205, Star SR-20J/SB-16, Citizen L20, and standard 2-axis lathes.
   - Material cutting regimes for Stainless Steel (SS303/304), Aluminium, Brass, Titanium, and Alloy Steels.
6. **Cycle Time Benchmarking & Analytics**: Compare cycle times and parts-per-hour rates across different CNC machine models in your shop.
7. **Alarm Diagnostics (Fanuc & System Alarms)**: Instant troubleshooting guide for PS, SV, SP, OT, OH, and EX alarms with corrective maintenance steps.
8. **Bilingual Support**: Fully localized in English and Russian.

---

# 🛠 Technology Stack

| Technology | Purpose |
|------------|----------|
| **React 19** | UI Framework & Component Architecture |
| **TypeScript** | Strict Type Safety & Data Models |
| **Tailwind CSS v4** | Modern Utility-First Styling |
| **Vite** | Blazing-fast Development & Bundling |
| **Recharts & Canvas** | Toolpath Visualization & Analytics |
| **Google GenAI SDK** | AI Blueprint Vision Parsing |

---

# ⚡ Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/saycoder-ua/cnc-gcode.git
cd cnc-gcode
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

Open your browser and navigate to: `http://localhost:3000`

---

# 📦 Build & Production

### Build for Production
```bash
npm run build
```

### Preview Production Build Locally
```bash
npm run preview
```

---

# 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute for personal and commercial shop floor applications.

---

<div align="center">

# ⚙️ CNC-GCode-v.1.0

**Precision turning calculations and G-code automation for modern machine shops.**

⭐ Star this repository if you find it useful!

</div>