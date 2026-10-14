import React, { useState } from 'react';
import { FANUC_ALARMS } from '../data/alarms';
import { FanucAlarm } from '../types/cnc';
import { Search, AlertTriangle, ShieldAlert, Cpu, Wrench, CheckCircle2, ChevronDown, ChevronUp, BatteryCharging, Zap } from 'lucide-react';

export const AlarmDiagnosticsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState<string>('ALL');
  const [expandedAlarm, setExpandedAlarm] = useState<string | null>('SV0410');

  const filteredAlarms = FANUC_ALARMS.filter((a) => {
    const matchesPrefix = selectedPrefix === 'ALL' || a.prefix === selectedPrefix;
    const matchesSearch =
      a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPrefix && matchesSearch;
  });

  const prefixes = ['ALL', 'SV', 'EX', 'PS', 'OT'];

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h3 className="font-display font-bold text-slate-100 text-base">
                FANUC ALARM DIAGNOSTICS & TROUBLESHOOTING (SECTION 7)
              </h3>
              <p className="text-xs text-slate-400">
                Instant shop-floor diagnostics for Fanuc 0i-TD, 16i, 30i, 31i-B (PS, SV, SP, OT, OH, EX).
              </p>
            </div>
          </div>

          {/* Quick Battery Swap Guide Button */}
          <button
            onClick={() => {
              setSearchTerm('SV0410');
              setExpandedAlarm('SV0410');
            }}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded text-xs font-mono-code flex items-center gap-2 transition"
          >
            <BatteryCharging className="w-4 h-4" />
            SV0410 / SV0411 Battery & P1815.4 Guide
          </button>
        </div>

        {/* Filter Pills & Search Input */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by alarm code (e.g. SV0410, EX1001, PS0030) or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 font-mono-code"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {prefixes.map((pref) => (
              <button
                key={pref}
                onClick={() => setSelectedPrefix(pref)}
                className={`px-3 py-1 rounded text-xs font-mono-code font-bold transition ${
                  selectedPrefix === pref
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {pref}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Battery Recovery Guide Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-700/60 rounded-lg p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <Zap className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-display font-bold text-amber-300 text-sm tracking-wide">
              STANDARDIZED SHOP PROCEDURE: SV0410 / SV0411 ENCODER ZERO RECOVERY
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              When lithium cell <strong className="text-amber-200 font-mono-code">CR17450SE-R (3.6V)</strong> dies, the Fanuc absolute pulse coder reverts <strong className="text-amber-200 font-mono-code">P1815.4 (APZ)</strong> to 0. 
              Do not panic. Follow the 6-step recovery procedure: (1) Replace cell with control ON if warning SV0411, or power down if zero SV0410; (2) In MDI SETTING set <strong className="text-cyan-300 font-mono-code">PWE=1</strong>; (3) Jog to physical zero mark; (4) Set <strong className="text-cyan-300 font-mono-code">P1815.4 (APZ)=1</strong>; (5) Power cycle CNC completely; (6) Set PWE=0 and verify with G28 U0 W0.
            </p>
          </div>
        </div>
      </div>

      {/* Alarms Accordion List */}
      <div className="space-y-3">
        {filteredAlarms.map((alarm) => {
          const isExpanded = expandedAlarm === alarm.code;
          return (
            <div
              key={alarm.code}
              className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-md transition"
            >
              {/* Header Bar */}
              <button
                onClick={() => setExpandedAlarm(isExpanded ? null : alarm.code)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-xs font-mono-code font-bold ${
                    alarm.prefix === 'SV'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : alarm.prefix === 'EX'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : alarm.prefix === 'PS'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800'
                      : 'bg-purple-950 text-purple-300 border border-purple-800'
                  }`}>
                    {alarm.code}
                  </span>
                  <div>
                    <span className="font-display font-semibold text-slate-200 text-sm block">
                      {alarm.title}
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-1">
                      {alarm.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    alarm.severity === 'critical_stop'
                      ? 'bg-red-950 text-red-400 border border-red-800'
                      : alarm.severity === 'warning'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {alarm.severity.replace('_', ' ')}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Diagnostic Workflow Details */}
              {isExpanded && (
                <div className="px-5 py-4 bg-slate-950/70 border-t border-slate-800/80 text-xs space-y-4">
                  <div>
                    <h5 className="font-semibold text-slate-300 text-xs uppercase tracking-wide mb-1">
                      Detailed Cause Analysis
                    </h5>
                    <ul className="list-disc pl-5 space-y-1 text-slate-400">
                      {alarm.probableCauses.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-amber-400 text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" />
                      Step-by-Step Shop-Floor Remedy Procedure
                    </h5>
                    <div className="space-y-1.5 pl-2 border-l-2 border-amber-500/60 mt-2">
                      {alarm.remedySteps.map((step, sIdx) => (
                        <div key={sIdx} className="text-slate-300 flex items-start gap-2">
                          <span className="font-mono-code text-amber-400 font-bold shrink-0">
                            {sIdx + 1}.
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {alarm.parametersToCheck && (
                    <div className="bg-slate-900 p-3 rounded border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Fanuc CNC Parameters to Inspect:</span>
                      <div className="flex gap-2">
                        {alarm.parametersToCheck.map((param, pIdx) => (
                          <span
                            key={pIdx}
                            className="bg-slate-950 text-cyan-300 font-mono-code px-2 py-0.5 rounded border border-slate-700 text-xs font-semibold"
                          >
                            {param}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {alarm.machineApplicability && (
                    <div className="text-[11px] text-slate-500 font-mono-code">
                      Verified Controllers: {alarm.machineApplicability}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredAlarms.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            No Fanuc alarms matched "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
};
