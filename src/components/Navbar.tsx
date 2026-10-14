import React from 'react';
import { MACHINES } from '../data/machines';
import { MATERIALS } from '../data/materials';
import { MachineSpec, MaterialSpec, SafetyCheckResult } from '../types/cnc';
import { useLanguage } from '../context/LanguageContext';
import { 
  Cpu, 
  ShieldCheck, 
  AlertTriangle, 
  Gauge, 
  Wrench, 
  Scan, 
  Terminal,
  FileCode2,
  ChevronDown,
  Camera,
  Globe,
  SlidersHorizontal,
  Layers
} from 'lucide-react';

export type ActiveTab = 
  | 'gcode_studio' 
  | 'blueprint_scanner'
  | 'tool_library'
  | 'material_manager'
  | 'safety_audit' 
  | 'feeds_speeds' 
  | 'swiss_setup' 
  | 'alarms' 
  | 'vision_parser';

interface NavbarProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  selectedMachine: MachineSpec;
  onSelectMachine: (machine: MachineSpec) => void;
  selectedMaterial: MaterialSpec;
  onSelectMaterial: (material: MaterialSpec) => void;
  materials?: MaterialSpec[];
  safetyCheck: SafetyCheckResult;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  selectedMachine,
  onSelectMachine,
  selectedMaterial,
  onSelectMaterial,
  materials,
  safetyCheck
}) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-md border border-amber-400/40">
            <Cpu className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-slate-100 text-lg tracking-wider">
                {t('appTitle')}
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono-code font-bold uppercase">
                {t('swissProBadge')}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono-code hidden sm:block">
              {t('appSubtitle')}
            </p>
          </div>
        </div>

        {/* Machine & Material Quick Pickers & Language Toggle */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Machine Dropdown */}
          <div className="relative">
            <select
              value={selectedMachine.id}
              onChange={(e) => {
                const found = MACHINES.find(m => m.id === e.target.value);
                if (found) onSelectMachine(found);
              }}
              className="appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 pl-2.5 pr-7 py-1.5 rounded font-mono-code text-xs outline-none focus:border-amber-400 cursor-pointer shadow-sm"
            >
              {MACHINES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.controller})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Material Dropdown */}
          <div className="relative">
            <select
              value={selectedMaterial.id}
              onChange={(e) => {
                const list = materials || MATERIALS;
                const found = list.find(m => m.id === e.target.value);
                if (found) onSelectMaterial(found);
              }}
              className="appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 text-amber-300 pl-2.5 pr-7 py-1.5 rounded font-mono-code text-xs outline-none focus:border-amber-400 cursor-pointer shadow-sm font-semibold"
            >
              {(materials || MATERIALS).map((mat) => (
                <option key={mat.id} value={mat.id}>
                  {mat.code} - {mat.name} {mat.isCustom ? '★' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Real-time Safety Pill */}
          <button
            onClick={() => onTabChange('safety_audit')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono-code font-bold transition ${
              safetyCheck.overallPassed
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/80 hover:bg-emerald-900/60'
                : 'bg-red-950/80 text-red-400 border-red-700/80 hover:bg-red-900/60 animate-pulse'
            }`}
            title="Click to view detailed Safety Audit"
          >
            {safetyCheck.overallPassed ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            )}
            <span>{safetyCheck.overallPassed ? t('safetyVerified') : t('safetyError')}</span>
          </button>

          {/* Language Switcher (RU / EN) */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded p-0.5 text-xs font-mono-code">
            <button
              onClick={() => setLanguage('ru')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
                language === 'ru'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Русский язык"
            >
              <span>RU</span>
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
                language === 'en'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="English language"
            >
              <span>EN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-slate-900/80 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto text-xs no-scrollbar">
          {/* Tab 1: Studio */}
          <button
            onClick={() => onTabChange('gcode_studio')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 font-medium tracking-wide whitespace-nowrap transition ${
              currentTab === 'gcode_studio'
                ? 'border-amber-400 text-amber-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <FileCode2 className="w-4 h-4 text-amber-400" />
            <span>{t('tabStudio')}</span>
          </button>

          {/* Tab 2: Blueprint Scanner (Camera & Photo) */}
          <button
            onClick={() => onTabChange('blueprint_scanner')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 font-medium tracking-wide whitespace-nowrap transition ${
              currentTab === 'blueprint_scanner'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>{t('tabScanner')}</span>
            <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1 rounded font-mono-code font-bold">
              NEW
            </span>
          </button>

          {/* Tab 3: Tool Library (Persistent Storage) */}
          <button
            onClick={() => onTabChange('tool_library')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 font-medium tracking-wide whitespace-nowrap transition ${
              currentTab === 'tool_library'
                ? 'border-amber-400 text-amber-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>{t('tabToolLibrary')}</span>
          </button>

          {/* Tab 4: Material Manager (Persistent Storage) */}
          <button
            onClick={() => onTabChange('material_manager')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 font-medium tracking-wide whitespace-nowrap transition ${
              currentTab === 'material_manager'
                ? 'border-amber-400 text-amber-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>{t('tabMaterialManager')}</span>
          </button>

          {/* Tab 4: Safety Audit */}
          <button
            onClick={() => onTabChange('safety_audit')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 font-medium tracking-wide whitespace-nowrap transition ${
              currentTab === 'safety_audit'
                ? 'border-emerald-400 text-emerald-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t('tabSafety')}</span>
          </button>

          {/* Tab 4: Speeds & Feeds */}
          <button
            onClick={() => onTabChange('feeds_speeds')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 font-medium tracking-wide whitespace-nowrap transition ${
              currentTab === 'feeds_speeds'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>{t('tabFeeds')}</span>
          </button>

          {/* Tab 5: Swiss Guide Bushing */}
          <button
            onClick={() => onTabChange('swiss_setup')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 font-medium tracking-wide whitespace-nowrap transition ${
              currentTab === 'swiss_setup'
                ? 'border-purple-400 text-purple-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <Wrench className="w-4 h-4 text-purple-400" />
            <span>{t('tabSwiss')}</span>
          </button>

          {/* Tab 6: Fanuc Alarms */}
          <button
            onClick={() => onTabChange('alarms')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 font-medium tracking-wide whitespace-nowrap transition ${
              currentTab === 'alarms'
                ? 'border-rose-400 text-rose-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <Terminal className="w-4 h-4 text-rose-400" />
            <span>{t('tabAlarms')}</span>
          </button>

          {/* Tab 7: Vision & JSON */}
          <button
            onClick={() => onTabChange('vision_parser')}
            className={`px-4 py-2.5 flex items-center gap-2 border-b-2 font-medium tracking-wide whitespace-nowrap transition ${
              currentTab === 'vision_parser'
                ? 'border-sky-400 text-sky-300 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            <Scan className="w-4 h-4 text-sky-400" />
            <span>JSON OCR</span>
          </button>
        </div>
      </div>
    </header>
  );
};
