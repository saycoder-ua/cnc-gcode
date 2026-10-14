import React, { useState } from 'react';
import { DrawingData, ContourPoint, ContourPointType } from '../types/cnc';
import { PRESET_DRAWINGS } from '../data/presetDrawings';
import { Plus, Trash2, Sliders, Box, Layers, RefreshCw } from 'lucide-react';

interface ContourBuilderProps {
  drawing: DrawingData;
  onChange: (updated: DrawingData) => void;
  onResetToPreset?: (presetIndex: number) => void;
}

export const ContourBuilder: React.FC<ContourBuilderProps> = ({
  drawing,
  onChange,
  onResetToPreset
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number>(0);

  const handleWorkpieceChange = (field: keyof DrawingData['workpiece'], value: number) => {
    onChange({
      ...drawing,
      workpiece: {
        ...drawing.workpiece,
        [field]: value
      }
    });
  };

  const handlePointChange = (index: number, field: keyof ContourPoint, value: any) => {
    const updatedPoints = [...drawing.contour_points];
    updatedPoints[index] = {
      ...updatedPoints[index],
      [field]: value
    };
    onChange({
      ...drawing,
      contour_points: updatedPoints
    });
  };

  const handleAddPoint = () => {
    const points = drawing.contour_points;
    const lastPoint = points[points.length - 1] || { x_diameter: drawing.workpiece.diameter_or_width_mm, z_coordinate: 0.0 };
    const newPoint: ContourPoint = {
      point_id: points.length + 1,
      type: 'turn',
      x_diameter: lastPoint.x_diameter,
      z_coordinate: Number((lastPoint.z_coordinate - 5.0).toFixed(2))
    };
    onChange({
      ...drawing,
      contour_points: [...points, newPoint]
    });
  };

  const handleRemovePoint = (index: number) => {
    if (drawing.contour_points.length <= 2) return; // Keep minimum
    const filtered = drawing.contour_points.filter((_, i) => i !== index);
    onChange({
      ...drawing,
      contour_points: filtered.map((pt, idx) => ({ ...pt, point_id: idx + 1 }))
    });
  };

  const pointTypes: { value: ContourPointType; label: string }[] = [
    { value: 'start', label: 'Start (X0 Z0)' },
    { value: 'face', label: 'Face Cut' },
    { value: 'turn', label: 'OD Turning' },
    { value: 'taper', label: 'Taper Turn' },
    { value: 'arc_cw', label: 'Arc CW (G02)' },
    { value: 'arc_ccw', label: 'Arc CCW (G03)' },
    { value: 'thread', label: 'Thread (G76)' },
    { value: 'groove', label: 'Groove (G75)' },
    { value: 'cutoff', label: 'Cut-off / Parting' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-6 shadow-xl">
      {/* Preset Blueprints Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-display font-semibold text-slate-200 text-sm">
            ENGINEERING BLUEPRINT PRESETS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPreset}
            onChange={(e) => {
              const idx = parseInt(e.target.value, 10);
              setSelectedPreset(idx);
              if (onResetToPreset) onResetToPreset(idx);
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded outline-none focus:border-cyan-400"
          >
            {PRESET_DRAWINGS.map((p, idx) => (
              <option key={idx} value={idx}>
                {p.part_name} ({p.material} - Ø{p.workpiece.diameter_or_width_mm}mm)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Workpiece & Machine Setup Dimensions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Box className="w-4 h-4 text-amber-400" />
          <h4 className="font-display font-semibold text-xs text-slate-300 uppercase tracking-wider">
            Raw Bar Stock & Setup Geometry
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <label className="text-[11px] text-slate-400 block mb-1">Bar Diameter (Ø mm)</label>
            <input
              type="number"
              step="0.1"
              min="1"
              value={drawing.workpiece.diameter_or_width_mm}
              onChange={(e) => handleWorkpieceChange('diameter_or_width_mm', parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono-code focus:border-cyan-400 outline-none"
            />
          </div>

          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <label className="text-[11px] text-slate-400 block mb-1">Total Part Length (mm)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={drawing.workpiece.length_mm}
              onChange={(e) => handleWorkpieceChange('length_mm', parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono-code focus:border-cyan-400 outline-none"
            />
          </div>

          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <label className="text-[11px] text-slate-400 block mb-1">Collet Stickout (mm)</label>
            <input
              type="number"
              step="0.5"
              min="2"
              value={drawing.workpiece.stickout_mm || (drawing.workpiece.length_mm + 5)}
              onChange={(e) => handleWorkpieceChange('stickout_mm', parseFloat(e.target.value) || 5)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono-code focus:border-cyan-400 outline-none"
            />
          </div>

          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <label className="text-[11px] text-slate-400 block mb-1">Guide Bushing Gap (mm)</label>
            <input
              type="number"
              step="0.001"
              min="0.002"
              value={drawing.workpiece.guide_bushing_clearance_mm || 0.008}
              onChange={(e) => handleWorkpieceChange('guide_bushing_clearance_mm', parseFloat(e.target.value) || 0.008)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono-code focus:border-cyan-400 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Contour Points Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h4 className="font-display font-semibold text-xs text-slate-300 uppercase tracking-wider">
              Contour Geometry Points ({drawing.contour_points.length} nodes)
            </h4>
          </div>
          <button
            onClick={handleAddPoint}
            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs flex items-center gap-1 font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Point
          </button>
        </div>

        <div className="overflow-x-auto max-h-[300px] border border-slate-800 rounded bg-slate-950">
          <table className="w-full text-left text-xs font-mono-code">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Operation / Type</th>
                <th className="py-2 px-3">X Dia (mm)</th>
                <th className="py-2 px-3">Z Coord (mm)</th>
                <th className="py-2 px-3">Params (R / Pitch)</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {drawing.contour_points.map((pt, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50">
                  <td className="py-2 px-3 text-slate-500">{pt.point_id}</td>
                  <td className="py-2 px-3">
                    <select
                      value={pt.type}
                      onChange={(e) => handlePointChange(idx, 'type', e.target.value as ContourPointType)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-xs outline-none focus:border-cyan-400"
                    >
                      {pointTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.05"
                      value={pt.x_diameter}
                      onChange={(e) => handlePointChange(idx, 'x_diameter', parseFloat(e.target.value) || 0)}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 outline-none focus:border-cyan-400"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.1"
                      value={pt.z_coordinate}
                      onChange={(e) => handlePointChange(idx, 'z_coordinate', parseFloat(e.target.value) || 0)}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-emerald-300 outline-none focus:border-cyan-400"
                    />
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {pt.type === 'thread' ? (
                      <div className="flex items-center gap-1">
                        <span>P:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={pt.thread_pitch || 1.0}
                          onChange={(e) => handlePointChange(idx, 'thread_pitch', parseFloat(e.target.value) || 1.0)}
                          className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-amber-300"
                        />
                      </div>
                    ) : (pt.type === 'arc_cw' || pt.type === 'arc_ccw') ? (
                      <div className="flex items-center gap-1">
                        <span>R:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={pt.radius || 1.0}
                          onChange={(e) => handlePointChange(idx, 'radius', parseFloat(e.target.value) || 1.0)}
                          className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-purple-300"
                        />
                      </div>
                    ) : pt.type === 'groove' ? (
                      <div className="flex items-center gap-1">
                        <span>W:</span>
                        <input
                          type="number"
                          step="0.1"
                          value={pt.groove_width || 1.5}
                          onChange={(e) => handlePointChange(idx, 'groove_width', parseFloat(e.target.value) || 1.5)}
                          className="w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-amber-300"
                        />
                      </div>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => handleRemovePoint(idx)}
                      disabled={drawing.contour_points.length <= 2}
                      className="text-slate-500 hover:text-red-400 disabled:opacity-30 p-1"
                      title="Delete Node"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
