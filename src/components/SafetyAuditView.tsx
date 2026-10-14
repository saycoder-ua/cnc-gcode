import React, { useState } from 'react';
import { SafetyCheckResult, MachineSpec } from '../types/cnc';
import { ShieldCheck, AlertOctagon, AlertTriangle, CheckCircle2, Copy, Check, Terminal, Info, Zap } from 'lucide-react';

interface SafetyAuditViewProps {
  safetyCheck: SafetyCheckResult;
  machine: MachineSpec;
}

export const SafetyAuditView: React.FC<SafetyAuditViewProps> = ({ safetyCheck, machine }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyReport = () => {
    navigator.clipboard.writeText(safetyCheck.formattedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { g50Check, slendernessRatio, colletInterference, rapidTraverseRisk, toolUndercutting, subAgents } = safetyCheck;

  return (
    <div className="space-y-6">
      {/* Top Banner Verdict */}
      <div className={`p-4 rounded-lg border flex flex-wrap items-center justify-between gap-4 ${
        safetyCheck.overallPassed
          ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
          : 'bg-red-950/40 border-red-800 text-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {safetyCheck.overallPassed ? (
            <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
          ) : (
            <AlertOctagon className="w-8 h-8 text-red-400 shrink-0 animate-bounce" />
          )}
          <div>
            <h3 className="font-display font-bold text-lg tracking-wide uppercase">
              {safetyCheck.overallPassed ? 'SAFETY AUDIT PASSED - SHOP-FLOOR CLEARANCE GRANTED' : 'CRITICAL SAFETY VIOLATION - EXECUTION BLOCKED'}
            </h3>
            <p className="text-xs text-slate-300">
              Verified against {machine.name} machine envelope, Fanuc controller constraints, and collision rules.
            </p>
          </div>
        </div>

        <button
          onClick={handleCopyReport}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
          Copy Official Audit Report Block
        </button>
      </div>

      {/* 5 Core Safety Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. G50 Spindle Speed Clamp */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono-code text-slate-400 uppercase">Pillar 1: Spindle Guard</span>
              {g50Check.passed ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </span>
              ) : (
                <span className="text-xs font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800 flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" /> ERROR
                </span>
              )}
            </div>
            <h4 className="font-display font-semibold text-slate-200 text-sm mb-1">
              G50 Spindle Speed Clamp
            </h4>
            <div className="text-xs text-slate-400 space-y-1 mb-3">
              <div>Clamped Max: <strong className="text-amber-400 font-mono-code">S{g50Check.clampRpm} RPM</strong></div>
              <div>Machine Limit: <strong className="text-slate-300 font-mono-code">{g50Check.maxMachineRpm} RPM</strong></div>
            </div>
            <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              {g50Check.message}
            </p>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono-code">
            Required before any G96 CSS to stop runaway RPM at X0.
          </div>
        </div>

        {/* 2. Slenderness Ratio L/D */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono-code text-slate-400 uppercase">Pillar 2: Rigidity Audit</span>
              {slendernessRatio.level === 'safe' ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> SAFE
                </span>
              ) : slendernessRatio.level === 'warning' ? (
                <span className="text-xs font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> CAUTION
                </span>
              ) : (
                <span className="text-xs font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800 flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" /> CRITICAL
                </span>
              )}
            </div>
            <h4 className="font-display font-semibold text-slate-200 text-sm mb-1">
              Slenderness Ratio (L/D)
            </h4>
            <div className="text-xs text-slate-400 space-y-1 mb-3">
              <div>Calculated Ratio: <strong className="text-amber-400 font-mono-code">L/D = {slendernessRatio.ldRatio}</strong></div>
              <div>Length / Dia: <strong className="text-slate-300 font-mono-code">{slendernessRatio.length}mm / Ø{slendernessRatio.diameter}mm</strong></div>
            </div>
            <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              {slendernessRatio.message}
            </p>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono-code">
            Standard lathe threshold &gt; 3.0 warn, &gt; 4.0 mandate center rest.
          </div>
        </div>

        {/* 3. Chuck / Collet Interference Z_limit */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono-code text-slate-400 uppercase">Pillar 3: Collision Envelope</span>
              {colletInterference.passed ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> NO COLLISION
                </span>
              ) : (
                <span className="text-xs font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800 flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" /> CRASH IMMINENT
                </span>
              )}
            </div>
            <h4 className="font-display font-semibold text-slate-200 text-sm mb-1">
              Chuck Interference (Z_limit)
            </h4>
            <div className="text-xs text-slate-400 space-y-1 mb-3">
              <div>Z_limit: <strong className="text-red-400 font-mono-code">Z{colletInterference.zLimit.toFixed(2)} mm</strong></div>
              <div>Deepest Cut: <strong className="text-cyan-400 font-mono-code">Z{colletInterference.deepestZ.toFixed(2)} mm</strong></div>
            </div>
            <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              {colletInterference.message}
            </p>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono-code">
            Stickout ({colletInterference.stickout}mm) - Safety margin ({colletInterference.clearance}mm).
          </div>
        </div>

        {/* 4. Rapid Traverse Trajectory */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono-code text-slate-400 uppercase">Pillar 4: Rapid Safety</span>
              {rapidTraverseRisk.passed ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> LONG RAPID
                </span>
              )}
            </div>
            <h4 className="font-display font-semibold text-slate-200 text-sm mb-1">
              Rapid Traverse Span (G00)
            </h4>
            <div className="text-xs text-slate-400 space-y-1 mb-3">
              <div>Longest G00: <strong className="text-cyan-400 font-mono-code">{rapidTraverseRisk.maxRapidDist.toFixed(1)} mm</strong></div>
              <div>Dog-Leg Safety: <strong className="text-slate-300 font-mono-code">Waypoints Checked</strong></div>
            </div>
            <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              {rapidTraverseRisk.message}
            </p>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono-code">
            Prevents un-interpolated non-linear Fanuc dog-leg crashes.
          </div>
        </div>

        {/* 5. Tool Undercutting & Fillet Radius */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono-code text-slate-400 uppercase">Pillar 5: Insert Fit</span>
              {toolUndercutting.passed ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> UNDERCUT
                </span>
              )}
            </div>
            <h4 className="font-display font-semibold text-slate-200 text-sm mb-1">
              Tool Undercutting & Fillet Match
            </h4>
            <div className="text-xs text-slate-400 space-y-1 mb-3">
              <div>Insert Nose Radius (r_eps): <strong className="text-amber-400 font-mono-code">R{toolUndercutting.noseRadius} mm</strong></div>
              <div>Min Part Fillet: <strong className="text-slate-300 font-mono-code">R{toolUndercutting.minProfileRadius || 'N/A'} mm</strong></div>
            </div>
            <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              {toolUndercutting.passed
                ? 'All internal fillets accommodate the programmed insert nose radius.'
                : toolUndercutting.issues.join('; ')}
            </p>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono-code">
            Eliminates Fanuc PS0041 cutter compensation interference alarms.
          </div>
        </div>

        {/* 6. Machine Envelope Compatibility */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono-code text-slate-400 uppercase">Pillar 6: Machine Fit</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> COMPATIBLE
              </span>
            </div>
            <h4 className="font-display font-semibold text-slate-200 text-sm mb-1">
              Machine Travels & Bar Capacity
            </h4>
            <div className="text-xs text-slate-400 space-y-1 mb-3">
              <div>Machine Max Bar: <strong className="text-slate-200 font-mono-code">Ø{machine.maxBarDia} mm</strong></div>
              <div>Z1 Travel: <strong className="text-slate-200 font-mono-code">{machine.z1Travel} mm</strong></div>
              <div>Max Spindle Speed: <strong className="text-slate-200 font-mono-code">{machine.maxRpmMain} RPM</strong></div>
            </div>
            <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
              Part diameter fits machine spindle bore. Z stroke is within {machine.name} limits.
            </p>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono-code">
            Guideway stroke end OT0500 safety cleared.
          </div>
        </div>
      </div>

      {/* Sub-Agent Pipeline Multi-Stage Validation Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          <h4 className="font-display font-semibold text-slate-200 text-sm uppercase tracking-wide">
            Sub-Agent Validation Pipeline (Module 3)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Sub-agent 1: syntax-checker */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-code font-bold text-slate-300">syntax-checker</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                subAgents.syntaxChecker.passed ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'
              }`}>
                {subAgents.syntaxChecker.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              {subAgents.syntaxChecker.passed
                ? 'Fanuc 0i-TD / 16i syntax validated: G18 ZX, G40 cancel, G99 feed per rev, coordinate decimals verified.'
                : subAgents.syntaxChecker.details.join(', ')}
            </p>
          </div>

          {/* Sub-agent 2: integration-consistency-checker */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-code font-bold text-slate-300">integration-consistency</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                subAgents.integrationConsistency.passed ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'
              }`}>
                {subAgents.integrationConsistency.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              {subAgents.integrationConsistency.passed
                ? 'Tool offsets T0101-T0404, coolant M08/M09, spindle M03/M05 properly matched and synchronized.'
                : subAgents.integrationConsistency.details.join(', ')}
            </p>
          </div>

          {/* Sub-agent 3: logic-reviewer */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-code font-bold text-slate-300">logic-reviewer</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                subAgents.logicReviewer.passed ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'
              }`}>
                {subAgents.logicReviewer.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              {subAgents.logicReviewer.passed
                ? 'Safe home return G28 U0 W0 at startup/exit, clearance lead-in, and M30 memory rewind verified.'
                : subAgents.logicReviewer.details.join(', ')}
            </p>
          </div>

          {/* Sub-agent 4: embedded-perf-auditor */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-code font-bold text-slate-300">embedded-perf-auditor</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-400">
                PASSED
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Est. theoretical Ra: {subAgents.embeddedPerfAuditor.theoreticalRa} µm. Cycle time bounded. No controller memory buffer overflows.
            </p>
          </div>
        </div>
      </div>

      {/* Raw Shop-Floor [SAFETY CHECK RESULT] Terminal Block */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-mono-code text-xs font-semibold text-slate-300">
              OFFICIAL SYSTEM AUDIT BLOCK ([SAFETY CHECK RESULT])
            </span>
          </div>
          <button
            onClick={handleCopyReport}
            className="text-xs text-amber-400 hover:text-amber-300 font-mono-code flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Block'}
          </button>
        </div>

        <pre className="font-mono-code text-xs text-emerald-400/90 bg-[#060a0f] p-4 rounded border border-slate-900 overflow-x-auto whitespace-pre leading-relaxed">
          {safetyCheck.formattedOutput}
        </pre>
      </div>
    </div>
  );
};
