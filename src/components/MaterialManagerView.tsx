import React, { useState, useMemo } from 'react';
import { MaterialSpec, MaterialCategory } from '../types/cnc';
import { 
  PRESET_MATERIAL_COLORS, 
  CATEGORY_LABELS,
  saveMaterials, 
  resetMaterialsToDefault,
  downloadMaterialsJson,
  importMaterialsFromJson,
  getEffectiveRegimes
} from '../utils/materialStorage';
import { useLanguage } from '../context/LanguageContext';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Sliders, 
  Gauge, 
  Zap, 
  Search, 
  Palette, 
  X, 
  Layers,
  FileCode,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface MaterialManagerViewProps {
  materials: MaterialSpec[];
  onMaterialsChange: (updatedMaterials: MaterialSpec[]) => void;
  activeMaterial: MaterialSpec;
  onSelectActiveMaterial: (material: MaterialSpec) => void;
}

export const MaterialManagerView: React.FC<MaterialManagerViewProps> = ({
  materials,
  onMaterialsChange,
  activeMaterial,
  onSelectActiveMaterial
}) => {
  const { language, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterCustomOnly, setFilterCustomOnly] = useState(false);

  // Edit / Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialSpec | null>(null);

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      if (filterCustomOnly && !m.isCustom) return false;
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = m.name.toLowerCase().includes(query);
        const matchCode = m.code.toLowerCase().includes(query);
        const matchNotes = (m.notes || '').toLowerCase().includes(query);
        const matchCat = (m.category || '').toLowerCase().includes(query);
        return matchName || matchCode || matchNotes || matchCat;
      }
      return true;
    });
  }, [materials, selectedCategory, filterCustomOnly, searchTerm]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const newTemplate: MaterialSpec = {
      id: `custom-mat-${Date.now()}`,
      name: '',
      code: '',
      category: 'steel',
      colorCode: PRESET_MATERIAL_COLORS[Math.floor(Math.random() * PRESET_MATERIAL_COLORS.length)].hex,
      isCustom: true,
      speedMultiplier: 1.0,
      feedMultiplier: 1.0,
      density: 7.85,
      kc1_1: 1850,
      vcRough: [100, 150],
      vcFinish: [140, 220],
      vcParting: [70, 110],
      vcThreading: [70, 110],
      feedRough: [0.08, 0.16],
      feedFinish: [0.03, 0.08],
      feedParting: [0.02, 0.045],
      depthRough: [0.4, 1.5],
      depthFinish: [0.05, 0.25],
      coolantRecommended: 'High pressure neat cutting oil or 8-10% emulsion',
      notes: 'Custom shop-floor profile.',
      hardnessHb: 200,
      tensileStrengthMpa: 650,
      machinabilityRating: 60,
      chipBreakability: 'good'
    };
    setEditingMaterial(newTemplate);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (mat: MaterialSpec) => {
    setEditingMaterial({ ...mat });
    setIsModalOpen(true);
  };

  // Clone Material
  const handleCloneMaterial = (mat: MaterialSpec) => {
    const clone: MaterialSpec = {
      ...mat,
      id: `custom-mat-${Date.now()}`,
      name: `${mat.name} (Clone)`,
      code: `${mat.code}-MOD`,
      isCustom: true,
      colorCode: PRESET_MATERIAL_COLORS[(PRESET_MATERIAL_COLORS.findIndex(c => c.hex === mat.colorCode) + 1) % PRESET_MATERIAL_COLORS.length].hex
    };
    const updated = [clone, ...materials];
    onMaterialsChange(updated);
    saveMaterials(updated);
    showToast(`Created clone: ${clone.code}`);
  };

  // Delete Material
  const handleDeleteMaterial = (id: string, name: string) => {
    if (activeMaterial.id === id) {
      alert(language === 'ru' 
        ? 'Нельзя удалить активный в данный момент материал! Сначала переключитесь на другой материал.' 
        : 'Cannot delete the currently active material! Select another material first.');
      return;
    }
    const confirmed = window.confirm(
      language === 'ru' 
        ? `Вы уверены, что хотите удалить материал "${name}"?` 
        : `Are you sure you want to delete material "${name}"?`
    );
    if (!confirmed) return;

    const updated = materials.filter(m => m.id !== id);
    onMaterialsChange(updated);
    saveMaterials(updated);
    showToast(`Material deleted.`);
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    const confirmed = window.confirm(
      language === 'ru'
        ? 'Сбросить все профили материалов к заводским настройкам? Пользовательские профили будут удалены.'
        : 'Reset all material profiles to factory defaults? Custom profiles will be removed.'
    );
    if (!confirmed) return;

    const defaults = resetMaterialsToDefault();
    onMaterialsChange(defaults);
    if (!defaults.some(m => m.id === activeMaterial.id)) {
      onSelectActiveMaterial(defaults[0]);
    }
    showToast(language === 'ru' ? 'Сброшено к заводским настройкам' : 'Reset to factory defaults');
  };

  // Save Modal Form
  const handleSaveModal = (mat: MaterialSpec) => {
    if (!mat.name.trim() || !mat.code.trim()) {
      alert(language === 'ru' ? 'Укажите название и марку материала!' : 'Please specify material name and grade code!');
      return;
    }

    const existingIdx = materials.findIndex(m => m.id === mat.id);
    let updated: MaterialSpec[];
    if (existingIdx >= 0) {
      updated = [...materials];
      updated[existingIdx] = mat;
    } else {
      updated = [mat, ...materials];
    }

    onMaterialsChange(updated);
    saveMaterials(updated);

    // If currently active material was edited, update active selection
    if (activeMaterial.id === mat.id) {
      onSelectActiveMaterial(mat);
    }

    setIsModalOpen(false);
    setEditingMaterial(null);
    showToast(language === 'ru' ? `Материал "${mat.code}" сохранен` : `Material "${mat.code}" saved`);
  };

  // Import JSON Handler
  const handleImportSubmit = () => {
    setImportError(null);
    if (!importJsonText.trim()) {
      setImportError(language === 'ru' ? 'Вставьте JSON-данные' : 'Paste JSON content');
      return;
    }

    const res = importMaterialsFromJson(importJsonText);
    if (!res.success || !res.materials) {
      setImportError(res.error || 'Failed to import JSON');
      return;
    }

    // Merge or prepend new materials
    const importedIds = new Set(res.materials.map(m => m.id));
    const merged = [
      ...res.materials,
      ...materials.filter(m => !importedIds.has(m.id))
    ];

    onMaterialsChange(merged);
    saveMaterials(merged);
    setIsImportModalOpen(false);
    setImportJsonText('');
    showToast(language === 'ru' ? `Успешно импортировано: ${res.materials.length} профилей` : `Successfully imported: ${res.materials.length} profiles`);
  };

  const categoriesList: MaterialCategory[] = [
    'stainless',
    'steel',
    'brass',
    'aluminum',
    'titanium',
    'copper',
    'plastic',
    'superalloy',
    'cast_iron',
    'other'
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 rounded-lg shadow-2xl font-mono-code font-bold text-xs flex items-center gap-2 border border-amber-300 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-md">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-slate-100 flex items-center gap-2">
                  {language === 'ru' ? 'Менеджер материалов и режимов резания' : 'Material Profiles & Regimes Manager'}
                  <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono-code font-bold">
                    {materials.length} {language === 'ru' ? 'профилей' : 'profiles'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {language === 'ru'
                    ? 'Настройка коэффициентов скоростей (Vc), подач (Fn), глубин резания и удельного сопротивления kc1.1 с сохранением в браузере.'
                    : 'Configure cutting speed/feed multipliers, depth of cuts, and specific cutting forces with persistent local storage.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded text-xs transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ru' ? 'Новый материал' : 'New Material Profile'}</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition"
              title="Import materials from JSON"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'ru' ? 'Импорт JSON' : 'Import JSON'}</span>
            </button>

            <button
              onClick={() => downloadMaterialsJson(materials)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition"
              title="Export materials to JSON"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'ru' ? 'Экспорт' : 'Export JSON'}</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/80 rounded text-xs transition"
              title="Reset to factory preset materials"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{language === 'ru' ? 'Сброс' : 'Reset'}</span>
            </button>
          </div>
        </div>

        {/* Active Material Strip */}
        <div className="mt-4 p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 uppercase font-mono-code font-bold">
              {language === 'ru' ? 'Текущий активный материал в расчётах:' : 'Currently Active in CNC Engine:'}
            </span>
            <div className="flex items-center gap-2">
              <span 
                className="w-3.5 h-3.5 rounded-full ring-2 ring-slate-800"
                style={{ backgroundColor: activeMaterial.colorCode || '#3b82f6' }}
              />
              <span className="font-mono-code font-bold text-amber-300 text-sm">
                {activeMaterial.code}
              </span>
              <span className="text-xs text-slate-300">
                — {activeMaterial.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono-code text-xs">
            <span className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
              <span className="text-slate-400">Vc Mult: </span>
              <span className="text-amber-400 font-bold">
                {((activeMaterial.speedMultiplier ?? 1.0) * 100).toFixed(0)}%
              </span>
            </span>
            <span className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
              <span className="text-slate-400">Fn Mult: </span>
              <span className="text-amber-400 font-bold">
                {((activeMaterial.feedMultiplier ?? 1.0) * 100).toFixed(0)}%
              </span>
            </span>
            <span className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
              <span className="text-slate-400">kc1.1: </span>
              <span className="text-cyan-400 font-bold">{activeMaterial.kc1_1} N/mm²</span>
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 min-w-[240px] items-center relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ru' ? 'Поиск по марке, названию, примечанию...' : 'Search by code, material name, notes...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono-code"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded transition text-xs font-mono-code ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {language === 'ru' ? 'Все' : 'All'}
            </button>
            {categoriesList.map((cat) => {
              const label = language === 'ru' ? CATEGORY_LABELS[cat]?.ru || cat : CATEGORY_LABELS[cat]?.en || cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded transition text-xs font-mono-code whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <button
              onClick={() => setFilterCustomOnly(!filterCustomOnly)}
              className={`px-2.5 py-1 rounded transition text-xs font-mono-code border ${
                filterCustomOnly
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              ★ {language === 'ru' ? 'Только свои' : 'Custom Only'}
            </button>
          </div>
        </div>
      </div>

      {/* Materials Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMaterials.map((mat) => {
          const isActive = activeMaterial.id === mat.id;
          const effective = getEffectiveRegimes(mat);
          const color = mat.colorCode || '#3b82f6';
          const speedPct = Math.round((mat.speedMultiplier ?? 1.0) * 100);
          const feedPct = Math.round((mat.feedMultiplier ?? 1.0) * 100);

          return (
            <div
              key={mat.id}
              className={`bg-slate-900 rounded-lg border transition shadow-lg flex flex-col justify-between overflow-hidden relative ${
                isActive 
                  ? 'border-amber-400/80 ring-1 ring-amber-400/50 shadow-amber-500/10' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Left Color Accent Bar */}
              <div 
                className="absolute top-0 left-0 bottom-0 w-1.5"
                style={{ backgroundColor: color }}
              />

              <div className="p-4 pl-5">
                {/* Header: Code, Badges, Category */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: color }} 
                    />
                    <h3 className="text-base font-mono-code font-bold text-slate-100 flex items-center gap-1.5">
                      {mat.code}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {mat.isCustom ? (
                      <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700 px-1.5 py-0.2 rounded font-mono-code font-bold">
                        {language === 'ru' ? 'ПОЛЬЗОВАТЕЛЬСКИЙ' : 'CUSTOM'}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.2 rounded font-mono-code">
                        {language === 'ru' ? 'ЗАВОДСКОЙ' : 'FACTORY'}
                      </span>
                    )}

                    {isActive && (
                      <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-mono-code font-bold flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Full Material Name */}
                <p className="text-xs text-slate-300 font-medium line-clamp-1 mb-3">
                  {mat.name}
                </p>

                {/* Multipliers & Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px] font-mono-code">
                  <span className="bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded capitalize">
                    {mat.category}
                  </span>

                  <span className={`px-2 py-0.5 rounded border ${
                    speedPct !== 100
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}>
                    Vc: <strong className={speedPct > 100 ? 'text-emerald-400' : speedPct < 100 ? 'text-amber-400' : 'text-slate-200'}>{speedPct}%</strong>
                  </span>

                  <span className={`px-2 py-0.5 rounded border ${
                    feedPct !== 100
                      ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}>
                    Fn: <strong className={feedPct > 100 ? 'text-emerald-400' : feedPct < 100 ? 'text-amber-400' : 'text-slate-200'}>{feedPct}%</strong>
                  </span>

                  {mat.chipBreakability && (
                    <span className="bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      Chips: <strong className="text-slate-200">{mat.chipBreakability}</strong>
                    </span>
                  )}
                </div>

                {/* Key Regime Parameters Box */}
                <div className="bg-slate-950 rounded border border-slate-800/80 p-2.5 space-y-1.5 text-xs font-mono-code mb-3">
                  <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/60 pb-1">
                    <span>{language === 'ru' ? 'Черновое точение' : 'Rough Turning'}:</span>
                    <span className="text-slate-200 font-semibold">
                      Vc {effective.vcRough[0]}–{effective.vcRough[1]} m/min | f {effective.feedRough[0]}–{effective.feedRough[1]}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/60 pb-1">
                    <span>{language === 'ru' ? 'Чистовое точение' : 'Finish Turning'}:</span>
                    <span className="text-amber-300 font-semibold">
                      Vc {effective.vcFinish[0]}–{effective.vcFinish[1]} m/min | f {effective.feedFinish[0]}–{effective.feedFinish[1]}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400">
                    <span>{language === 'ru' ? 'Отрезка / Резьба' : 'Parting / Thread'}:</span>
                    <span className="text-cyan-400 font-semibold">
                      Part Vc {effective.vcParting[0]} | Thrd Vc {effective.vcThreading[0]}
                    </span>
                  </div>
                </div>

                {/* Physical Specifications */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono-code mb-3 bg-slate-950/60 rounded p-2 border border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block">kc1.1</span>
                    <span className="text-slate-200 font-bold">{mat.kc1_1} N/mm²</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{language === 'ru' ? 'Плотность' : 'Density'}</span>
                    <span className="text-slate-200 font-bold">{mat.density} g/cm³</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{language === 'ru' ? 'Твердость' : 'Hardness'}</span>
                    <span className="text-slate-200 font-bold">{mat.hardnessHb ? `${mat.hardnessHb} HB` : '—'}</span>
                  </div>
                </div>

                {/* Notes preview */}
                {mat.notes && (
                  <p className="text-[11px] text-slate-400 italic line-clamp-2 bg-slate-950/40 p-2 rounded border border-slate-800/40 mb-3">
                    "{mat.notes}"
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectActiveMaterial(mat)}
                  disabled={isActive}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-mono-code font-bold transition ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isActive ? (language === 'ru' ? 'Выбран для станка' : 'Active Profile') : (language === 'ru' ? 'Выбрать' : 'Use Material')}</span>
                </button>

                <button
                  onClick={() => handleOpenEditModal(mat)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition"
                  title="Edit Material Profile"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleCloneMaterial(mat)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition"
                  title="Clone as Custom Material"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {mat.isCustom ? (
                  <button
                    onClick={() => handleDeleteMaterial(mat.id, mat.name)}
                    className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded border border-rose-800/80 transition"
                    title="Delete Custom Material"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    disabled
                    className="p-1.5 bg-slate-900 text-slate-600 rounded border border-slate-800 cursor-not-allowed opacity-50"
                    title="Factory preset cannot be deleted"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-400">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-300 mb-1">
            {language === 'ru' ? 'Материалы не найдены' : 'No material profiles matched your search'}
          </p>
          <p className="text-xs text-slate-500 mb-4">
            {language === 'ru' ? 'Попробуйте изменить поисковый запрос или фильтр категорий' : 'Try adjusting your search criteria or category filter'}
          </p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setFilterCustomOnly(false); }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono-code transition"
          >
            {language === 'ru' ? 'Сбросить фильтры' : 'Clear Filters'}
          </button>
        </div>
      )}

      {/* CREATE / EDIT MATERIAL MODAL */}
      {isModalOpen && editingMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span 
                  className="w-4 h-4 rounded-full ring-2 ring-slate-800 shrink-0"
                  style={{ backgroundColor: editingMaterial.colorCode || '#3b82f6' }}
                />
                <div>
                  <h3 className="font-display font-bold text-slate-100 text-base">
                    {editingMaterial.id.startsWith('custom') 
                      ? (language === 'ru' ? 'Создание/редактирование профиля материала' : 'Create / Edit Material Profile')
                      : (language === 'ru' ? 'Редактирование профиля материала' : 'Edit Material Profile')}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono-code">
                    {editingMaterial.code || 'UNNAMED_MATERIAL'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 text-xs font-mono-code">
              {/* Basic Details */}
              <div className="space-y-3">
                <h4 className="text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>1. {language === 'ru' ? 'Основная информация и идентификация' : 'Identification & Classification'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-slate-400 text-[11px]">{language === 'ru' ? 'Полное наименование материала' : 'Material Full Name'} *</label>
                    <input
                      type="text"
                      value={editingMaterial.name}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                      placeholder="e.g. Free-Cutting Brass (CW614N) / AISI 304"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">{language === 'ru' ? 'Код / Марка (AISI/DIN)' : 'Grade Code'} *</label>
                    <input
                      type="text"
                      value={editingMaterial.code}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. SS304, CW614N"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-amber-300 font-bold focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px]">{language === 'ru' ? 'Группа сплава / Категория' : 'Category / Alloy Family'}</label>
                    <select
                      value={editingMaterial.category}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, category: e.target.value as MaterialCategory })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:border-amber-400 outline-none capitalize"
                    >
                      {categoriesList.map(cat => (
                        <option key={cat} value={cat}>
                          {language === 'ru' ? CATEGORY_LABELS[cat]?.ru || cat : CATEGORY_LABELS[cat]?.en || cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color Swatch Picker */}
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[11px] flex items-center justify-between">
                      <span>{language === 'ru' ? 'Цветовой маркер (Badge Color)' : 'Badge / Color Code'}</span>
                      <span className="text-slate-500">{editingMaterial.colorCode}</span>
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_MATERIAL_COLORS.map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setEditingMaterial({ ...editingMaterial, colorCode: c.hex })}
                          className={`w-6 h-6 rounded-full border transition ${
                            editingMaterial.colorCode === c.hex
                              ? 'ring-2 ring-white scale-110 border-white'
                              : 'border-slate-800 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        />
                      ))}
                      <input
                        type="color"
                        value={editingMaterial.colorCode || '#3b82f6'}
                        onChange={(e) => setEditingMaterial({ ...editingMaterial, colorCode: e.target.value })}
                        className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer p-0"
                        title="Custom Color"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Multipliers & Performance Factor */}
              <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>2. {language === 'ru' ? 'Коэффициенты скоростей и подач (Multipliers)' : 'Speed & Feed Multipliers'}</span>
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    {language === 'ru' ? 'Масштабируют Vc и Fn при генерации G-кода' : 'Scales Vc and feed across generated toolpaths'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Speed Multiplier */}
                  <div className="space-y-1.5 bg-slate-900 p-2.5 rounded border border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-semibold">{language === 'ru' ? 'Коэффициент скорости (Vc Multiplier)' : 'Speed Multiplier (Vc)'}:</span>
                      <span className="text-amber-400 font-bold">{Math.round((editingMaterial.speedMultiplier ?? 1.0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={editingMaterial.speedMultiplier ?? 1.0}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, speedMultiplier: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between gap-1">
                      {[0.8, 1.0, 1.15, 1.25].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setEditingMaterial({ ...editingMaterial, speedMultiplier: val })}
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            editingMaterial.speedMultiplier === val
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {Math.round(val * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feed Multiplier */}
                  <div className="space-y-1.5 bg-slate-900 p-2.5 rounded border border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-semibold">{language === 'ru' ? 'Коэффициент подачи (Feed Multiplier)' : 'Feed Multiplier (Fn)'}:</span>
                      <span className="text-amber-400 font-bold">{Math.round((editingMaterial.feedMultiplier ?? 1.0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={editingMaterial.feedMultiplier ?? 1.0}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, feedMultiplier: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between gap-1">
                      {[0.8, 0.9, 1.0, 1.15].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setEditingMaterial({ ...editingMaterial, feedMultiplier: val })}
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            editingMaterial.feedMultiplier === val
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {Math.round(val * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Turning Regimes: Rough & Finish */}
              <div className="space-y-3">
                <h4 className="text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>3. {language === 'ru' ? 'Режимы резания (Черновые и чистовые)' : 'Cutting Regimes (Roughing & Finishing)'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Roughing */}
                  <div className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2">
                    <span className="text-slate-200 font-bold block text-xs border-b border-slate-800 pb-1">
                      {language === 'ru' ? 'Черновая обработка (Roughing)' : 'Rough Turning'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px]">Vc Min (m/min)</label>
                        <input
                          type="number"
                          value={editingMaterial.vcRough[0]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            vcRough: [parseFloat(e.target.value) || 0, editingMaterial.vcRough[1]]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px]">Vc Max (m/min)</label>
                        <input
                          type="number"
                          value={editingMaterial.vcRough[1]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            vcRough: [editingMaterial.vcRough[0], parseFloat(e.target.value) || 0]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px]">Feed Min (mm/rev)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingMaterial.feedRough[0]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            feedRough: [parseFloat(e.target.value) || 0, editingMaterial.feedRough[1]]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px]">Feed Max (mm/rev)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingMaterial.feedRough[1]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            feedRough: [editingMaterial.feedRough[0], parseFloat(e.target.value) || 0]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px]">Depth Min (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editingMaterial.depthRough[0]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            depthRough: [parseFloat(e.target.value) || 0, editingMaterial.depthRough[1]]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px]">Depth Max (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editingMaterial.depthRough[1]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            depthRough: [editingMaterial.depthRough[0], parseFloat(e.target.value) || 0]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Finishing */}
                  <div className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2">
                    <span className="text-amber-300 font-bold block text-xs border-b border-slate-800 pb-1">
                      {language === 'ru' ? 'Чистовая обработка (Finishing)' : 'Finish Turning'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px]">Vc Min (m/min)</label>
                        <input
                          type="number"
                          value={editingMaterial.vcFinish[0]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            vcFinish: [parseFloat(e.target.value) || 0, editingMaterial.vcFinish[1]]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px]">Vc Max (m/min)</label>
                        <input
                          type="number"
                          value={editingMaterial.vcFinish[1]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            vcFinish: [editingMaterial.vcFinish[0], parseFloat(e.target.value) || 0]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px]">Feed Min (mm/rev)</label>
                        <input
                          type="number"
                          step="0.005"
                          value={editingMaterial.feedFinish[0]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            feedFinish: [parseFloat(e.target.value) || 0, editingMaterial.feedFinish[1]]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px]">Feed Max (mm/rev)</label>
                        <input
                          type="number"
                          step="0.005"
                          value={editingMaterial.feedFinish[1]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            feedFinish: [editingMaterial.feedFinish[0], parseFloat(e.target.value) || 0]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px]">Depth Min (mm)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={editingMaterial.depthFinish[0]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            depthFinish: [parseFloat(e.target.value) || 0, editingMaterial.depthFinish[1]]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px]">Depth Max (mm)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={editingMaterial.depthFinish[1]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            depthFinish: [editingMaterial.depthFinish[0], parseFloat(e.target.value) || 0]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parting & Threading */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2">
                    <span className="text-cyan-300 font-bold block text-xs border-b border-slate-800 pb-1">
                      {language === 'ru' ? 'Отрезка (Parting-Off)' : 'Parting-Off'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px]">Vc (m/min)</label>
                        <input
                          type="number"
                          value={editingMaterial.vcParting[0]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            vcParting: [parseFloat(e.target.value) || 0, editingMaterial.vcParting[1]]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px]">Feed (mm/rev)</label>
                        <input
                          type="number"
                          step="0.005"
                          value={editingMaterial.feedParting[0]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            feedParting: [parseFloat(e.target.value) || 0, editingMaterial.feedParting[1]]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded border border-slate-800 space-y-2">
                    <span className="text-purple-300 font-bold block text-xs border-b border-slate-800 pb-1">
                      {language === 'ru' ? 'Нарезание резьбы (Threading)' : 'Threading'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px]">Vc Min (m/min)</label>
                        <input
                          type="number"
                          value={editingMaterial.vcThreading[0]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            vcThreading: [parseFloat(e.target.value) || 0, editingMaterial.vcThreading[1]]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px]">Vc Max (m/min)</label>
                        <input
                          type="number"
                          value={editingMaterial.vcThreading[1]}
                          onChange={(e) => setEditingMaterial({
                            ...editingMaterial,
                            vcThreading: [editingMaterial.vcThreading[0], parseFloat(e.target.value) || 0]
                          })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Properties & Notes */}
              <div className="space-y-3">
                <h4 className="text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  <span>4. {language === 'ru' ? 'Физические свойства и рекомендации' : 'Physical Properties & Workshop Notes'}</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-400 text-[10px] block">kc1.1 (N/mm²)</label>
                    <input
                      type="number"
                      value={editingMaterial.kc1_1}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, kc1_1: parseFloat(e.target.value) || 1800 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block">{language === 'ru' ? 'Плотность (g/cm³)' : 'Density (g/cm³)'}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingMaterial.density}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, density: parseFloat(e.target.value) || 7.8 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block">{language === 'ru' ? 'Твердость (HB)' : 'Hardness (HB)'}</label>
                    <input
                      type="number"
                      value={editingMaterial.hardnessHb || ''}
                      placeholder="e.g. 180"
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, hardnessHb: parseInt(e.target.value, 10) || undefined })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] block">{language === 'ru' ? 'Стружкодробление' : 'Chip Break'}</label>
                    <select
                      value={editingMaterial.chipBreakability || 'good'}
                      onChange={(e) => setEditingMaterial({ ...editingMaterial, chipBreakability: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">{language === 'ru' ? 'Рекомендованная СОЖ / Смазка' : 'Recommended Coolant'}</label>
                  <input
                    type="text"
                    value={editingMaterial.coolantRecommended}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, coolantRecommended: e.target.value })}
                    placeholder="e.g. High pressure neat oil or 10-12% synthetic emulsion"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[10px]">{language === 'ru' ? 'Цеховые заметки и предостережения' : 'Shop Notes & Machining Precautions'}</label>
                  <textarea
                    rows={2}
                    value={editingMaterial.notes}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, notes: e.target.value })}
                    placeholder="e.g. Prone to work hardening; avoid dwelling on finish passes..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-sans text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
              >
                {language === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveModal(editingMaterial)}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded text-xs transition shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{language === 'ru' ? 'Сохранить профиль' : 'Save Profile'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT JSON MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-100 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>{language === 'ru' ? 'Импорт базы материалов из JSON' : 'Import Materials from JSON'}</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs font-mono-code">
              <p className="text-slate-400">
                {language === 'ru' 
                  ? 'Вставьте экспортированный JSON-файл или массив объектов MaterialSpec:' 
                  : 'Paste an exported materials JSON string or array of MaterialSpec objects:'}
              </p>

              <textarea
                rows={8}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{ "materials": [ { "id": "custom-1", "name": "Titanium Ti-6Al-4V", "code": "TI6AL4V", ... } ] }'
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 font-mono-code text-[11px] focus:outline-none focus:border-amber-400"
              />

              {importError && (
                <div className="p-2 bg-rose-950/80 border border-rose-800 text-rose-300 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
              >
                {language === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                onClick={handleImportSubmit}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition"
              >
                {language === 'ru' ? 'Импортировать' : 'Import Profiles'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
