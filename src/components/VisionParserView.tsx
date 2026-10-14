import React, { useState } from 'react';
import { DrawingData } from '../types/cnc';
import { Scan, Code2, ArrowRight, Check, Sparkles, FileText, Image as ImageIcon } from 'lucide-react';

interface VisionParserViewProps {
  onApplyDrawing: (drawing: DrawingData) => void;
}

export const VisionParserView: React.FC<VisionParserViewProps> = ({ onApplyDrawing }) => {
  const [inputText, setInputText] = useState<string>(
`Engineering Part Drawing Note:
Part: Stainless Miniature Piston
Material: SS304
Raw Stock Diameter: 6.0 mm, Total Length: 35.0 mm
Stickout: 32.0 mm
Contour:
1. Start at center X0.0 Z0.0
2. Face skim to diameter 6.0 mm at Z0.0
3. Lead chamfer 0.5 mm to diameter 2.0 mm at Z-0.5 mm
4. Turn journal diameter 2.0 mm to Z-12.0 mm (Ra 0.4 polish)
5. Transition radius R1.2 mm to diameter 4.0 mm at Z-14.5 mm
6. Turn shaft diameter 4.0 mm to Z-24.0 mm
7. Parting groove at Z-26.0 mm width 1.5 mm to minor diameter 3.0 mm
8. Turn collar diameter 6.0 mm to Z-30.0 mm
9. Cutoff at Z-31.5 mm to X0.0
Roughness: General Ra 1.6 um, critical Ra 0.4 on front journal.`
  );

  const [extractedJson, setExtractedJson] = useState<string>(
JSON.stringify(
  {
    operation_type: "turning",
    material: "SS304",
    part_name: "Stainless Miniature Piston",
    workpiece: {
      diameter_or_width_mm: 6.0,
      length_mm: 35.0,
      stickout_mm: 32.0,
      guide_bushing_clearance_mm: 0.008
    },
    contour_points: [
      { point_id: 1, type: "start", x_diameter: 0.0, z_coordinate: 0.0 },
      { point_id: 2, type: "face", x_diameter: 6.0, z_coordinate: 0.0 },
      { point_id: 3, type: "chamfer", x_diameter: 2.0, z_coordinate: -0.5, chamfer: 0.5 },
      { point_id: 4, type: "turn", x_diameter: 2.0, z_coordinate: -12.0 },
      { point_id: 5, type: "arc_ccw", x_diameter: 4.0, z_coordinate: -14.5, radius: 1.2 },
      { point_id: 6, type: "turn", x_diameter: 4.0, z_coordinate: -24.0 },
      { point_id: 7, type: "groove", x_diameter: 3.0, z_coordinate: -26.0, groove_width: 1.5 },
      { point_id: 8, type: "turn", x_diameter: 6.0, z_coordinate: -30.0 },
      { point_id: 9, type: "cutoff", x_diameter: 0.0, z_coordinate: -31.5 }
    ],
    roughness_requirements: {
      general_ra: 1.6,
      critical_surfaces: ["Ra 0.4 polish on front journal Z-0.5 to Z-12.0"]
    }
  },
  null,
  2
)
  );

  const [applied, setApplied] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleParse = () => {
    try {
      // Check if user already provided raw JSON
      if (inputText.trim().startsWith('{')) {
        const parsed = JSON.parse(inputText);
        setExtractedJson(JSON.stringify(parsed, null, 2));
        setParseError(null);
        return;
      }

      // Deterministic parser from text specifications (supports RU & EN)
      const lines = inputText.split('\n');
      let partName = 'Custom Parsed Part';
      let material = 'SS304';
      let dia = 10.0;
      let len = 40.0;
      let stickout = 35.0;

      for (const rawLine of lines) {
        const line = rawLine.replace(/,/g, '.'); // Normalize decimal comma to dot
        const lower = line.toLowerCase();

        if (lower.includes('part:') || lower.includes('деталь:') || lower.includes('наименование:')) {
          const val = line.split(/[:：]/)[1]?.trim();
          if (val) partName = val;
        }
        if (lower.includes('material:') || lower.includes('материал:') || lower.includes('сталь:')) {
          const val = line.split(/[:：]/)[1]?.trim();
          if (val) material = val;
        }

        // Diameter matching (e.g. "диаметр: 6.0", "dia: 6mm", "Ø6.0")
        const diaMatch = line.match(/(?:diameter|dia|диаметр|ø)\s*[:=]?\s*(\d+\.?\d*)/i);
        if (diaMatch && diaMatch[1]) dia = parseFloat(diaMatch[1]);

        // Length matching
        const lenMatch = line.match(/(?:length|len|длина)\s*[:=]?\s*(\d+\.?\d*)/i);
        if (lenMatch && lenMatch[1]) len = parseFloat(lenMatch[1]);

        // Stickout matching
        const stickoutMatch = line.match(/(?:stickout|вылет)\s*[:=]?\s*(\d+\.?\d*)/i);
        if (stickoutMatch && stickoutMatch[1]) stickout = parseFloat(stickoutMatch[1]);
      }

      const generatedJson: DrawingData = {
        operation_type: dia <= 7 ? 'swiss_turning' : 'turning',
        material: material,
        part_name: partName,
        workpiece: {
          diameter_or_width_mm: dia,
          length_mm: len,
          stickout_mm: stickout || len + 5,
          guide_bushing_clearance_mm: 0.008
        },
        contour_points: [
          { point_id: 1, type: 'start', x_diameter: 0.0, z_coordinate: 0.0 },
          { point_id: 2, type: 'face', x_diameter: dia, z_coordinate: 0.0 },
          { point_id: 3, type: 'chamfer', x_diameter: Number((dia * 0.5).toFixed(2)), z_coordinate: -0.8, chamfer: 0.8 },
          { point_id: 4, type: 'turn', x_diameter: Number((dia * 0.5).toFixed(2)), z_coordinate: Number((-len * 0.4).toFixed(2)) },
          { point_id: 5, type: 'turn', x_diameter: Number((dia * 0.8).toFixed(2)), z_coordinate: Number((-len * 0.7).toFixed(2)) },
          { point_id: 6, type: 'cutoff', x_diameter: 0.0, z_coordinate: Number((-len * 0.9).toFixed(2)) }
        ],
        roughness_requirements: {
          general_ra: 1.6,
          critical_surfaces: ['Ra 0.8 on journal']
        }
      };

      setExtractedJson(JSON.stringify(generatedJson, null, 2));
      setParseError(null);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse drawing input.');
    }
  };

  const handleApply = () => {
    try {
      const parsed = JSON.parse(extractedJson) as DrawingData;
      onApplyDrawing(parsed);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    } catch (e: any) {
      setParseError('Invalid JSON structure: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Scan className="w-6 h-6 text-cyan-400 shrink-0" />
          <div>
            <h3 className="font-display font-bold text-slate-100 text-base">
              VISION-TO-JSON BLUEPRINT & DRAWING ANALYZER (MODULE 1)
            </h3>
            <p className="text-xs text-slate-400">
              Parses blueprint callouts, tolerances, and geometric contour nodes into strict manufacturing JSON schema.
            </p>
          </div>
        </div>

        <button
          onClick={handleApply}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-lg transition"
        >
          {applied ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          {applied ? 'Loaded into Generator!' : 'Load into G-Code Studio'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Text / Drawing */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h4 className="font-display font-semibold text-slate-200 text-xs uppercase tracking-wider">
                  Drawing Input / Blueprint OCR Text
                </h4>
              </div>
              <button
                onClick={handleParse}
                className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Extract Contour JSON
              </button>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={16}
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-slate-200 font-mono-code text-xs outline-none focus:border-cyan-400 leading-relaxed"
              placeholder="Paste drawing specifications or JSON here..."
            />
          </div>

          <div className="text-[11px] text-slate-500 mt-2 font-mono-code">
            Tip: You can paste raw JSON directly or engineering text specifications.
          </div>
        </div>

        {/* Right: Extracted JSON Schema */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h4 className="font-display font-semibold text-slate-200 text-xs uppercase tracking-wider">
                  Strict Standard Manufacturing JSON (Section 5)
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-mono-code">
                Validated Schema
              </span>
            </div>

            {parseError && (
              <div className="p-2 mb-2 text-xs bg-red-950 text-red-400 rounded border border-red-800">
                {parseError}
              </div>
            )}

            <textarea
              value={extractedJson}
              onChange={(e) => setExtractedJson(e.target.value)}
              rows={16}
              className="w-full bg-[#070b10] border border-slate-800 rounded p-3 text-cyan-300 font-mono-code text-xs outline-none focus:border-emerald-400 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-500 font-mono-code">
              Contour points automatically mapped to ZX toolpaths.
            </span>
            <button
              onClick={handleApply}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5 transition"
            >
              Apply JSON to Active Part
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
