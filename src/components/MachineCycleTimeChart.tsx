import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine
} from 'recharts';
import { MACHINES } from '../data/machines';
import { MachineSpec, MaterialSpec, DrawingData } from '../types/cnc';
import { generateFanucGCode } from '../utils/gcodeGenerator';
import { useLanguage } from '../context/LanguageContext';
import { Timer, Zap, AlertTriangle, CheckCircle, ChevronRight, BarChart3 } from 'lucide-react';

interface MachineCycleTimeChartProps {
  drawing: DrawingData;
  selectedMaterial: MaterialSpec;
  currentMachine: MachineSpec;
  onSelectMachine: (machine: MachineSpec) => void;
}

interface MachinePerformanceData {
  id: string;
  name: string;
  shortName: string;
  controller: string;
  type: 'swiss' | 'chucker' | 'standard_lathe';
  cycleTimeSec: number;
  partsPerHour: number;
  maxRpm: number;
  maxBarDia: number;
  isCapacityExceeded: boolean;
  turningMode: string;
  deltaPercent: number; // vs current machine
  machineRef: MachineSpec;
}

export const MachineCycleTimeChart: React.FC<MachineCycleTimeChartProps> = ({
  drawing,
  selectedMaterial,
  currentMachine,
  onSelectMachine,
}) => {
  const { t } = useLanguage();
  const barDia = drawing.workpiece.diameter_or_width_mm;

  // Calculate cycle time for each machine in the database
  const performanceData: MachinePerformanceData[] = useMemo(() => {
    // First calculate current machine time as baseline
    const baselineResult = generateFanucGCode(drawing, currentMachine, selectedMaterial, {
      cannedCycleMode: currentMachine.type === 'swiss' ? 'swiss_single_pass' : 'g71_canned',
      maxSpindleRpmLimit: currentMachine.maxRpmMain
    });
    const baselineTime = Math.max(1, baselineResult.estimatedCycleTimeSec);

    return MACHINES.map((machine) => {
      const isCapacityExceeded = barDia > machine.maxBarDia;
      
      const mode = machine.type === 'swiss' ? 'swiss_single_pass' : 'g71_canned';
      const simResult = generateFanucGCode(drawing, machine, selectedMaterial, {
        cannedCycleMode: mode,
        maxSpindleRpmLimit: machine.maxRpmMain
      });

      // Factor in machine kinematics: higher max RPM allows true CSS on small diameters
      // Tsugami 12k RPM vs Star 10k RPM vs Standard lathe 4.5k RPM
      let cycleTime = simResult.estimatedCycleTimeSec;

      // If bar dia exceeds capacity, still show calculated time but flag it
      const partsPerHour = cycleTime > 0 ? Math.round(3600 / cycleTime) : 0;
      const deltaPercent = Number((((cycleTime - baselineTime) / baselineTime) * 100).toFixed(1));

      // Short readable name for chart axis
      const shortName = machine.name
        .replace('Tsugami ', 'Tsugami ')
        .replace('Star ', 'Star ')
        .replace('Citizen Cincom ', 'Citizen ')
        .replace('Fanuc 0i-TF Standard Lathe (2-Axis)', 'Fanuc Std Lathe');

      return {
        id: machine.id,
        name: machine.name,
        shortName,
        controller: machine.controller,
        type: machine.type,
        cycleTimeSec: cycleTime,
        partsPerHour,
        maxRpm: machine.maxRpmMain,
        maxBarDia: machine.maxBarDia,
        isCapacityExceeded,
        turningMode: mode === 'swiss_single_pass' ? 'Swiss Single-Pass' : 'G71 Multi-Pass Canned',
        deltaPercent,
        machineRef: machine
      };
    }).sort((a, b) => a.cycleTimeSec - b.cycleTimeSec);
  }, [drawing, selectedMaterial, currentMachine, barDia]);

  // Current machine performance object
  const currentPerf = performanceData.find((p) => p.id === currentMachine.id);
  const fastestMachine = performanceData[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="font-display font-semibold text-slate-200 text-sm tracking-wide">
              CYCLE TIME VARIATIONS ACROSS CNC MACHINES
            </h3>
            <span title={t('comparativeBenchmarkTooltip')} className="cursor-help inline-block">
              <p className="text-xs text-slate-400">
                {t('comparativeBenchmark', { partName: drawing.part_name, barDia, length: drawing.workpiece.length_mm, material: selectedMaterial.code })}
              </p>
            </span>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3 text-xs font-mono-code">
          <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 flex items-center gap-2">
            <span className="text-slate-400">ACTIVE:</span>
            <span className="text-amber-400 font-bold">{currentPerf?.cycleTimeSec || 0}s</span>
            <span className="text-slate-500">({currentPerf?.partsPerHour || 0} pcs/hr)</span>
          </div>
          {fastestMachine && fastestMachine.id !== currentMachine.id && (
            <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-300 px-3 py-1.5 rounded flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fastest: <strong>{fastestMachine.shortName}</strong> ({fastestMachine.cycleTimeSec}s)</span>
            </div>
          )}
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="w-full h-[280px] bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={performanceData}
            margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="shortName"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={45}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              unit="s"
              domain={[0, 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as MachinePerformanceData;
                  const isCurrent = data.id === currentMachine.id;

                  return (
                    <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-2xl text-xs font-mono-code space-y-1.5 min-w-[220px]">
                      <div className="font-bold font-sans text-slate-100 flex items-center justify-between border-b border-slate-800 pb-1">
                        <span>{data.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono-code font-bold">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400">
                        Controller: <span className="text-slate-200">{data.controller}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Cycle Time:</span>
                        <span className="text-amber-400 font-bold text-sm">{data.cycleTimeSec}s</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Production Rate:</span>
                        <span className="text-emerald-400 font-bold">{data.partsPerHour} pcs/hour</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Max Spindle:</span>
                        <span className="text-slate-200">{data.maxRpm.toLocaleString()} RPM</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Strategy:</span>
                        <span className="text-cyan-300">{data.turningMode}</span>
                      </div>
                      {data.isCapacityExceeded && (
                        <div className="mt-1 p-1 bg-red-950/80 text-red-300 rounded border border-red-800 text-[10px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                          <span>Part Ø{barDia}mm exceeds max bar Ø{data.maxBarDia}mm</span>
                        </div>
                      )}
                      {!isCurrent && (
                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          {data.deltaPercent > 0 ? (
                            <span className="text-rose-400">+{data.deltaPercent}% slower than active</span>
                          ) : (
                            <span className="text-emerald-400">{data.deltaPercent}% faster than active</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {currentPerf && (
              <ReferenceLine
                y={currentPerf.cycleTimeSec}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Active: ${currentPerf.cycleTimeSec}s`,
                  position: 'top',
                  fill: '#f59e0b',
                  fontSize: 10
                }}
              />
            )}
            <Bar
              dataKey="cycleTimeSec"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(entry: any) => {
                const targetMachine = entry?.machineRef || entry?.payload?.machineRef;
                if (targetMachine) {
                  onSelectMachine(targetMachine);
                }
              }}
            >
              {performanceData.map((entry) => {
                const isSelected = entry.id === currentMachine.id;
                let fillColor = '#0284c7'; // default blue
                if (isSelected) {
                  fillColor = '#f59e0b'; // amber for active
                } else if (entry.isCapacityExceeded) {
                  fillColor = '#dc2626'; // red warning
                } else if (entry.type === 'standard_lathe') {
                  fillColor = '#8b5cf6'; // purple for standard lathe
                } else if (entry.cycleTimeSec === fastestMachine?.cycleTimeSec) {
                  fillColor = '#10b981'; // emerald for fastest
                }
                return (
                  <Cell
                    key={`cell-${entry.id}`}
                    fill={fillColor}
                    stroke={isSelected ? '#fde047' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Quick Switch Machine Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-4 font-mono-code text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 border border-yellow-300"></span>
            <span>Active Machine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span>Fastest Swiss</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-600"></span>
            <span>Swiss Lathe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span>
            <span>Standard Lathe (G71 Canned)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-600"></span>
            <span>Bar Over-Capacity</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-500">
          Tip: Click any bar in the chart to switch active machine instantly
        </span>
      </div>
    </div>
  );
};
