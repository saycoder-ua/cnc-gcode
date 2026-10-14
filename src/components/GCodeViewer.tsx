import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SafetyCheckResult } from '../types/cnc';

interface GCodeViewerProps {
  code: string;
  partName: string;
  safetyCheck: SafetyCheckResult;
  onCodeChange?: (newCode: string) => void;
  activeLineIndex?: number;
  activeCodeLine?: string;
  onSelectLine?: (lineIdx: number) => void;
}

export const GCodeViewer: React.FC<GCodeViewerProps> = ({
  code,
  partName,
  safetyCheck,
  onCodeChange,
  activeLineIndex,
  activeCodeLine,
  onSelectLine
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'NC' | 'TXT'>('NC');
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  const activeLineRef = React.useRef<HTMLDivElement | null>(null);

  // Sync if code changes externally
  React.useEffect(() => {
    setEditedCode(code);
  }, [code]);

  // Auto-scroll to active line during animation simulation
  React.useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeLineIndex, activeCodeLine]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    // Extract program number if present (e.g. O0001)
    const progMatch = code.match(/O(\d+)/i);
    const progPrefix = progMatch ? `O${progMatch[1]}_` : '';
    const safeName = partName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${progPrefix}${safeName}.${downloadFormat}`;

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(downloadFormat);
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const lines = React.useMemo(() => code.split('\n'), [code]);

  // Syntax highlighting helper with memoized tokenization
  const renderedLines = React.useMemo(() => {
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('(') || trimmed.startsWith(';')) {
        return <span key={index} className="text-slate-500 italic">{line}</span>;
      }
      if (trimmed.startsWith('%') || trimmed.startsWith('O')) {
        return <span key={index} className="text-amber-400 font-bold">{line}</span>;
      }

      const parts = line.split(/(\s+|\(|\))/);
      let inComment = false;

      return (
        <span key={index}>
          {parts.map((part, pIdx) => {
            if (part === '(') {
              inComment = true;
              return <span key={pIdx} className="text-slate-500 italic">(</span>;
            }
            if (part === ')') {
              inComment = false;
              return <span key={pIdx} className="text-slate-500 italic">)</span>;
            }
            if (inComment) {
              return <span key={pIdx} className="text-slate-500 italic">{part}</span>;
            }

            if (/^N\d+/.test(part)) {
              return <span key={pIdx} className="text-slate-600 font-mono-code">{part}</span>;
            }
            if (/^G(0[0-3]|[0-3])\b/.test(part)) {
              return <span key={pIdx} className="text-sky-400 font-bold">{part}</span>;
            }
            if (/^G(50|96|97|99|18|40|41|42|71|70|76|74|84)\b/.test(part)) {
              return <span key={pIdx} className="text-amber-300 font-bold">{part}</span>;
            }
            if (/^M\d+/.test(part)) {
              return <span key={pIdx} className="text-emerald-400 font-semibold">{part}</span>;
            }
            if (/^[XZ]-?\d+/.test(part)) {
              return <span key={pIdx} className="text-cyan-300">{part}</span>;
            }
            if (/^[SF]-?\d+/.test(part)) {
              return <span key={pIdx} className="text-purple-300 font-semibold">{part}</span>;
            }
            if (/^T\d+/.test(part)) {
              return <span key={pIdx} className="text-orange-400 font-semibold">{part}</span>;
            }
            return <span key={pIdx} className="text-slate-300">{part}</span>;
          })}
        </span>
      );
    });
  }, [lines]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg flex flex-col h-full shadow-xl">
      {/* G-Code Header Bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-amber-400" />
          <span className="font-display font-semibold text-slate-200 text-sm">
            FANUC NC PROGRAM
          </span>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono-code">
            {lines.length} BLOCKS
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Safety Status Pill */}
          {safetyCheck.overallPassed ? (
            <span className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-full font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              VERIFIED
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1.5 text-xs bg-red-950 text-red-400 border border-red-800 px-2.5 py-1 rounded-full font-semibold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              ISSUES FOUND
            </span>
          )}

          {/* Edit Mode Toggle */}
          <button
            onClick={() => {
              if (isEditing && onCodeChange) {
                onCodeChange(editedCode);
              }
              setIsEditing(!isEditing);
            }}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 transition"
          >
            {isEditing ? 'Save & Highlight' : 'Edit G-Code'}
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 border border-slate-700 transition"
            title="Copy program to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          {/* Format Selector Pills */}
          <div className="flex items-center bg-slate-900 rounded border border-slate-700 p-0.5 text-xs font-mono-code">
            <button
              onClick={() => setDownloadFormat('NC')}
              className={`px-2 py-0.5 rounded transition ${
                downloadFormat === 'NC'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Standard CNC tape format (.NC)"
            >
              .NC
            </button>
            <button
              onClick={() => setDownloadFormat('TXT')}
              className={`px-2 py-0.5 rounded transition ${
                downloadFormat === 'TXT'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Plain text document (.TXT)"
            >
              .TXT
            </button>
          </div>

          {/* Dedicated Download G-Code Button */}
          <button
            onClick={handleDownload}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5 shadow-md transition"
            title={`Download G-Code program as .${downloadFormat} file`}
          >
            {downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-slate-950" />
                <span>Downloaded .{downloadSuccess}!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download G-Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="flex-1 p-4 overflow-y-auto max-h-[580px] bg-[#0c1017]">
        {isEditing ? (
          <textarea
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            className="w-full h-full min-h-[480px] bg-transparent text-emerald-300 font-mono-code text-xs leading-relaxed outline-none resize-none border border-slate-800 p-2 rounded focus:border-amber-500"
            spellCheck={false}
          />
        ) : (
          <div className="font-mono-code text-xs leading-relaxed select-text">
            {lines.map((line, idx) => {
              const trimmedLine = line.trim();
              const isMatchByLineIndex = activeLineIndex !== undefined && activeLineIndex === idx;
              const isMatchByCode = Boolean(
                activeCodeLine && 
                trimmedLine.length > 0 && 
                !trimmedLine.startsWith('(') &&
                !trimmedLine.startsWith(';') &&
                (trimmedLine === activeCodeLine.trim() || trimmedLine.includes(activeCodeLine.trim()))
              );
              const isActive = isMatchByLineIndex || (activeLineIndex === undefined && isMatchByCode);

              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : undefined}
                  onClick={() => onSelectLine?.(idx)}
                  className={`flex items-center px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-200 border-l-4 border-amber-400 font-semibold shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <span className={`w-10 text-right pr-3 select-none shrink-0 flex items-center justify-end gap-1 ${
                    isActive ? 'text-amber-400 font-bold' : 'text-slate-600'
                  }`}>
                    {isActive && <span className="text-amber-400 animate-pulse text-[10px]">▶</span>}
                    <span>{idx + 1}</span>
                  </span>
                  <span className="flex-1 whitespace-pre">{renderedLines[idx]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center font-mono-code">
        <span>Dialect: Fanuc Series 0i / 16i / 30i / 31i-B</span>
        <span>Download: .{downloadFormat} format selected</span>
      </div>
    </div>
  );
};
