import React, { useState } from 'react';
import { 
  CustomTool, 
  ActiveToolAssignments, 
  ToolType, 
  InsertShape 
} from '../types/cnc';
import { 
  saveToolLibrary, 
  saveActiveToolAssignments, 
  exportToolsToJson, 
  importToolsFromJson, 
  DEFAULT_PRESET_TOOLS,
  DEFAULT_ACTIVE_ASSIGNMENTS
} from '../utils/toolLibraryStorage';
import { useLanguage } from '../context/LanguageContext';
import { 
  Wrench, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  ShieldAlert, 
  Info, 
  Layers, 
  Compass, 
  Sliders, 
  X,
  Search,
  ExternalLink
} from 'lucide-react';

interface ToolLibraryViewProps {
  tools: CustomTool[];
  onToolsChange: (newTools: CustomTool[]) => void;
  activeAssignments: ActiveToolAssignments;
  onAssignmentsChange: (newAssignments: ActiveToolAssignments) => void;
  onSwitchToStudio?: () => void;
}

const TOOL_TYPE_LABELS: Record<ToolType, { ru: string; en: string; color: string }> = {
  rough_od: { ru: 'Черновое точение OD / Торец', en: 'Rough OD / Facing', color: 'bg-amber-950/80 border-amber-600 text-amber-300' },
  finish_od: { ru: 'Чистовое точение OD (35°/55°)', en: 'Finish OD (35°/55°)', color: 'bg-emerald-950/80 border-emerald-600 text-emerald-300' },
  thread: { ru: 'Резьбонарезной 60° (G76)', en: 'Threading 60° (G76)', color: 'bg-indigo-950/80 border-indigo-600 text-indigo-300' },
  groove: { ru: 'Канавочный резец (G75)', en: 'Grooving Tool (G75)', color: 'bg-cyan-950/80 border-cyan-600 text-cyan-300' },
  part_off: { ru: 'Отрезной резец / Отсечка', en: 'Cutoff / Parting Blade', color: 'bg-rose-950/80 border-rose-600 text-rose-300' },
  drill: { ru: 'Сверло спиральное / микро', en: 'Twist / Micro Drill', color: 'bg-purple-950/80 border-purple-600 text-purple-300' },
  center_drill: { ru: 'Центровочное сверло', en: 'Center Drill', color: 'bg-violet-950/80 border-violet-600 text-violet-300' },
  boring: { ru: 'Расточной резец (ID)', en: 'Internal Boring Bar (ID)', color: 'bg-yellow-950/80 border-yellow-600 text-yellow-300' },
  facing: { ru: 'Торцовочный резец', en: 'Facing Tool', color: 'bg-orange-950/80 border-orange-600 text-orange-300' }
};

const INSERT_SHAPES: { value: InsertShape; label: string }[] = [
  { value: 'W_80_trigon', label: 'W (Тригон 80° - WNMG)' },
  { value: 'C_80_diamond', label: 'C (Ромб 80° - CNMG / CCMT)' },
  { value: 'D_55_diamond', label: 'D (Ромб 55° - DNMG / DCMT)' },
  { value: 'V_35_diamond', label: 'V (Ромб 35° - VNMG / VBMT)' },
  { value: 'T_60_triangle', label: 'T (Треугольник 60° - TNMG / 16ER)' },
  { value: 'groove_partoff', label: 'Отрезная/канавочная пластина' },
  { value: 'drill_point', label: 'Сверло / перо' },
  { value: 'R_round', label: 'R (Круглая пластина)' }
];

