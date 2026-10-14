import React, { useState, useMemo } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { ToolpathCanvas } from './components/ToolpathCanvas';
import { GCodeViewer } from './components/GCodeViewer';
import { ContourBuilder } from './components/ContourBuilder';
import { SafetyAuditView } from './components/SafetyAuditView';
import { FeedsSpeedsView } from './components/FeedsSpeedsView';
import { SwissSetupView } from './components/SwissSetupView';
import { AlarmDiagnosticsView } from './components/AlarmDiagnosticsView';
import { VisionParserView } from './components/VisionParserView';
import { MachineCycleTimeChart } from './components/MachineCycleTimeChart';
import { CameraBlueprintScanner } from './components/CameraBlueprintScanner';
import { ToolLibraryView } from './components/ToolLibraryView';
import { MaterialManagerView } from './components/MaterialManagerView';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

import { MACHINES } from './data/machines';
import { MATERIALS } from './data/materials';
import { PRESET_DRAWINGS } from './data/presetDrawings';
import { MachineSpec, MaterialSpec, DrawingData, ToolpathSegment, CustomTool, ActiveToolAssignments } from './types/cnc';
import { generateFanucGCode, GCodeGeneratorOptions } from './utils/gcodeGenerator';
import { parseFanucGCode } from './utils/gcodeParser';
import { runAutomatedSafetyCheck } from './utils/safetyAuditor';
import { 
  loadToolLibrary, 
  saveToolLibrary, 
  loadActiveToolAssignments, 
  saveActiveToolAssignments 
} from './utils/toolLibraryStorage';
import {
  loadMaterials,
  saveMaterials
} from './utils/materialStorage';
import { Sparkles, Sliders, ShieldCheck, AlertTriangle, ArrowUpRight, Camera, Wrench, SlidersHorizontal, Layers } from 'lucide-react';

