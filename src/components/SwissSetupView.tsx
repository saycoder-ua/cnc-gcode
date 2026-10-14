import React, { useState } from 'react';
import { MachineSpec } from '../types/cnc';
import { evaluateGuideBushing } from '../utils/calculators';
import { Wrench, ShieldAlert, CheckCircle2, AlertTriangle, Droplets, Wind, Sliders, CheckSquare } from 'lucide-react';

interface SwissSetupViewProps {
  machine: MachineSpec;
  barDia: number;
}

export const SwissSetupView: React.FC<SwissSetupViewProps> = ({ machine, barDia }) => {
  const [nominalDia, setNominalDia] = useState<number>(barDia || 5.8);
  const [actualBarDia, setActualBarDia] = useState<number>(Number((barDia - 0.006).toFixed(3)));
  const [guideBushingId, setGuideBushingId] = useState<number>(Number((barDia + 0.003).toFixed(3)));
  const [pneumaticBar, setPneumaticBar] = useState<number>(5.5);
  const [oilCheckShift1, setOilCheckShift1] = useState<boolean>(true);
  const [oilCheckShift2, setOilCheckShift2] = useState<boolean>(false);
  const [mode, setMode] = useState<'guide_bushing' | 'chucker'>('guide_bushing');

  const gbCheck = evaluateGuideBushing(nominalDia, actualBarDia, guideBushingId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-amber-400 shrink-0" />
          <div>
            <h3 className="font-display font-bold text-slate-100 text-base">
              SWISS LATHE SETUP & GUIDE BUSHING SPECIALIST (SECTION 3)
            </h3>
            <p className="text-xs text-slate-400">
              Active Machine: <strong className="text-amber-400 font-mono-code">{machine.name}</strong> ({machine.controller}) | Bushing: <strong className="text-slate-200 capitalize">{machine.guideBushingType}</strong>
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded border border-slate-800 text-xs font-mono-code">
          <button
            onClick={() => setMode('guide_bushing')}
            className={`px-3 py-1 rounded transition ${
              mode === 'guide_bushing' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Guide Bushing Mode
          </button>
          <button
            onClick={() => setMode('chucker')}
            className={`px-3 py-1 rounded transition ${
              mode === 'chucker' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chucker (GB-Less) Mode
          </button>
        </div>
      </div>

      {/* Guide Bushing Clearance Calculator (CRITICAL RULE) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h4 className="font-display font-semibold text-slate-200 text-xs uppercase tracking-wider">
              Guide Bushing Clearance Calculator (+0.005 mm to +0.015 mm Target)
            </h4>
          </div>
          <span className="text-xs font-mono-code text-slate-400">
            Tolerance Spec: <strong className="text-slate-200">ISO h8 / h9 Ground Bar</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <label className="text-[11px] text-slate-400 block mb-1">Nominal Bar Stock (Ø mm)</label>
            <input
              type="number"
              step="0.1"
              value={nominalDia}
              onChange={(e) => setNominalDia(parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono-code text-sm outline-none focus:border-cyan-400"
            />
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <label className="text-[11px] text-slate-400 block mb-1">Micrometer Measured Bar (Ø mm)</label>
            <input
              type="number"
              step="0.001"
              value={actualBarDia}
              onChange={(e) => setActualBarDia(parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-cyan-300 font-mono-code text-sm outline-none focus:border-cyan-400"
            />
            <div className="text-[10px] text-slate-500 mt-1 font-mono-code">
              Bar deviation: {((actualBarDia - nominalDia) * 1000).toFixed(1)} µm
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <label className="text-[11px] text-slate-400 block mb-1">Carbide Bushing ID Setting (Ø mm)</label>
            <input
              type="number"
              step="0.001"
              value={guideBushingId}
              onChange={(e) => setGuideBushingId(parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-amber-300 font-mono-code text-sm outline-none focus:border-cyan-400"
            />
            <div className="text-[10px] text-slate-500 mt-1 font-mono-code">
              Collet sleeve adjustment nut
            </div>
          </div>
        </div>

        {/* Clearance Evaluation Status */}
        <div className={`p-4 rounded-lg border ${
          gbCheck.status === 'optimal'
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
            : gbCheck.status === 'too_tight'
            ? 'bg-red-950/40 border-red-800 text-red-200'
            : 'bg-amber-950/40 border-amber-800 text-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            {gbCheck.status === 'optimal' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : gbCheck.status === 'too_tight' ? (
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display font-bold text-sm tracking-wide">
                  {gbCheck.statusLabel}
                </span>
                <span className="font-mono-code text-xs px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
                  Calculated Clearance: +{(gbCheck.actualClearance * 1000).toFixed(1)} µm (+{gbCheck.actualClearance.toFixed(3)} mm)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {gbCheck.recommendation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Shop-Floor Settings: Pneumatics, Lubrication & Bar Feeder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Pneumatic Collet Clamping */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wind className="w-4 h-4 text-cyan-400" />
              <h4 className="font-display font-semibold text-slate-200 text-xs uppercase tracking-wider">
                Pneumatic Pressure Monitor
              </h4>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Working Pressure:</span>
                <span className={`font-mono-code font-bold ${
                  pneumaticBar >= 5.0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {pneumaticBar.toFixed(1)} bar
                </span>
              </div>

              <input
                type="range"
                min="3.0"
                max="8.0"
                step="0.1"
                value={pneumaticBar}
                onChange={(e) => setPneumaticBar(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
              />

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Factory Intake Min:</span>
                  <strong className="text-slate-200 font-mono-code">&ge; 6.0 bar</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Collet Working Min:</span>
                  <strong className="text-slate-200 font-mono-code">&ge; 5.0 bar</strong>
                </div>
              </div>
            </div>

            {pneumaticBar < 5.0 && (
              <div className="text-xs text-red-400 font-bold bg-red-950/60 p-2 rounded border border-red-800">
                ALARM RISK EX1002: Air pressure insufficient for collet toggle clamping lock.
              </div>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono-code mt-2">
            Prevents workpiece slipping during high axial feed turning.
          </div>
        </div>

        {/* 2. Spindle Block Lubrication (ISO VG 32) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-amber-400" />
              <h4 className="font-display font-semibold text-slate-200 text-xs uppercase tracking-wider">
                Spindle Block & Slideway Lube
              </h4>
            </div>

            <div className="space-y-2 mb-4 text-xs">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="text-slate-400 text-[11px]">Specified Oil Grade:</div>
                <div className="font-bold font-mono-code text-amber-400 text-sm">ISO VG 32 Slideway Oil</div>
                <div className="text-[10px] text-slate-500">Mobil Vactra No. 1 / Shell Tonna S2 M 32</div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={oilCheckShift1}
                    onChange={(e) => setOilCheckShift1(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 accent-amber-500"
                  />
                  <span>Shift 1 Reservoir Sight Glass Checked</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={oilCheckShift2}
                    onChange={(e) => setOilCheckShift2(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 accent-amber-500"
                  />
                  <span>Shift 2 Pressure Gauge Checked (&gt; 1.5 MPa)</span>
                </label>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-mono-code mt-2">
            Avoids EX1001 Low Lube Pressure alarms and ball screw galling.
          </div>
        </div>

        {/* 3. Bar Feeder Integration */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-emerald-400" />
              <h4 className="font-display font-semibold text-slate-200 text-xs uppercase tracking-wider">
                Bar Feeder Integration (LNS / Iemca)
              </h4>
            </div>

            <ul className="text-xs text-slate-300 space-y-2 bg-slate-950 p-3 rounded border border-slate-800 font-mono-code">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400">&bull;</span>
                <span>Bar Ground Tolerance: <strong className="text-slate-100">h8 or h9 required</strong></span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400">&bull;</span>
                <span>Bar Straightness: &le; 0.5 mm/m over 3 meters</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400">&bull;</span>
                <span>Guide Channel Oil: ISO VG 100 hydro-dynamic</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400">&bull;</span>
                <span>Pusher Alignment: Co-axial &plusmn; 0.1 mm</span>
              </li>
            </ul>
          </div>
          <div className="text-[11px] text-slate-500 font-mono-code mt-2">
            Eliminates EX2001 bar feeder interlock and vibration harmonics.
          </div>
        </div>
      </div>
    </div>
  );
};
