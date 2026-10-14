import React, { useState } from 'react';
import { MaterialSpec } from '../types/cnc';
import { MATERIALS } from '../data/materials';
import { calculateCuttingParameters } from '../utils/calculators';
import { Gauge, Calculator, Sparkles, AlertCircle, Wrench, ChevronRight } from 'lucide-react';

interface FeedsSpeedsViewProps {
  currentMaterial: MaterialSpec;
  onSelectMaterial: (mat: MaterialSpec) => void;
  barDia: number;
  materials?: MaterialSpec[];
}

export const FeedsSpeedsView: React.FC<FeedsSpeedsViewProps> = ({
  currentMaterial,
  onSelectMaterial,
  barDia,
  materials
}) => {
  const [dia, setDia] = useState<number>(barDia || 10.0);
  const [vc, setVc] = useState<number>(currentMaterial.vcRough[0]);
  const [feed, setFeed] = useState<number>(currentMaterial.feedRough[0]);
  const [doc, setDoc] = useState<number>(currentMaterial.depthRough[0]);
  const [noseRadius, setNoseRadius] = useState<number>(0.4);
  const [activeTab, setActiveTab] = useState<'rough' | 'finish' | 'parting' | 'threading'>('rough');

  // Handle operation presets
  const handleSetOperation = (op: 'rough' | 'finish' | 'parting' | 'threading') => {
    setActiveTab(op);
    if (op === 'rough') {
      setVc(currentMaterial.vcRough[0]);
      setFeed(currentMaterial.feedRough[0]);
      setDoc(currentMaterial.depthRough[0]);
    } else if (op === 'finish') {
      setVc(currentMaterial.vcFinish[0]);
      setFeed(currentMaterial.feedFinish[0]);
      setDoc(currentMaterial.depthFinish[0]);
    } else if (op === 'parting') {
      setVc(currentMaterial.vcParting[0]);
      setFeed(currentMaterial.feedParting[0]);
      setDoc(dia / 2);
    } else if (op === 'threading') {
      setVc(currentMaterial.vcThreading[0]);
      setFeed(1.0); // 1.0mm pitch default
      setDoc(0.6134);
    }
  };

  const results = calculateCuttingParameters(
    dia,
    vc,
    feed,
    doc,
    currentMaterial.kc1_1,
    noseRadius
  );

  return (
    <div className="space-y-6">
      {/* Material Presets Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-display font-semibold text-slate-200 text-sm uppercase tracking-wider">
              Material Database & Recommended Regimes (Section 6)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono-code">
            Specific Cutting Force kc1.1 = {currentMaterial.kc1_1} N/mm²
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(materials || MATERIALS).map((mat) => (
            <button
              key={mat.id}
              onClick={() => {
                onSelectMaterial(mat);
                const sMult = mat.speedMultiplier ?? 1.0;
                const fMult = mat.feedMultiplier ?? 1.0;
                setVc(Math.round(mat.vcRough[0] * sMult));
                setFeed(Number((mat.feedRough[0] * fMult).toFixed(3)));
                setDoc(mat.depthRough[0]);
              }}
              className={`p-2.5 rounded text-left border transition text-xs flex flex-col justify-between relative overflow-hidden ${
                currentMaterial.id === mat.id
                  ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div 
                className="absolute top-0 left-0 bottom-0 w-1" 
                style={{ backgroundColor: mat.colorCode || '#3b82f6' }} 
              />
              <div className="font-bold font-mono-code mb-1 pl-1 flex items-center justify-between">
                <span>{mat.code}</span>
                {mat.isCustom && <span className="text-[9px] text-cyan-400">★</span>}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-1 pl-1">{mat.name}</div>
            </button>
          ))}
        </div>

        {/* Material Notes */}
        <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-slate-300">
            <strong>Shop Notes for {currentMaterial.code}:</strong> {currentMaterial.notes}{' '}
            <span className="text-amber-400 font-medium">Coolant: {currentMaterial.coolantRecommended}</span>
          </div>
        </div>
      </div>

      {/* Operation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => handleSetOperation('rough')}
          className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
            activeTab === 'rough' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Rough Turning
        </button>
        <button
          onClick={() => handleSetOperation('finish')}
          className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
            activeTab === 'finish' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Finish Turning
        </button>
        <button
          onClick={() => handleSetOperation('parting')}
          className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
            activeTab === 'parting' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Parting-Off / Grooving
        </button>
        <button
          onClick={() => handleSetOperation('threading')}
          className={`px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
            activeTab === 'threading' ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          Threading
        </button>
      </div>

      {/* Interactive Controls & Real-Time Calculation Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-4 h-4 text-cyan-400" />
            <h4 className="font-display font-semibold text-slate-200 text-xs uppercase tracking-wider">
              Machining Parameters Input
            </h4>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Workpiece Diameter (D):</span>
              <span className="font-mono-code font-bold text-slate-200">Ø{dia} mm</span>
            </div>
            <input
              type="range"
              min="1"
              max="65"
              step="0.5"
              value={dia}
              onChange={(e) => setDia(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Surface Speed (Vc):</span>
              <span className="font-mono-code font-bold text-amber-400">{vc} m/min</span>
            </div>
            <input
              type="range"
              min="20"
              max="900"
              step="5"
              value={vc}
              onChange={(e) => setVc(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Feed per Revolution (fn):</span>
              <span className="font-mono-code font-bold text-cyan-300">{feed} mm/rev</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.40"
              step="0.005"
              value={feed}
              onChange={(e) => setFeed(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Depth of Cut (ap):</span>
              <span className="font-mono-code font-bold text-emerald-300">{doc} mm</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="4.0"
              step="0.05"
              value={doc}
              onChange={(e) => setDoc(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Tool Nose Radius (r_eps):</span>
              <span className="font-mono-code font-bold text-purple-300">R{noseRadius} mm</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0.1, 0.2, 0.4, 0.8].map((r) => (
                <button
                  key={r}
                  onClick={() => setNoseRadius(r)}
                  className={`py-1 rounded text-xs font-mono-code border ${
                    noseRadius === r
                      ? 'bg-purple-950 text-purple-300 border-purple-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  R{r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Output Dashboard (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <h4 className="font-display font-semibold text-slate-200 text-xs uppercase tracking-wider">
                Computed CNC Cutting Regimes
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono-code">
              {/* Spindle RPM */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Spindle Speed (N)</div>
                <div className="text-xl font-bold text-amber-400 mt-1">{results.rpm} <span className="text-xs text-slate-500">RPM</span></div>
                <div className="text-[10px] text-slate-500 mt-0.5">N = (1000·Vc)/(π·D)</div>
              </div>

              {/* Feed Rate mm/min */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Table Feed (Vf)</div>
                <div className="text-xl font-bold text-cyan-400 mt-1">{results.feedRatePerMin} <span className="text-xs text-slate-500">mm/min</span></div>
                <div className="text-[10px] text-slate-500 mt-0.5">Vf = N · fn</div>
              </div>

              {/* Surface Finish Ra */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Theoretical Ra</div>
                <div className={`text-xl font-bold mt-1 ${
                  results.theoreticalRa <= 0.8 ? 'text-emerald-400' : results.theoreticalRa <= 1.6 ? 'text-cyan-400' : 'text-amber-400'
                }`}>
                  {results.theoreticalRa} <span className="text-xs text-slate-500">µm</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Ra ≈ f² / (32·r_eps)</div>
              </div>

              {/* Rmax */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Peak Roughness (Rmax)</div>
                <div className="text-xl font-bold text-purple-300 mt-1">{results.theoreticalRmax} <span className="text-xs text-slate-500">µm</span></div>
                <div className="text-[10px] text-slate-500 mt-0.5">Rmax ≈ f² / (8·r_eps)</div>
              </div>

              {/* MRR */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Removal Rate (MRR)</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{results.mrrCm3Min} <span className="text-xs text-slate-500">cm³/min</span></div>
                <div className="text-[10px] text-slate-500 mt-0.5">MRR = Vc · ap · fn</div>
              </div>

              {/* Power Pc */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Spindle Power (Pc)</div>
                <div className="text-xl font-bold text-rose-400 mt-1">{results.powerKw} <span className="text-xs text-slate-500">kW</span></div>
                <div className="text-[10px] text-slate-500 mt-0.5">Torque: {results.torqueNm} Nm</div>
              </div>
            </div>
          </div>

          {/* Quick G-Code Snip Preview */}
          <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800 font-mono-code text-xs text-slate-300 flex items-center justify-between">
            <div>
              <span className="text-slate-500">Fanuc CSS Command: </span>
              <span className="text-amber-400 font-bold">G50 S{Math.min(results.rpm + 500, 10000)} ; G96 S{vc} M03 ; G01 F{feed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
