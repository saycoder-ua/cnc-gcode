# CNC-Calc-Plus 🛠️⚙️

An advanced web-based CNC turning calculator, Swiss-type lathe optimization suite, G-code generator, and machine shop assistant. Designed for professional CNC programmers, setup specialists, and machinists.

![CNC-Calc-Plus Banner](https://img.shields.io/badge/CNC--Calc--Plus-Production%20Ready-amber)
![TypeScript](https://img.shields.io/badge/TypeScript-React-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-cyan)

---

## 🌟 Key Features

1. **Drawing & Contour Builder**: Interactive geometric contour creation with chamfers, radii, threads, and multi-step turning profiles.
2. **AI Blueprint Vision Parser**: Upload part drawings or blueprint photos to automatically extract dimensions, tolerances, and features.
3. **Advanced G-Code Generation (Fanuc & Siemens Dialects)**:
   - Supports G71 roughing, G70 finishing, G76 threading, G84 tapping, and canned cycles.
   - Swiss-type sliding headstock single-pass optimization (Tsugami, Star, Citizen Cincom).
4. **Automated Safety Audit (Safety Check Engine)**:
   - Mandatory **G50** spindle speed clamping check before CSS (`G96`).
   - Slenderness ratio ($L/D$) deflection and vibration warnings.
   - Chuck/collet interference zone collision detection ($Z_{\text{limit}}$).
5. **Machine & Material Database**:
   - Comprehensive specs for Tsugami S206/B0205, Star SR-20J/SB-16, Citizen L20, and standard 2-axis lathes.
   - Material cutting regimes for Stainless Steel (SS303/304), Aluminium, Brass, Titanium, and Alloy Steels.
6. **Cycle Time Benchmarking & Analytics**: Compare cycle times and parts-per-hour rates across different CNC machine models in your shop.
7. **Alarm Diagnostics (Fanuc & System Alarms)**: Instant troubleshooting guide for PS, SV, SP, OT, OH, and EX alarms with corrective maintenance steps.
8. **Bilingual Support**: Fully localized in English and Russian.

---

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Charts & Visualization**: Recharts, Custom HTML5 Canvas Toolpath Simulator
- **AI Integration**: Google GenAI SDK (`@google/genai`) for intelligent blueprint vision parsing

---

## 🛠️ Installation & Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/cnc-calc-plus.git
   cd cnc-calc-plus
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build & Production

To build for production:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

---

## 📄 License

This project is licensed under the MIT License.