function MainApp() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('gcode_studio');
  const [selectedMachine, setSelectedMachine] = useState<MachineSpec>(MACHINES[0]); // Tsugami S206
  
  // Persistent Materials Library
  const [materials, setMaterials] = useState<MaterialSpec[]>(() => loadMaterials());
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialSpec>(() => {
    const loaded = loadMaterials();
    return loaded[0] || MATERIALS[0];
  });
  const [drawing, setDrawing] = useState<DrawingData>(PRESET_DRAWINGS[0]);
  
  // Generator configuration options
  const [generatorOptions, setGeneratorOptions] = useState<Partial<GCodeGeneratorOptions>>({
    programNumber: '0001',
    cannedCycleMode: selectedMachine.type === 'swiss' ? 'swiss_single_pass' : 'g71_canned',
    maxSpindleRpmLimit: 3500,
    useCss: true,
    toolNoseRadius: 0.4,
    roughDoc: 0.5,
    finishAllowanceX: 0.3,
    finishAllowanceZ: 0.05,
    partingFeed: 0.025,
    partingWidth: 1.5
  });

  const [customGCode, setCustomGCode] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<ToolpathSegment | null>(null);
  const [highlightedGCodeLine, setHighlightedGCodeLine] = useState<number | undefined>(undefined);

  // Persistent Custom Tool Library
  const [tools, setTools] = useState<CustomTool[]>(() => loadToolLibrary());
  const [activeAssignments, setActiveAssignments] = useState<ActiveToolAssignments>(() => {
    const loadedTools = loadToolLibrary();
    return loadActiveToolAssignments(loadedTools);
  });

  // Sync canned cycle mode when machine changes
  const handleSelectMachine = (newMachine: MachineSpec) => {
    setSelectedMachine(newMachine);
    setGeneratorOptions((prev) => ({
      ...prev,
      cannedCycleMode: newMachine.type === 'swiss' ? 'swiss_single_pass' : 'g71_canned'
    }));
    setCustomGCode(null);
  };

  const handleSelectMaterial = (newMaterial: MaterialSpec) => {
    setSelectedMaterial(newMaterial);
    setDrawing((prev) => ({
      ...prev,
      material: newMaterial.code
    }));
    setCustomGCode(null);
  };

  // Re-generate G-Code with selected tools from persistent library
  const generatedResult = useMemo(() => {
    return generateFanucGCode(drawing, selectedMachine, selectedMaterial, {
      ...generatorOptions,
      toolLibrary: tools,
      toolAssignments: activeAssignments
    });
  }, [drawing, selectedMachine, selectedMaterial, generatorOptions, tools, activeAssignments]);

  const activeGCode = customGCode || generatedResult.code;

  // Real-time synchronization of segments and operations when G-code is customized or edited
  const parsedCustom = useMemo(() => {
    if (!customGCode) return null;
    return parseFanucGCode(customGCode, drawing.workpiece.diameter_or_width_mm);
  }, [customGCode, drawing.workpiece.diameter_or_width_mm]);

  const activeSegments = parsedCustom ? parsedCustom.segments : generatedResult.segments;
  const activeOperations = parsedCustom ? parsedCustom.operations : undefined;

  // Active finishing tool nose radius from custom library for precision undercutting audit
  const activeFinishTool = tools.find((t) => t.id === activeAssignments.finishOdToolId) || tools[0];
  const activeNoseRadius = activeFinishTool ? activeFinishTool.noseRadius : (generatorOptions.toolNoseRadius || 0.4);

  // Run Safety Check
  const safetyCheck = useMemo(() => {
    return runAutomatedSafetyCheck(
      activeGCode,
      drawing,
      selectedMachine,
      selectedMaterial,
      activeNoseRadius,
      2.0 // 2mm safety margin
    );
  }, [activeGCode, drawing, selectedMachine, selectedMaterial, activeNoseRadius]);

  const handleApplyVisionDrawing = (newDrawing: DrawingData) => {
    setDrawing(newDrawing);
    // Auto-detect material match
    const matchedMat = MATERIALS.find(
      (m) => m.code.toLowerCase() === newDrawing.material.toLowerCase() || m.id.includes(newDrawing.material.toLowerCase())
    );
    if (matchedMat) {
      setSelectedMaterial(matchedMat);
    }
    setCustomGCode(null);
    setActiveTab('gcode_studio');
  };

  // Direct generation from Camera / Photo blueprint scanner
  const handleGenerateCodeFromBlueprint = (scannedDrawing: DrawingData) => {
    setDrawing(scannedDrawing);
    const matchedMat = MATERIALS.find(
      (m) => m.code.toLowerCase() === scannedDrawing.material.toLowerCase() || m.id.includes(scannedDrawing.material.toLowerCase())
    );
    if (matchedMat) {
      setSelectedMaterial(matchedMat);
    }
    setCustomGCode(null);
    setActiveTab('gcode_studio');
  };

  const handleResetToPreset = (presetIndex: number) => {
    const preset = PRESET_DRAWINGS[presetIndex];
    if (preset) {
      setDrawing(preset);
      const matchedMat = MATERIALS.find((m) => m.code === preset.material);
      if (matchedMat) {
        setSelectedMaterial(matchedMat);
      }
      setCustomGCode(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d13] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        currentTab={activeTab}
        onTabChange={setActiveTab}
        selectedMachine={selectedMachine}
        onSelectMachine={handleSelectMachine}
        selectedMaterial={selectedMaterial}
        onSelectMaterial={handleSelectMaterial}
        materials={materials}
        safetyCheck={safetyCheck}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Tab 1: Studio */}
        {activeTab === 'gcode_studio' && (
          <div className="space-y-6">
            {/* Quick Strategy Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-code font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    {t('programNumber')}: O{generatorOptions.programNumber || '0001'}
                  </span>
                  <h2 className="font-display font-bold text-slate-100 text-sm tracking-wide">
                    {drawing.part_name}
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  {t('targetMachine')}: <strong className="text-slate-200">{selectedMachine.name}</strong> ({selectedMachine.controller}) | 
                  {' '}{t('activeMaterial')}:{' '}
                  <button 
                    onClick={() => setActiveTab('material_manager')}
                    className="inline-flex items-center gap-1 text-amber-300 font-bold hover:underline"
                    title="Click to open Material Manager"
                  >
                    <span 
                      className="inline-block w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: selectedMaterial.colorCode || '#3b82f6' }}
                    />
                    <span>{selectedMaterial.code} ({((selectedMaterial.speedMultiplier ?? 1.0) * 100).toFixed(0)}% Vc)</span>
                  </button> | 
                  {' '}{t('cycleMode')}: <strong className="text-cyan-300 capitalize">{generatorOptions.cannedCycleMode === 'swiss_single_pass' ? t('singlePassMode') : t('cannedG71Mode')}</strong> | 
                  {' '}{t('estCycleTime')}: <strong className="text-emerald-400 font-mono-code">{generatedResult.estimatedCycleTimeSec}s</strong>
                </p>
              </div>

              {/* Cycle Controls & Quick Scanner / Material Link */}
              <div className="flex items-center gap-3 text-xs">
                <button
                  onClick={() => setActiveTab('material_manager')}
                  className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded flex items-center gap-1.5 font-semibold transition"
                  title="Open Material Manager"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('tabMaterialManager')}</span>
                </button>

                <button
                  onClick={() => setActiveTab('blueprint_scanner')}
                  className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800 rounded flex items-center gap-1.5 font-semibold transition"
                  title="Сканировать чертёж с камеры или фото"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{t('tabScanner')}</span>
                </button>

                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 text-[11px]">{t('cycleMode')}:</span>
                  <select
                    value={generatorOptions.cannedCycleMode}
                    onChange={(e) => {
                      setGeneratorOptions({
                        ...generatorOptions,
                        cannedCycleMode: e.target.value as any
                      });
                      setCustomGCode(null);
                    }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-xs outline-none focus:border-amber-400"
                  >
                    <option value="swiss_single_pass">{t('singlePassMode')}</option>
                    <option value="g71_canned">{t('cannedG71Mode')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 text-[11px]">{t('g50Clamp')}:</span>
                  <select
                    value={generatorOptions.maxSpindleRpmLimit}
                    onChange={(e) => {
                      setGeneratorOptions({
                        ...generatorOptions,
                        maxSpindleRpmLimit: parseInt(e.target.value, 10)
                      });
                      setCustomGCode(null);
                    }}
                    className="bg-slate-900 border border-slate-700 text-amber-300 font-mono-code font-bold rounded px-1.5 py-0.5 text-xs outline-none focus:border-amber-400"
                  >
                    <option value="2500">S2500 RPM</option>
                    <option value="3500">S3500 RPM</option>
                    <option value="5000">S5000 RPM</option>
                    <option value="8000">S8000 RPM</option>
                    <option value="12000">S12000 RPM (Max)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Active Tooling Quick Assignment Strip */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-amber-400 font-mono-code font-bold">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <span>{t('tabToolLibrary')}:</span>
                </div>

                {/* Roughing Tool */}
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <span className="text-amber-400 font-mono-code text-[11px] font-bold">Rough:</span>
                  <select
                    value={activeAssignments.roughOdToolId}
                    onChange={(e) => {
                      const updated = { ...activeAssignments, roughOdToolId: e.target.value };
                      setActiveAssignments(updated);
                      saveActiveToolAssignments(updated);
                      setCustomGCode(null);
                    }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-xs font-mono-code outline-none focus:border-amber-400"
                  >
                    {tools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.toolNumber} ({t.insertCode} R{t.noseRadius.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Finishing Tool */}
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <span className="text-emerald-400 font-mono-code text-[11px] font-bold">Finish:</span>
                  <select
                    value={activeAssignments.finishOdToolId}
                    onChange={(e) => {
                      const updated = { ...activeAssignments, finishOdToolId: e.target.value };
                      setActiveAssignments(updated);
                      saveActiveToolAssignments(updated);
                      setCustomGCode(null);
                    }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-xs font-mono-code outline-none focus:border-emerald-400"
                  >
                    {tools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.toolNumber} ({t.insertCode} R{t.noseRadius.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cutoff Tool */}
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <span className="text-rose-400 font-mono-code text-[11px] font-bold">Cutoff:</span>
                  <select
                    value={activeAssignments.cutoffToolId}
                    onChange={(e) => {
                      const updated = { ...activeAssignments, cutoffToolId: e.target.value };
                      setActiveAssignments(updated);
                      saveActiveToolAssignments(updated);
                      setCustomGCode(null);
                    }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-xs font-mono-code outline-none focus:border-rose-400"
                  >
                    {tools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.toolNumber} (W{t.insertWidth || 2.0}mm)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('tool_library')}
                className="text-amber-400 hover:text-amber-300 font-mono-code text-[11px] flex items-center gap-1 hover:underline font-bold"
              >
                <span>{t('tabToolLibrary')} →</span>
              </button>
            </div>

            {/* Split Grid: Simulator Canvas + G-Code Viewer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: 2D Toolpath Simulator (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <ToolpathCanvas
                  drawing={drawing}
                  segments={activeSegments}
                  stickout={drawing.workpiece.stickout_mm || (drawing.workpiece.length_mm + 5)}
                  highlightedLine={highlightedGCodeLine}
                  onActiveStepChange={(segment) => setActiveSegment(segment)}
                  operations={activeOperations}
                />

                {/* Contour Points Builder & Workpiece Dimensions */}
                <ContourBuilder
                  drawing={drawing}
                  onChange={(updated) => {
                    setDrawing(updated);
                    setCustomGCode(null);
                  }}
                  onResetToPreset={handleResetToPreset}
                />
              </div>

              {/* Right Column: G-Code Program Viewer (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <GCodeViewer
                  code={activeGCode}
                  partName={drawing.part_name}
                  safetyCheck={safetyCheck}
                  onCodeChange={(newCode) => setCustomGCode(newCode)}
                  activeLineIndex={activeSegment?.gcodeLineIndex}
                  activeCodeLine={activeSegment?.codeLine}
                  onSelectLine={(idx) => setHighlightedGCodeLine(idx)}
                />

                {/* Compact Safety Summary Callout */}
                <div className={`p-4 rounded-lg border text-xs flex items-start gap-3 ${
                  safetyCheck.overallPassed
                    ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                    : 'bg-red-950/40 border-red-800 text-red-200'
                }`}>
                  {safetyCheck.overallPassed ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-200">
                        {safetyCheck.overallPassed ? t('safetyVerified') : t('safetyError')}
                      </span>
                      <button
                        onClick={() => setActiveTab('safety_audit')}
                        className="text-amber-400 hover:text-amber-300 font-mono-code flex items-center gap-0.5 text-[11px]"
                      >
                        {t('tabSafety')} <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      G50: S{safetyCheck.g50Check.clampRpm} RPM | L/D: {safetyCheck.slendernessRatio.ldRatio} | Z_limit: Z{safetyCheck.colletInterference.zLimit.toFixed(2)} mm
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recharts Machine Cycle Time Variations Benchmark */}
            <MachineCycleTimeChart
              drawing={drawing}
              selectedMaterial={selectedMaterial}
              currentMachine={selectedMachine}
              onSelectMachine={handleSelectMachine}
            />
          </div>
        )}

        {/* Tab 2: Blueprint Scanner (Camera & Photo) */}
        {activeTab === 'blueprint_scanner' && (
          <CameraBlueprintScanner
            onGenerateGCode={handleGenerateCodeFromBlueprint}
          />
        )}

        {/* Tab 3: Custom Tool Library (Persistent Storage) */}
        {activeTab === 'tool_library' && (
          <ToolLibraryView
            tools={tools}
            onToolsChange={(updated) => {
              setTools(updated);
              saveToolLibrary(updated);
              setCustomGCode(null);
            }}
            activeAssignments={activeAssignments}
            onAssignmentsChange={(updated) => {
              setActiveAssignments(updated);
              saveActiveToolAssignments(updated);
              setCustomGCode(null);
            }}
            onSwitchToStudio={() => setActiveTab('gcode_studio')}
          />
        )}

        {/* Tab 4: Material Manager (Persistent Storage) */}
        {activeTab === 'material_manager' && (
          <MaterialManagerView
            materials={materials}
            onMaterialsChange={(updated) => {
              setMaterials(updated);
              saveMaterials(updated);
              // If active material was modified, update selectedMaterial
              const current = updated.find(m => m.id === selectedMaterial.id);
              if (current) {
                setSelectedMaterial(current);
              } else if (updated.length > 0) {
                handleSelectMaterial(updated[0]);
              }
            }}
            activeMaterial={selectedMaterial}
            onSelectActiveMaterial={(mat) => handleSelectMaterial(mat)}
          />
        )}

        {/* Tab 5: Safety Audit */}
        {activeTab === 'safety_audit' && (
          <SafetyAuditView
            safetyCheck={safetyCheck}
            machine={selectedMachine}
          />
        )}

        {/* Tab 6: Feeds & Speeds */}
        {activeTab === 'feeds_speeds' && (
          <FeedsSpeedsView
            currentMaterial={selectedMaterial}
            onSelectMaterial={handleSelectMaterial}
            barDia={drawing.workpiece.diameter_or_width_mm}
            materials={materials}
          />
        )}

        {/* Tab 5: Swiss Setup */}
        {activeTab === 'swiss_setup' && (
          <SwissSetupView
            machine={selectedMachine}
            barDia={drawing.workpiece.diameter_or_width_mm}
          />
        )}

        {/* Tab 6: Fanuc Alarms */}
        {activeTab === 'alarms' && (
          <AlarmDiagnosticsView />
        )}

        {/* Tab 7: Vision & JSON Parser */}
        {activeTab === 'vision_parser' && (
          <VisionParserView
            onApplyDrawing={handleApplyVisionDrawing}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-3 text-xs text-slate-500 font-mono-code">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap justify-between items-center gap-2">
          <span>CNC GCode Engineering Suite &copy; Fanuc 0i-TD / 16i / 30i / 31i-B</span>
          <span>Tsugami S-Series &bull; Star SR/SB/SW &bull; Citizen Cincom L-Series</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}