export const ToolLibraryView: React.FC<ToolLibraryViewProps> = ({
  tools,
  onToolsChange,
  activeAssignments,
  onAssignmentsChange,
  onSwitchToStudio
}) => {
  const { language } = useLanguage();
  const isRu = language === 'ru';

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingTool, setEditingTool] = useState<CustomTool | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showTipOrientationGuide, setShowTipOrientationGuide] = useState<boolean>(false);

  // Form state for Add/Edit Modal
  const [formState, setFormState] = useState<Partial<CustomTool>>({
    toolNumber: 'T0808',
    station: 8,
    offsetNumber: 8,
    name: 'New Custom Lathe Tool',
    type: 'rough_od',
    hand: 'right',
    insertCode: 'WNMG 080404',
    insertShape: 'W_80_trigon',
    noseRadius: 0.40,
    insertWidth: undefined,
    includedAngle: 80,
    leadAngle: 95,
    maxDoc: 1.00,
    shankSize: '12x12 mm (Swiss)',
    coatingGrade: 'TiAlN PVD',
    xOffset: 0.000,
    zOffset: 0.000,
    tipOrientation: 3,
    wearX: 0.000,
    wearZ: 0.000,
    wearRadius: 0.000,
    useCustomCuttingData: false,
    customVc: undefined,
    customFeed: undefined,
    notes: ''
  });

  // Filter tools
  const filteredTools = tools.filter(tool => {
    const matchesType = selectedTypeFilter === 'all' || tool.type === selectedTypeFilter;
    const matchesSearch = searchQuery === '' || 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.toolNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.insertCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Open modal for new tool
  const handleAddNewTool = () => {
    const nextStation = Math.max(1, ...tools.map(t => t.station)) + 1;
    const padded = nextStation < 10 ? `0${nextStation}` : `${nextStation}`;
    setFormState({
      toolNumber: `T${padded}${padded}`,
      station: nextStation,
      offsetNumber: nextStation,
      name: `Custom Tool T${padded}`,
      type: 'rough_od',
      hand: 'right',
      insertCode: 'CCMT 060204',
      insertShape: 'C_80_diamond',
      noseRadius: 0.40,
      includedAngle: 80,
      leadAngle: 95,
      maxDoc: 1.00,
      shankSize: '12x12 mm (Swiss)',
      coatingGrade: 'TiAlN PVD',
      xOffset: 0.000,
      zOffset: 0.000,
      tipOrientation: 3,
      wearX: 0.000,
      wearZ: 0.000,
      wearRadius: 0.000,
      notes: ''
    });
    setEditingTool(null);
    setIsNewModalOpen(true);
  };

  // Open modal for editing
  const handleEditTool = (tool: CustomTool) => {
    setEditingTool(tool);
    setFormState({ ...tool });
    setIsNewModalOpen(true);
  };

  // Duplicate a tool
  const handleDuplicateTool = (tool: CustomTool) => {
    const nextStation = Math.max(1, ...tools.map(t => t.station)) + 1;
    const padded = nextStation < 10 ? `0${nextStation}` : `${nextStation}`;
    const duplicated: CustomTool = {
      ...tool,
      id: `tool-${Date.now()}`,
      toolNumber: `T${padded}${padded}`,
      station: nextStation,
      offsetNumber: nextStation,
      name: `${tool.name} (Copy)`,
      isPreset: false
    };
    const updated = [...tools, duplicated];
    onToolsChange(updated);
    saveToolLibrary(updated);
  };

  // Delete tool
  const handleDeleteTool = (toolId: string) => {
    if (tools.length <= 1) {
      alert(isRu ? 'Нельзя удалить последний инструмент в библиотеке!' : 'Cannot delete the last tool in the library!');
      return;
    }
    const updated = tools.filter(t => t.id !== toolId);
    onToolsChange(updated);
    saveToolLibrary(updated);

    // If deleted tool was actively assigned, reassign fallback
    const fallbackId = updated[0].id;
    const updatedAssignments = { ...activeAssignments };
    if (updatedAssignments.roughOdToolId === toolId) updatedAssignments.roughOdToolId = fallbackId;
    if (updatedAssignments.finishOdToolId === toolId) updatedAssignments.finishOdToolId = fallbackId;
    if (updatedAssignments.threadToolId === toolId) updatedAssignments.threadToolId = fallbackId;
    if (updatedAssignments.grooveToolId === toolId) updatedAssignments.grooveToolId = fallbackId;
    if (updatedAssignments.cutoffToolId === toolId) updatedAssignments.cutoffToolId = fallbackId;
    onAssignmentsChange(updatedAssignments);
    saveActiveToolAssignments(updatedAssignments);
  };

  // Save Modal Form
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.toolNumber || !formState.name) return;

    if (editingTool) {
      // Update existing
      const updatedTools = tools.map(t => 
        t.id === editingTool.id 
          ? ({ ...t, ...formState } as CustomTool)
          : t
      );
      onToolsChange(updatedTools);
      saveToolLibrary(updatedTools);
    } else {
      // Create new
      const newTool: CustomTool = {
        id: `custom-tool-${Date.now()}`,
        toolNumber: formState.toolNumber || 'T0808',
        station: Number(formState.station) || 8,
        offsetNumber: Number(formState.offsetNumber) || 8,
        name: formState.name || 'Custom Tool',
        type: formState.type || 'rough_od',
        hand: formState.hand || 'right',
        insertCode: formState.insertCode || 'WNMG 080404',
        insertShape: formState.insertShape || 'W_80_trigon',
        noseRadius: Number(formState.noseRadius) || 0.40,
        insertWidth: formState.insertWidth !== undefined ? Number(formState.insertWidth) : undefined,
        includedAngle: formState.includedAngle !== undefined ? Number(formState.includedAngle) : 80,
        leadAngle: formState.leadAngle !== undefined ? Number(formState.leadAngle) : 95,
        maxDoc: Number(formState.maxDoc) || 1.00,
        shankSize: formState.shankSize || '12x12 mm',
        coatingGrade: formState.coatingGrade || 'TiAlN PVD',
        xOffset: Number(formState.xOffset) || 0.000,
        zOffset: Number(formState.zOffset) || 0.000,
        tipOrientation: Number(formState.tipOrientation) || 3,
        wearX: Number(formState.wearX) || 0.000,
        wearZ: Number(formState.wearZ) || 0.000,
        wearRadius: Number(formState.wearRadius) || 0.000,
        useCustomCuttingData: formState.useCustomCuttingData,
        customVc: formState.customVc ? Number(formState.customVc) : undefined,
        customFeed: formState.customFeed ? Number(formState.customFeed) : undefined,
        notes: formState.notes || '',
        isPreset: false
      };
      const updatedTools = [...tools, newTool];
      onToolsChange(updatedTools);
      saveToolLibrary(updatedTools);
    }

    setIsNewModalOpen(false);
    setEditingTool(null);
  };

  // Reset to factory defaults
  const handleResetDefaults = () => {
    if (window.confirm(isRu ? 'Сбросить библиотеку инструмента к заводским настройкам Fanuc / Tsugami?' : 'Reset tool library to factory Fanuc / Tsugami defaults?')) {
      onToolsChange(DEFAULT_PRESET_TOOLS);
      saveToolLibrary(DEFAULT_PRESET_TOOLS);
      onAssignmentsChange(DEFAULT_ACTIVE_ASSIGNMENTS);
      saveActiveToolAssignments(DEFAULT_ACTIVE_ASSIGNMENTS);
    }
  };

  // Export JSON file
  const handleExportJson = () => {
    const jsonStr = exportToolsToJson(tools);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fanuc_tool_library_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importToolsFromJson(content);
      if (result.success && result.tools) {
        onToolsChange(result.tools);
        saveToolLibrary(result.tools);
        setImportStatus(isRu ? `Успешно загружено ${result.tools.length} инструментов!` : `Successfully loaded ${result.tools.length} tools!`);
        setTimeout(() => setImportStatus(null), 4000);
      } else {
        alert(isRu ? `Ошибка импорта: ${result.error}` : `Import error: ${result.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Quick set active role
  const handleSetActiveRole = (role: keyof ActiveToolAssignments, toolId: string) => {
    const updated = { ...activeAssignments, [role]: toolId };
    onAssignmentsChange(updated);
    saveActiveToolAssignments(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Wrench className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-display font-bold text-slate-100 tracking-wide">
              {isRu ? 'БИБЛИОТЕКА ИНСТРУМЕНТА FANUC' : 'FANUC CUSTOM TOOL LIBRARY'}
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono-code font-bold">
              {tools.length} {isRu ? 'ИНСТРУМЕНТОВ' : 'TOOLS'}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            {isRu 
              ? 'Настройка геометрии резцов (радиус при вершине r_eps, тип пластины WNMG/VBMT/CCMT, ширина отрезки), корректоров геометрии X/Z, износа и кодов квадрантов Tip Orientation (1..9) для Fanuc G-кода.'
              : 'Define turning tool offsets, insert radii (r_eps), shank geometry, wear registers, and Fanuc imaginary tool tip orientation quadrants (1..9) for seamless G-Code integration.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleAddNewTool}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded flex items-center gap-1.5 shadow transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isRu ? 'Добавить инструмент' : 'Add New Tool'}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center gap-1.5 transition"
            title={isRu ? 'Экспорт библиотеки в JSON файл' : 'Export library to JSON file'}
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isRu ? 'Экспорт JSON' : 'Export JSON'}</span>
          </button>

          <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center gap-1.5 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isRu ? 'Импорт JSON' : 'Import JSON'}</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded flex items-center gap-1.5 transition"
            title={isRu ? 'Сброс к заводским инструментам' : 'Reset to default tooling'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isRu ? 'Сброс' : 'Reset'}</span>
          </button>

          {onSwitchToStudio && (
            <button
              onClick={onSwitchToStudio}
              className="px-3 py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded flex items-center gap-1.5 font-semibold transition"
            >
              <span>{isRu ? 'В симулятор G-кода' : 'To G-Code Studio'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {importStatus && (
        <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-200 px-4 py-2.5 rounded text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* ACTIVE G-CODE TOOL ASSIGNMENTS PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-mono-code font-bold text-slate-200 uppercase tracking-wider">
              {isRu ? 'АКТИВНЫЕ ИНСТРУМЕНТЫ ДЛЯ ГЕНЕРАЦИИ G-КОДА' : 'ACTIVE TOOLS APPLIED TO G-CODE GENERATOR'}
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            {isRu ? 'Выбранные резцы автоматически подставляются в шапку программы, циклы G71/G70, G76, канавки и отрезку' : 'Selected tools are automatically passed to program header, G71/G70, G76, and parting cycles'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* 1. Rough OD & Face */}
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
            <span className="text-[10px] text-amber-400 font-mono-code font-bold uppercase block">
              1. {isRu ? 'Черновое точение / Торец' : 'Rough Turning / Face'}
            </span>
            <select
              value={activeAssignments.roughOdToolId}
              onChange={(e) => handleSetActiveRole('roughOdToolId', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono-code text-[11px] focus:border-amber-400 outline-none"
            >
              {tools.map(t => (
                <option key={t.id} value={t.id}>
                  {t.toolNumber} - {t.name} (R{t.noseRadius.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Finish OD */}
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
            <span className="text-[10px] text-emerald-400 font-mono-code font-bold uppercase block">
              2. {isRu ? 'Чистовой контур (G70/Swiss)' : 'Finish Contour (G70/Swiss)'}
            </span>
            <select
              value={activeAssignments.finishOdToolId}
              onChange={(e) => handleSetActiveRole('finishOdToolId', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono-code text-[11px] focus:border-emerald-400 outline-none"
            >
              {tools.map(t => (
                <option key={t.id} value={t.id}>
                  {t.toolNumber} - {t.name} (R{t.noseRadius.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Threading */}
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
            <span className="text-[10px] text-indigo-400 font-mono-code font-bold uppercase block">
              3. {isRu ? 'Резьба 60° (G76)' : 'Threading 60° (G76)'}
            </span>
            <select
              value={activeAssignments.threadToolId}
              onChange={(e) => handleSetActiveRole('threadToolId', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono-code text-[11px] focus:border-indigo-400 outline-none"
            >
              {tools.map(t => (
                <option key={t.id} value={t.id}>
                  {t.toolNumber} - {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Grooving */}
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
            <span className="text-[10px] text-cyan-400 font-mono-code font-bold uppercase block">
              4. {isRu ? 'Канавка / Подрезка' : 'Groove / Undercut'}
            </span>
            <select
              value={activeAssignments.grooveToolId}
              onChange={(e) => handleSetActiveRole('grooveToolId', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono-code text-[11px] focus:border-cyan-400 outline-none"
            >
              {tools.map(t => (
                <option key={t.id} value={t.id}>
                  {t.toolNumber} - {t.name} (W={t.insertWidth || 1.5}mm)
                </option>
              ))}
            </select>
          </div>

          {/* 5. Cutoff */}
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
            <span className="text-[10px] text-rose-400 font-mono-code font-bold uppercase block">
              5. {isRu ? 'Отрезка / Отсечка' : 'Cutoff / Parting'}
            </span>
            <select
              value={activeAssignments.cutoffToolId}
              onChange={(e) => handleSetActiveRole('cutoffToolId', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono-code text-[11px] focus:border-rose-400 outline-none"
            >
              {tools.map(t => (
                <option key={t.id} value={t.id}>
                  {t.toolNumber} - {t.name} (W={t.insertWidth || 2.0}mm)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs">
        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSelectedTypeFilter('all')}
            className={`px-2.5 py-1 rounded font-medium transition ${
              selectedTypeFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isRu ? 'Все типы' : 'All Types'} ({tools.length})
          </button>

          {Object.entries(TOOL_TYPE_LABELS).map(([typeKey, meta]) => {
            const count = tools.filter(t => t.type === typeKey).length;
            if (count === 0 && selectedTypeFilter !== typeKey) return null;
            return (
              <button
                key={typeKey}
                onClick={() => setSelectedTypeFilter(typeKey)}
                className={`px-2 py-1 rounded text-[11px] font-mono-code transition ${
                  selectedTypeFilter === typeKey
                    ? 'bg-slate-200 text-slate-950 font-bold'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isRu ? meta.ru : meta.en} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & Tip Guide Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder={isRu ? 'Поиск резца, пластины, T01...' : 'Search tool, insert, T01...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded pl-8 pr-3 py-1.5 text-slate-200 text-xs w-48 sm:w-60 focus:border-amber-400 outline-none"
            />
          </div>

          <button
            onClick={() => setShowTipOrientationGuide(!showTipOrientationGuide)}
            className={`px-2.5 py-1.5 rounded border text-[11px] font-mono-code flex items-center gap-1 transition ${
              showTipOrientationGuide
                ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Fanuc Tip 1..9</span>
          </button>
        </div>
      </div>

      {/* FANUC TIP ORIENTATION QUADRANT GUIDE (EDUCATIONAL HUD) */}
      {showTipOrientationGuide && (
        <div className="bg-slate-950 border border-amber-500/40 rounded-lg p-4 text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-mono-code">
              <Compass className="w-4 h-4" />
              <span>FANUC TOOL TIP ORIENTATION CODES (T1 – T9) ДЛЯ КОРРЕКЦИИ G41 / G42</span>
            </div>
            <button
              onClick={() => setShowTipOrientationGuide(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Visual 3x3 Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded p-3 text-center space-y-2">
              <span className="text-[11px] text-slate-400 font-mono-code block">
                Сетка квадрантов вершины Fanuc (Вид со стороны шпинделя)
              </span>
              <div className="grid grid-cols-3 gap-1.5 max-w-[220px] mx-auto font-mono-code font-bold text-xs">
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                  Tip 1<br/><span className="text-[9px] font-normal text-slate-500">ID Front</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                  Tip 2<br/><span className="text-[9px] font-normal text-slate-500">ID Back</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                  Tip 6<br/><span className="text-[9px] font-normal text-slate-500">+X</span>
                </div>

                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                  Tip 8<br/><span className="text-[9px] font-normal text-slate-500">-Z Face</span>
                </div>
                <div className="p-2 rounded bg-amber-500/20 border border-amber-500 text-amber-300">
                  Tip 9<br/><span className="text-[9px] font-normal">Center 0</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                  Tip 5<br/><span className="text-[9px] font-normal text-slate-500">+Z Retract</span>
                </div>

                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                  Tip 4<br/><span className="text-[9px] font-normal text-slate-500">OD Left</span>
                </div>
                <div className="p-2 rounded bg-emerald-500/20 border border-emerald-500 text-emerald-300 font-bold shadow">
                  Tip 3 ★<br/><span className="text-[9px] font-normal">OD Right</span>
                </div>
                <div className="p-2 rounded bg-purple-500/20 border border-purple-500 text-purple-300">
                  Tip 7<br/><span className="text-[9px] font-normal">Drill Axis</span>
                </div>
              </div>
            </div>

            {/* Explanations */}
            <div className="md:col-span-2 space-y-2 text-[11px] text-slate-300">
              <p>
                <strong className="text-emerald-400 font-mono-code">Tip 3 (Стандарт для наружного точения правым резцом):</strong> Центр скругления инструмента находится в 3-м квадранте (правее и выше кромки). Применяется для большинства проходных и подрезных резцов Fanuc при направлении точения к патрону.
              </p>
              <p>
                <strong className="text-purple-400 font-mono-code">Tip 7 (Осевой инструмент):</strong> Центр вершины совпадает с осью Z (сверла, развертки, метчики).
              </p>
              <p>
                <strong className="text-cyan-400 font-mono-code">Tip 2 (Расточной резец ID):</strong> Для обработки внутренних отверстий расточными резцами от центра наружу.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TOOL LISTING CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => {
          const typeMeta = TOOL_TYPE_LABELS[tool.type] || TOOL_TYPE_LABELS.rough_od;
          const isRoughActive = activeAssignments.roughOdToolId === tool.id;
          const isFinishActive = activeAssignments.finishOdToolId === tool.id;
          const isThreadActive = activeAssignments.threadToolId === tool.id;
          const isGrooveActive = activeAssignments.grooveToolId === tool.id;
          const isCutoffActive = activeAssignments.cutoffToolId === tool.id;
          const hasActiveRole = isRoughActive || isFinishActive || isThreadActive || isGrooveActive || isCutoffActive;

          return (
            <div
              key={tool.id}
              className={`bg-slate-900 border rounded-lg p-4 space-y-3.5 shadow-md transition hover:border-slate-700 ${
                hasActiveRole ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-slate-800'
              }`}
            >
              {/* Card Header: Tool Number + Name + Type */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-code font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow">
                      {tool.toolNumber}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-mono-code font-semibold ${typeMeta.color}`}>
                      {isRu ? typeMeta.ru : typeMeta.en}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 font-display">
                    {tool.name}
                  </h3>
                </div>

                {/* Quick Edit/Delete Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditTool(tool)}
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                    title={isRu ? 'Редактировать инструмент' : 'Edit tool'}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDuplicateTool(tool)}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                    title={isRu ? 'Клонировать' : 'Duplicate'}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTool(tool.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                    title={isRu ? 'Удалить' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Active Assignment Badges */}
              {hasActiveRole && (
                <div className="flex flex-wrap gap-1 text-[10px] font-mono-code">
                  {isRoughActive && (
                    <span className="bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-bold">
                      ★ {isRu ? 'ЧЕРНОВОЕ OD' : 'ACTIVE ROUGH'}
                    </span>
                  )}
                  {isFinishActive && (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-bold">
                      ★ {isRu ? 'ЧИСТОВОЕ OD' : 'ACTIVE FINISH'}
                    </span>
                  )}
                  {isThreadActive && (
                    <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-bold">
                      ★ {isRu ? 'РЕЗЬБА' : 'ACTIVE THREAD'}
                    </span>
                  )}
                  {isGrooveActive && (
                    <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded font-bold">
                      ★ {isRu ? 'КАНАВКА' : 'ACTIVE GROOVE'}
                    </span>
                  )}
                  {isCutoffActive && (
                    <span className="bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded font-bold">
                      ★ {isRu ? 'ОТРЕЗКА' : 'ACTIVE CUTOFF'}
                    </span>
                  )}
                </div>
              )}

              {/* Key Geometry Grid */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono-code">
                <div>
                  <span className="text-[10px] text-slate-400 block">{isRu ? 'Пластина:' : 'Insert:'}</span>
                  <span className="text-slate-200 font-bold">{tool.insertCode}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{isRu ? 'Радиус вершины (r_eps):' : 'Nose Radius (r_eps):'}</span>
                  <span className="text-amber-400 font-bold">R{tool.noseRadius.toFixed(2)} mm</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{isRu ? 'Державка (хвостовик):' : 'Shank Size:'}</span>
                  <span className="text-slate-300">{tool.shankSize}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{isRu ? 'Сплав / Покрытие:' : 'Grade / Coating:'}</span>
                  <span className="text-slate-300">{tool.coatingGrade}</span>
                </div>
                {tool.insertWidth !== undefined && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isRu ? 'Ширина пластины (W):' : 'Insert Width (W):'}</span>
                    <span className="text-cyan-400 font-bold">{tool.insertWidth.toFixed(2)} mm</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-400 block">{isRu ? 'Макс. глубина резания:' : 'Max DoC:'}</span>
                  <span className="text-slate-300">{tool.maxDoc.toFixed(2)} mm</span>
                </div>
              </div>

              {/* Fanuc Offsets & Orientation Block */}
              <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 text-[11px] font-mono-code space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>FANUC OFFSET REGISTERS</span>
                  <span className="text-amber-400 font-bold">TIP #{tool.tipOrientation}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="bg-slate-900 p-1 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">GEOM X</span>
                    <span className="text-slate-200 font-bold">{tool.xOffset >= 0 ? `+${tool.xOffset.toFixed(3)}` : tool.xOffset.toFixed(3)}</span>
                  </div>
                  <div className="bg-slate-900 p-1 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">GEOM Z</span>
                    <span className="text-slate-200 font-bold">{tool.zOffset >= 0 ? `+${tool.zOffset.toFixed(3)}` : tool.zOffset.toFixed(3)}</span>
                  </div>
                  <div className="bg-slate-900 p-1 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">WEAR X</span>
                    <span className="text-slate-400">{tool.wearX.toFixed(3)}</span>
                  </div>
                </div>
              </div>

              {/* Tool Notes */}
              {tool.notes && (
                <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-1.5 rounded">
                  &ldquo;{tool.notes}&rdquo;
                </p>
              )}
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
          <Info className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm text-slate-400 font-medium">
            {isRu ? 'Инструменты по заданным критериям не найдены' : 'No tools found matching your criteria'}
          </p>
          <button
            onClick={() => { setSelectedTypeFilter('all'); setSearchQuery(''); }}
            className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded hover:bg-slate-700"
          >
            {isRu ? 'Сбросить фильтры' : 'Clear Filters'}
          </button>
        </div>
      )}

      {/* ADD / EDIT TOOL MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-bold text-slate-100 text-base">
                  {editingTool 
                    ? (isRu ? `Редактирование: ${editingTool.toolNumber}` : `Edit Tool: ${editingTool.toolNumber}`)
                    : (isRu ? 'Создание нового инструмента' : 'Create Custom Tool')}
                </h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              {/* Row 1: Tool Number, Station, Offset, Type */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono-code font-bold">
                    {isRu ? 'Код инструмента (Txxxx)' : 'Tool Code (Txxxx)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.toolNumber || ''}
                    onChange={(e) => setFormState({ ...formState, toolNumber: e.target.value.toUpperCase() })}
                    placeholder="T0101"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-amber-300 font-mono-code font-bold focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-mono-code">
                    {isRu ? 'Позиция револьвера' : 'Turret Station'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="32"
                    value={formState.station || 1}
                    onChange={(e) => setFormState({ ...formState, station: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono-code focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-mono-code">
                    {isRu ? 'Номер корректора' : 'Offset Register #'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formState.offsetNumber || 1}
                    onChange={(e) => setFormState({ ...formState, offsetNumber: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono-code focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-mono-code">
                    {isRu ? 'Назначение / Тип' : 'Operation / Type'}
                  </label>
                  <select
                    value={formState.type || 'rough_od'}
                    onChange={(e) => setFormState({ ...formState, type: e.target.value as ToolType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 focus:border-amber-400 outline-none"
                  >
                    {Object.entries(TOOL_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {isRu ? v.ru : v.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Name */}
              <div>
                <label className="block text-slate-400 mb-1 font-mono-code">
                  {isRu ? 'Наименование резца / Описание' : 'Tool Name / Description'}
                </label>
                <input
                  type="text"
                  required
                  value={formState.name || ''}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="Main OD Roughing Turn (WNMG 80°)"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100 font-bold focus:border-amber-400 outline-none"
                />
              </div>

              {/* Row 3: Insert & Geometry */}
              <div className="bg-slate-950/70 border border-slate-800 rounded p-3 space-y-3">
                <span className="text-[11px] text-amber-400 font-mono-code font-bold uppercase block">
                  {isRu ? 'ГЕОМЕТРИЯ ПЛАСТИНЫ И КРОМКИ' : 'INSERT GEOMETRY & NOSE SPECIFICATIONS'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-mono-code">
                      {isRu ? 'Маркировка пластины' : 'Insert Standard Code'}
                    </label>
                    <input
                      type="text"
                      value={formState.insertCode || ''}
                      onChange={(e) => setFormState({ ...formState, insertCode: e.target.value })}
                      placeholder="WNMG 080408"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono-code focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-mono-code">
                      {isRu ? 'Форма пластины' : 'Insert Shape'}
                    </label>
                    <select
                      value={formState.insertShape || 'W_80_trigon'}
                      onChange={(e) => setFormState({ ...formState, insertShape: e.target.value as InsertShape })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono-code focus:border-amber-400 outline-none"
                    >
                      {INSERT_SHAPES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-amber-400 mb-1 font-mono-code font-bold">
                      {isRu ? 'Радиус при вершине r_eps (мм)' : 'Nose Radius r_eps (mm)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.00"
                      max="3.20"
                      required
                      value={formState.noseRadius !== undefined ? formState.noseRadius : 0.40}
                      onChange={(e) => setFormState({ ...formState, noseRadius: parseFloat(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-amber-300 font-mono-code font-bold focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-mono-code">
                      {isRu ? 'Ширина W (отрезка/канавка)' : 'Insert Width W (mm)'}
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="10.0"
                      value={formState.insertWidth || ''}
                      onChange={(e) => setFormState({ ...formState, insertWidth: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="1.50"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono-code focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-mono-code">
                      {isRu ? 'Главный угол (Lead)' : 'Lead Angle (°)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={formState.leadAngle || 95}
                      onChange={(e) => setFormState({ ...formState, leadAngle: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono-code focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-mono-code">
                      {isRu ? 'Макс. глубина DoC (мм)' : 'Max Cut Depth (mm)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="15.0"
                      value={formState.maxDoc || 1.0}
                      onChange={(e) => setFormState({ ...formState, maxDoc: parseFloat(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono-code focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-mono-code">
                      {isRu ? 'Исполнение (Рука)' : 'Hand Direction'}
                    </label>
                    <select
                      value={formState.hand || 'right'}
                      onChange={(e) => setFormState({ ...formState, hand: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 focus:border-amber-400 outline-none"
                    >
                      <option value="right">{isRu ? 'Правый (Right)' : 'Right-Hand'}</option>
                      <option value="left">{isRu ? 'Левый (Left)' : 'Left-Hand'}</option>
                      <option value="neutral">{isRu ? 'Нейтральный (Neutral)' : 'Neutral'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 4: Offsets & Tip Orientation */}
              <div className="bg-slate-950/70 border border-slate-800 rounded p-3 space-y-3">
                <span className="text-[11px] text-cyan-400 font-mono-code font-bold uppercase block">
                  {isRu ? 'КОРРЕКТОРЫ СТАНКА FANUC (OFFSETS & TIP ORIENTATION)' : 'FANUC MACHINE OFFSETS & TIP ORIENTATION'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-mono-code">
                      {isRu ? 'Корректор X (мм)' : 'Geometry X Offset'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formState.xOffset || 0.000}
                      onChange={(e) => setFormState({ ...formState, xOffset: parseFloat(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono-code focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-mono-code">
                      {isRu ? 'Корректор Z (мм)' : 'Geometry Z Offset'}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formState.zOffset || 0.000}
                      onChange={(e) => setFormState({ ...formState, zOffset: parseFloat(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono-code focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-amber-400 mb-1 font-mono-code font-bold">
                      {isRu ? 'Квадрант вершины (Tip 1..9)' : 'Tip Orientation (1..9)'}
                    </label>
                    <select
                      value={formState.tipOrientation || 3}
                      onChange={(e) => setFormState({ ...formState, tipOrientation: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-amber-300 font-mono-code font-bold focus:border-amber-400 outline-none"
                    >
                      <option value="3">Tip 3 (OD Right-Hand Turning)</option>
                      <option value="4">Tip 4 (OD Left-Hand Turning)</option>
                      <option value="2">Tip 2 (ID Internal Boring Bar)</option>
                      <option value="1">Tip 1 (ID Front Facing)</option>
                      <option value="7">Tip 7 (Center Drill / Drill)</option>
                      <option value="8">Tip 8 (Face Plunge / Threading)</option>
                      <option value="9">Tip 9 (Center Point 0)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-mono-code">
                      {isRu ? 'Державка (сечение)' : 'Shank Size'}
                    </label>
                    <input
                      type="text"
                      value={formState.shankSize || '12x12 mm (Swiss)'}
                      onChange={(e) => setFormState({ ...formState, shankSize: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono-code focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 mb-1 font-mono-code">
                  {isRu ? 'Примечания цехового наладчика' : 'Setup Notes / Remarks'}
                </label>
                <textarea
                  rows={2}
                  value={formState.notes || ''}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  placeholder="Рекомендуется для чистовой обработки деталей диаметром до 6 мм на Tsugami S206..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-300 focus:border-amber-400 outline-none text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition"
                >
                  {isRu ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded flex items-center gap-1.5 shadow transition"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTool ? (isRu ? 'Сохранить изменения' : 'Save Changes') : (isRu ? 'Создать инструмент' : 'Create Tool')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
