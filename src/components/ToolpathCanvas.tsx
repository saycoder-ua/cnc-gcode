import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { DrawingData, ToolpathSegment } from '../types/cnc';
import { useLanguage } from '../context/LanguageContext';
import { interpolateArcPoint, generateArcPoints } from '../utils/latheGeometry';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2,
  SkipForward, 
  SkipBack,
  SlidersHorizontal,
  Layers,
  Ruler,
  Eye,
  EyeOff,
  Sparkles,
  AlertOctagon,
  ChevronsRight,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  X
} from 'lucide-react';

interface ToolpathCanvasProps {
  drawing: DrawingData;
  segments: ToolpathSegment[];
  stickout: number;
  highlightedLine?: number;
  onActiveStepChange?: (segment: ToolpathSegment | null, stepIndex: number) => void;
  operations?: {
    name: string;
    startStep: number;
    endStep: number;
    toolNumber: string;
    type: string;
  }[];
}

interface MeasurePoint {
  z: number;
  xDia: number;
  canvasX: number;
  canvasY: number;
}

export const ToolpathCanvas: React.FC<ToolpathCanvasProps> = ({
  drawing,
  segments,
  stickout,
  highlightedLine,
  onActiveStepChange,
  operations
}) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Animation Controller States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [subProgress, setSubProgress] = useState<number>(0); // 0.0 to 1.0 along current segment
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [singleBlockMode, setSingleBlockMode] = useState<boolean>(false);
  
  // Viewport navigation states
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cursorCoord, setCursorCoord] = useState<{ xDia: number; zPos: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Layer Visibility Toggles
  const [showRapids, setShowRapids] = useState<boolean>(true);
  const [showStock, setShowStock] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showToolBody, setShowToolBody] = useState<boolean>(true);
  const [showMirror, setShowMirror] = useState<boolean>(true);
  const [showSparks, setShowSparks] = useState<boolean>(true);

  // Digital Caliper / Measure Mode
  const [measureMode, setMeasureMode] = useState<boolean>(false);
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);

  // Hovered segment for inspector
  const [hoveredSegmentIdx, setHoveredSegmentIdx] = useState<number | null>(null);

  // Keyboard shortcut modal helper
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const barDia = drawing.workpiece.diameter_or_width_mm;
  const partLength = drawing.workpiece.length_mm;

  // Refs for rAF loop synchronization
  const currentStepRef = useRef<number>(currentStep);
  currentStepRef.current = currentStep;
  const subProgressRef = useRef<number>(subProgress);
  subProgressRef.current = subProgress;
  const singleBlockModeRef = useRef<boolean>(singleBlockMode);
  singleBlockModeRef.current = singleBlockMode;
  const playbackSpeedRef = useRef<number>(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;
  const segmentsRef = useRef<ToolpathSegment[]>(segments);
  segmentsRef.current = segments;

  // Derive detected operations if not provided from external parser
  const detectedOperations = useMemo(() => {
    if (operations && operations.length > 0) return operations;
    if (segments.length === 0) return [];

    const list: { name: string; startStep: number; endStep: number; toolNumber: string; type: string }[] = [];
    let currentOp = 'Facing & Lead';
    let startIdx = 0;
    let lastTool = segments[0]?.toolNumber || 'T0101';

    segments.forEach((seg, idx) => {
      let isNew = false;
      let newName = currentOp;

      if (seg.codeLine.includes('G71') || seg.codeLine.toLowerCase().includes('rough')) {
        newName = 'Roughing (G71)';
        isNew = true;
      } else if (seg.codeLine.includes('G70') || seg.codeLine.toLowerCase().includes('finish')) {
        newName = 'Finishing (G70)';
        isNew = true;
      } else if (seg.type === 'thread' || seg.codeLine.includes('G76')) {
        newName = 'Threading (G76)';
        isNew = true;
      } else if (seg.codeLine.toLowerCase().includes('groov')) {
        newName = 'Grooving';
        isNew = true;
      } else if (seg.codeLine.toLowerCase().includes('part') || idx === segments.length - 4) {
        newName = 'Parting-Off';
        isNew = true;
      } else if (seg.toolNumber !== lastTool) {
        newName = `Tool ${seg.toolNumber}`;
        isNew = true;
      }

      if (isNew && idx > startIdx) {
        list.push({
          name: currentOp,
          startStep: startIdx,
          endStep: idx - 1,
          toolNumber: lastTool,
          type: currentOp.toLowerCase()
        });
        currentOp = newName;
        startIdx = idx;
        lastTool = seg.toolNumber;
      }
    });

    list.push({
      name: currentOp,
      startStep: startIdx,
      endStep: segments.length - 1,
      toolNumber: lastTool,
      type: currentOp.toLowerCase()
    });

    return list;
  }, [operations, segments]);

  // Reset simulation when program segments change
  useEffect(() => {
    setCurrentStep(0);
    currentStepRef.current = 0;
    setSubProgress(0);
    subProgressRef.current = 0;
    setIsPlaying(false);
  }, [segments]);

  // Jump to segment if external highlightedLine changes
  useEffect(() => {
    if (highlightedLine !== undefined && highlightedLine >= 0 && segments.length > 0) {
      const matchIdx = segments.findIndex(
        (s) => s.lineNumber === highlightedLine || s.gcodeLineIndex === highlightedLine
      );
      if (matchIdx !== -1) {
        setIsPlaying(false);
        setCurrentStep(matchIdx);
        currentStepRef.current = matchIdx;
        setSubProgress(0);
        subProgressRef.current = 0;
      }
    }
  }, [highlightedLine, segments]);

  // Notify parent of active G-Code block
  useEffect(() => {
    if (segments.length > 0 && currentStep < segments.length) {
      onActiveStepChange?.(segments[currentStep], currentStep);
    } else {
      onActiveStepChange?.(null, -1);
    }
  }, [currentStep, segments, onActiveStepChange]);

  // High-performance requestAnimationFrame sub-segment animation loop
  useEffect(() => {
    if (!isPlaying) return;
    if (segments.length === 0) {
      setIsPlaying(false);
      return;
    }

    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const deltaSec = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      const activeSeg = segmentsRef.current[currentStepRef.current];
      const isRapid = activeSeg?.type === 'rapid';
      const baseDurationSec = isRapid 
        ? Math.max(0.04, 0.20 / playbackSpeedRef.current) 
        : Math.max(0.06, 0.45 / playbackSpeedRef.current);
      const stepIncrement = deltaSec / baseDurationSec;

      const nextProgress = subProgressRef.current + stepIncrement;

      if (nextProgress >= 1.0) {
        if (singleBlockModeRef.current) {
          subProgressRef.current = 1.0;
          setSubProgress(1.0);
          setIsPlaying(false);
          return;
        }

        const nextStep = currentStepRef.current + 1;
        if (nextStep >= segmentsRef.current.length) {
          subProgressRef.current = 1.0;
          setSubProgress(1.0);
          setIsPlaying(false);
          return;
        } else {
          currentStepRef.current = nextStep;
          subProgressRef.current = 0.0;
          setCurrentStep(nextStep);
          setSubProgress(0.0);
        }
      } else {
        subProgressRef.current = nextProgress;
        setSubProgress(nextProgress);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, segments.length]);

  const handleTogglePlay = () => {
    if (!isPlaying) {
      if (currentStep >= segments.length - 1) {
        setCurrentStep(0);
        currentStepRef.current = 0;
        setSubProgress(0);
        subProgressRef.current = 0;
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setSubProgress(0);
    subProgressRef.current = 0;
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, segments.length - 1);
      currentStepRef.current = next;
      return next;
    });
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setSubProgress(0);
    subProgressRef.current = 0;
    setCurrentStep((prev) => {
      const next = Math.max(prev - 1, 0);
      currentStepRef.current = next;
      return next;
    });
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    currentStepRef.current = 0;
    setSubProgress(0);
    subProgressRef.current = 0;
  };

  const handleJumpToEnd = () => {
    setIsPlaying(false);
    if (segments.length > 0) {
      const last = segments.length - 1;
      setCurrentStep(last);
      currentStepRef.current = last;
      setSubProgress(1.0);
      subProgressRef.current = 1.0;
    }
  };

  const handleJumpToOperation = (opStartStep: number) => {
    setIsPlaying(false);
    setSubProgress(0);
    subProgressRef.current = 0;
    const clamped = Math.max(0, Math.min(opStartStep, segments.length - 1));
    setCurrentStep(clamped);
    currentStepRef.current = clamped;
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStepForward();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStepBack();
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        e.preventDefault();
        fitView();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'End') {
        e.preventDefault();
        handleJumpToEnd();
      } else if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        if (measureMode) {
          setMeasureMode(false);
          setMeasurePoints([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [segments.length, isPlaying, currentStep, isFullscreen, measureMode]);

  // Main Canvas Rendering Routine with HiDPI support & Arc geometry
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Save and reset transform to DPR scale
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Dark industrial CNC monitor background
    ctx.fillStyle = '#070b11';
    ctx.fillRect(0, 0, width, height);

    // Lathe coordinate system: Z horizontal, X (diameter) vertical
    const originX = width * 0.65 + pan.x;
    const originY = height * 0.5 + pan.y;

    const baseScale = Math.min(width / (partLength + 50), height / (Math.max(1, barDia) * 3.5)) * 1.3;
    const scale = baseScale * zoom;

    const toCanvasX = (z: number) => originX + (z * scale);
    const toCanvasY = (xDia: number) => originY - ((xDia / 2) * scale);
    const toCanvasYMirror = (xDia: number) => originY + ((xDia / 2) * scale);

    // 1. Grid Lines & Axis Graduations
    if (showGrid) {
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1;
      const gridStepMm = barDia > 20 ? 5 : (barDia > 8 ? 2 : 1);
      
      // Vertical Z grid
      const zMin = -(partLength + 40);
      for (let z = 10; z >= zMin; z -= gridStepMm) {
        const cx = toCanvasX(z);
        if (cx < -50 || cx > width + 50) continue;

        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, height);
        ctx.stroke();

        if (z % (gridStepMm * 5) === 0) {
          ctx.fillStyle = '#475569';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText(`Z${z}`, cx + 2, height - 8);
        }
      }

      // Horizontal X grid
      const xMax = barDia * 1.6;
      for (let x = -xMax; x <= xMax; x += gridStepMm * 2) {
        const cy = toCanvasY(x);
        if (cy < -50 || cy > height + 50) continue;

        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
        ctx.stroke();

        if (x !== 0 && x % (gridStepMm * 4) === 0) {
          ctx.fillStyle = '#334155';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(`Ø${Math.abs(x)}`, 6, cy - 2);
        }
      }
    }

    // 2. Lathe Centerline (CL / X0.0)
    ctx.strokeStyle = '#38bdf8';
    ctx.setLineDash([8, 4, 2, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText('CL (X0.0)', originX + 25, originY - 6);

    // 3. Z0 Face Reference Line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    ctx.fillStyle = '#22c55e';
    ctx.fillText('Z0.0 (FACE)', originX + 6, 20);

    // 4. Collet / Guide Bushing Chuck Body & Interference Zone
    const colletX = toCanvasX(-stickout);
    
    // Draw guide bushing collet taper sleeve graphic
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, Math.max(0, colletX), height);

    ctx.fillStyle = '#334155';
    // Collet nose angle
    ctx.beginPath();
    ctx.moveTo(colletX, originY - (barDia * 1.8 * scale));
    ctx.lineTo(colletX, originY + (barDia * 1.8 * scale));
    ctx.lineTo(colletX - 18, originY + (barDia * 2.2 * scale));
    ctx.lineTo(0, originY + (barDia * 2.2 * scale));
    ctx.lineTo(0, originY - (barDia * 2.2 * scale));
    ctx.lineTo(colletX - 18, originY - (barDia * 2.2 * scale));
    ctx.closePath();
    ctx.fill();

    // Red warning danger border on chuck face
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(colletX, 0);
    ctx.lineTo(colletX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(`CHUCK / GB FACE (Z-${stickout.toFixed(1)})`, colletX - 180, 24);

    // 5. Raw Bar Stock Boundary & Envelope
    if (showStock) {
      const rawStartX = toCanvasX(0.5);
      const rawEndX = toCanvasX(-stickout);
      const rawYTop = toCanvasY(barDia);
      const rawYBottom = toCanvasYMirror(barDia);
      const rawHeight = rawYBottom - rawYTop;

      // Transparent cylindrical stock shader
      const stockGrad = ctx.createLinearGradient(0, rawYTop, 0, rawYBottom);
      stockGrad.addColorStop(0, 'rgba(71, 85, 105, 0.22)');
      stockGrad.addColorStop(0.5, 'rgba(148, 163, 184, 0.08)');
      stockGrad.addColorStop(1, 'rgba(71, 85, 105, 0.22)');

      ctx.fillStyle = stockGrad;
      ctx.fillRect(rawEndX, rawYTop, rawStartX - rawEndX, rawHeight);

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(rawEndX, rawYTop, rawStartX - rawEndX, rawHeight);
      ctx.setLineDash([]);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`RAW STOCK Ø${barDia}mm`, rawEndX + 8, rawYTop - 6);
    }

    // 6. Finished Part Blueprint Contour Profile
    const points = drawing.contour_points;
    if (points.length > 1) {
      // Top Half Finished Contour
      ctx.beginPath();
      const firstPt = points[0];
      ctx.moveTo(toCanvasX(firstPt.z_coordinate), toCanvasY(firstPt.x_diameter));

      for (let i = 1; i < points.length; i++) {
        const pt = points[i];
        ctx.lineTo(toCanvasX(pt.z_coordinate), toCanvasY(pt.x_diameter));
      }

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Mirrored Bottom Half (if enabled)
      if (showMirror) {
        ctx.beginPath();
        ctx.moveTo(toCanvasX(firstPt.z_coordinate), toCanvasYMirror(firstPt.x_diameter));

        for (let i = 1; i < points.length; i++) {
          const pt = points[i];
          ctx.lineTo(toCanvasX(pt.z_coordinate), toCanvasYMirror(pt.x_diameter));
        }
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Part Body Fill
        ctx.beginPath();
        ctx.moveTo(toCanvasX(firstPt.z_coordinate), toCanvasY(firstPt.x_diameter));
        for (let i = 1; i < points.length; i++) {
          const pt = points[i];
          ctx.lineTo(toCanvasX(pt.z_coordinate), toCanvasY(pt.x_diameter));
        }
        const lastPt = points[points.length - 1];
        ctx.lineTo(toCanvasX(lastPt.z_coordinate), toCanvasYMirror(lastPt.x_diameter));
        for (let i = points.length - 1; i >= 0; i--) {
          const pt = points[i];
          ctx.lineTo(toCanvasX(pt.z_coordinate), toCanvasYMirror(pt.x_diameter));
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.fill();
      }
    }

    // 7. Render Completed Past Segments (with True Arc Curvature!)
    for (let i = 0; i < currentStep; i++) {
      const seg = segments[i];
      if (seg.type === 'rapid' && !showRapids) continue;

      const isHovered = hoveredSegmentIdx === i;

      if (seg.type === 'arc_cw' || seg.type === 'arc_ccw') {
        const isCw = seg.type === 'arc_cw';
        const r = seg.radius || 1.0;
        const pts = generateArcPoints(seg.z1, seg.x1, seg.z2, seg.x2, r, isCw, 16);

        ctx.beginPath();
        if (pts.length > 0) {
          ctx.moveTo(toCanvasX(pts[0].z), toCanvasY(pts[0].xDia));
          for (let p = 1; p < pts.length; p++) {
            ctx.lineTo(toCanvasX(pts[p].z), toCanvasY(pts[p].xDia));
          }
        }
        ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = isHovered ? 3.0 : 2.0;
        ctx.stroke();
      } else {
        const startX = toCanvasX(seg.z1);
        const startY = toCanvasY(seg.x1);
        const endX = toCanvasX(seg.z2);
        const endY = toCanvasY(seg.x2);

        ctx.beginPath();
        ctx.moveTo(startX, startY);

        if (seg.type === 'rapid') {
          ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(248, 113, 113, 0.55)';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = isHovered ? 2.5 : 1.2;
        } else if (seg.type === 'thread') {
          ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(245, 158, 11, 0.85)';
          ctx.setLineDash([]);
          ctx.lineWidth = isHovered ? 3.0 : 2.0;
        } else {
          ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(56, 189, 248, 0.75)';
          ctx.setLineDash([]);
          ctx.lineWidth = isHovered ? 3.0 : 1.8;
        }

        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 8. Render Currently Progressing Active Segment (Line-by-Line / Arc Interpolation)
    let currentToolX = 0;
    let currentToolZ = 0;
    let currentToolType = 'rough_od';

    if (segments.length > 0 && currentStep < segments.length) {
      const activeSeg = segments[currentStep];
      const currentProgress = Math.max(0, Math.min(1, subProgress));

      if (activeSeg.type === 'arc_cw' || activeSeg.type === 'arc_ccw') {
        const isCw = activeSeg.type === 'arc_cw';
        const r = activeSeg.radius || 1.0;
        const currentInterp = interpolateArcPoint(activeSeg.z1, activeSeg.x1, activeSeg.z2, activeSeg.x2, r, isCw, currentProgress);
        currentToolZ = currentInterp.z;
        currentToolX = currentInterp.xDia;

        // Draw progressing arc partial segment
        const pts = generateArcPoints(activeSeg.z1, activeSeg.x1, currentToolZ, currentToolX, r, isCw, 16);
        ctx.beginPath();
        if (pts.length > 0) {
          ctx.moveTo(toCanvasX(pts[0].z), toCanvasY(pts[0].xDia));
          for (let p = 1; p < pts.length; p++) {
            ctx.lineTo(toCanvasX(pts[p].z), toCanvasY(pts[p].xDia));
          }
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.8;
        ctx.stroke();
      } else {
        const startX = toCanvasX(activeSeg.z1);
        const startY = toCanvasY(activeSeg.x1);
        const fullEndX = toCanvasX(activeSeg.z2);
        const fullEndY = toCanvasY(activeSeg.x2);

        const interpX = startX + (fullEndX - startX) * currentProgress;
        const interpY = startY + (fullEndY - startY) * currentProgress;

        currentToolZ = activeSeg.z1 + (activeSeg.z2 - activeSeg.z1) * currentProgress;
        currentToolX = activeSeg.x1 + (activeSeg.x2 - activeSeg.x1) * currentProgress;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(interpX, interpY);

        if (activeSeg.type === 'rapid') {
          ctx.strokeStyle = '#ef4444';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 2.0;
        } else if (activeSeg.type === 'thread') {
          ctx.strokeStyle = '#f59e0b';
          ctx.setLineDash([]);
          ctx.lineWidth = 2.8;
        } else {
          ctx.strokeStyle = '#38bdf8';
          ctx.setLineDash([]);
          ctx.lineWidth = 2.8;
        }

        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Check collision with chuck plane
      const isCollidingWithChuck = currentToolZ <= -stickout;
      if (isCollidingWithChuck) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.fillRect(0, 0, colletX, height);
      }

      // 9. Tool Insert Geometry Rendering (Adaptive by Tool Type)
      if (showToolBody) {
        const toolTipX = toCanvasX(currentToolZ);
        const toolTipY = toCanvasY(currentToolX);
        const insertSize = 13 * Math.min(2.0, Math.max(0.7, zoom));

        if (activeSeg.type === 'thread') {
          currentToolType = 'thread';
          // 60-degree Laydown Threading Triangle
          ctx.fillStyle = '#eab308';
          ctx.strokeStyle = '#a16207';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(toolTipX, toolTipY);
          ctx.lineTo(toolTipX + insertSize * 0.9, toolTipY - insertSize * 1.5);
          ctx.lineTo(toolTipX + insertSize * 1.8, toolTipY - insertSize * 0.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (activeSeg.codeLine.toLowerCase().includes('part') || activeSeg.codeLine.toLowerCase().includes('groov')) {
          currentToolType = 'groove';
          // Parting Blade / Grooving Insert
          const bladeWidth = 4 * zoom;
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 1.2;
          ctx.fillRect(toolTipX - bladeWidth / 2, toolTipY - insertSize * 2.5, bladeWidth, insertSize * 2.5);
          ctx.strokeRect(toolTipX - bladeWidth / 2, toolTipY - insertSize * 2.5, bladeWidth, insertSize * 2.5);
        } else {
          // Standard OD Turning Tool Holder & Diamond Insert (CNMG / WNMG)
          // Shank
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(toolTipX + insertSize * 0.8, toolTipY - insertSize * 1.2);
          ctx.lineTo(toolTipX + insertSize * 3.4, toolTipY - insertSize * 3.8);
          ctx.lineTo(toolTipX + insertSize * 4.6, toolTipY - insertSize * 2.6);
          ctx.lineTo(toolTipX + insertSize * 1.6, toolTipY - insertSize * 0.6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Golden TiAlN Insert
          ctx.fillStyle = '#eab308';
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(toolTipX, toolTipY);
          ctx.lineTo(toolTipX + insertSize * 0.8, toolTipY - insertSize * 1.2);
          ctx.lineTo(toolTipX + insertSize * 1.6, toolTipY - insertSize * 0.6);
          ctx.lineTo(toolTipX + insertSize * 0.8, toolTipY + insertSize * 0.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Tool Nose Radius Bead (R_eps)
        ctx.beginPath();
        ctx.arc(toCanvasX(currentToolZ), toCanvasY(currentToolX), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = activeSeg.type === 'rapid' ? '#f87171' : '#22c55e';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Cutting Chips / Spark Effect
        if (showSparks && isPlaying && activeSeg.type !== 'rapid') {
          const tX = toCanvasX(currentToolZ);
          const tY = toCanvasY(currentToolX);
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(tX + 5, tY - 5, 2, 0, Math.PI * 2);
          ctx.arc(tX + 11, tY - 8, 1.5, 0, Math.PI * 2);
          ctx.arc(tX + 16, tY - 4, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Live Coordinate Floating Tag
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(
          `X${currentToolX.toFixed(2)} Z${currentToolZ.toFixed(2)}`,
          toCanvasX(currentToolZ) + 8,
          toCanvasY(currentToolX) - 14
        );
      }
    }

    // 10. Digital Caliper / Measure Mode Rendering
    if (measurePoints.length > 0) {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = '#a855f7';

      // First point marker
      const p1 = measurePoints[0];
      const cx1 = toCanvasX(p1.z);
      const cy1 = toCanvasY(p1.xDia);

      ctx.beginPath();
      ctx.arc(cx1, cy1, 5, 0, Math.PI * 2);
      ctx.fill();

      if (measurePoints.length === 2) {
        const p2 = measurePoints[1];
        const cx2 = toCanvasX(p2.z);
        const cy2 = toCanvasY(p2.xDia);

        // Second point marker
        ctx.beginPath();
        ctx.arc(cx2, cy2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Connecting measurement line
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Extension lines
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx1, cy2);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();

        // Caliper distance metrics
        const dz = Math.abs(p2.z - p1.z);
        const dx = Math.abs(p2.xDia - p1.xDia);
        const dr = dx / 2;
        const dist = Math.hypot(dz, dr);
        const angleDeg = dz > 1e-4 ? (Math.atan(dr / dz) * (180 / Math.PI)).toFixed(1) : '90.0';

        const midX = (cx1 + cx2) / 2;
        const midY = (cy1 + cy2) / 2 - 12;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(midX - 70, midY - 14, 140, 28);
        ctx.strokeStyle = '#a855f7';
        ctx.strokeRect(midX - 70, midY - 14, 140, 28);

        ctx.fillStyle = '#f3e8ff';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(`ΔZ: ${dz.toFixed(2)}mm  ΔX: ${dx.toFixed(2)}mm`, midX - 64, midY);
        ctx.fillText(`L: ${dist.toFixed(2)}mm (${angleDeg}°)`, midX - 64, midY + 11);
      }
    }

    ctx.restore();
  }, [
    drawing,
    segments,
    stickout,
    currentStep,
    subProgress,
    zoom,
    pan,
    barDia,
    partLength,
    isPlaying,
    showRapids,
    showStock,
    showGrid,
    showToolBody,
    showMirror,
    showSparks,
    measurePoints,
    hoveredSegmentIdx
  ]);

  // ResizeObserver with DevicePixelRatio for razor-sharp HiDPI canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.floor(width * dpr);
          canvas.height = Math.floor(height * dpr);
          canvas.style.width = `${Math.floor(width)}px`;
          canvas.style.height = `${Math.floor(height)}px`;
          drawScene();
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [drawScene]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  // Smart Auto-Fit (Fit All to Viewport)
  const fitView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Workpiece bounds
    const totalZLen = stickout + 10;
    const maxDia = Math.max(barDia * 1.6, 20);

    const targetScaleZ = (width * 0.70) / totalZLen;
    const targetScaleX = (height * 0.70) / (maxDia / 2);
    const bestScale = Math.min(targetScaleZ, targetScaleX);

    const baseScale = Math.min(width / (partLength + 50), height / (Math.max(1, barDia) * 3.5)) * 1.3;
    const targetZoom = Math.min(4.0, Math.max(0.4, bestScale / baseScale));

    setZoom(targetZoom);
    setPan({ x: 0, y: 0 });
  }, [barDia, stickout, partLength]);

  // Smooth Wheel Zoom focused on cursor position
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const nextZoom = Math.min(6.0, Math.max(0.3, zoom * zoomFactor));

    if (nextZoom === zoom) return;

    // Re-anchor pan so mouse coordinates remain stationary in lathe world
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const originX = w * 0.65 + pan.x;
    const originY = h * 0.5 + pan.y;

    const baseScale = Math.min(w / (partLength + 50), h / (Math.max(1, barDia) * 3.5)) * 1.3;
    const currentScale = baseScale * zoom;
    const newScale = baseScale * nextZoom;

    // Lathe coords under cursor
    const zPos = (mouseX - originX) / currentScale;
    const xRad = (originY - mouseY) / currentScale;

    // New origin to keep mouse fixed
    const newOriginX = mouseX - zPos * newScale;
    const newOriginY = mouseY + xRad * newScale;

    setPan({
      x: newOriginX - w * 0.65,
      y: newOriginY - h * 0.5
    });
    setZoom(nextZoom);
  };

  // Pointer event handlers with pointer capture for smooth panning
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);

    // If measure mode is active, register points
    if (measureMode) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      const originX = w * 0.65 + pan.x;
      const originY = h * 0.5 + pan.y;
      const baseScale = Math.min(w / (partLength + 50), h / (Math.max(1, barDia) * 3.5)) * 1.3;
      const scale = baseScale * zoom;

      const z = Number(((mouseX - originX) / scale).toFixed(2));
      const xDia = Number((((originY - mouseY) / scale) * 2).toFixed(2));

      if (measurePoints.length >= 2) {
        setMeasurePoints([{ z, xDia, canvasX: mouseX, canvasY: mouseY }]);
      } else {
        setMeasurePoints((prev) => [...prev, { z, xDia, canvasX: mouseX, canvasY: mouseY }]);
      }
      return;
    }

    // Check if user clicked on a toolpath segment
    if (hoveredSegmentIdx !== null && hoveredSegmentIdx >= 0) {
      setIsPlaying(false);
      setCurrentStep(hoveredSegmentIdx);
      currentStepRef.current = hoveredSegmentIdx;
      setSubProgress(0);
      subProgressRef.current = 0;
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    const originX = w * 0.65 + pan.x;
    const originY = h * 0.5 + pan.y;
    const baseScale = Math.min(w / (partLength + 50), h / (Math.max(1, barDia) * 3.5)) * 1.3;
    const scale = baseScale * zoom;

    const zPos = Number(((mouseX - originX) / scale).toFixed(2));
    const xDia = Number((((originY - mouseY) / scale) * 2).toFixed(2));
    setCursorCoord({ xDia, zPos });

    // Segment hit-testing for interactive hover & inspection
    if (!isDragging && !measureMode && segments.length > 0) {
      let closestIdx: number | null = null;
      let minPixelDist = 12; // 12px threshold

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const sX = originX + (seg.z1 * scale);
        const sY = originY - ((seg.x1 / 2) * scale);
        const eX = originX + (seg.z2 * scale);
        const eY = originY - ((seg.x2 / 2) * scale);

        // Distance from point to line segment
        const d = distToSegment(mouseX, mouseY, sX, sY, eX, eY);
        if (d < minPixelDist) {
          minPixelDist = d;
          closestIdx = i;
        }
      }
      setHoveredSegmentIdx(closestIdx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  const currentSegment = segments[currentStep];

  // DRO Calculation: Current Tool Position & Dist to Go
  const currentInterp = useMemo(() => {
    if (!currentSegment) return { x: 0, z: 0, dxToGo: 0, dzToGo: 0 };
    const prog = Math.max(0, Math.min(1, subProgress));

    if (currentSegment.type === 'arc_cw' || currentSegment.type === 'arc_ccw') {
      const isCw = currentSegment.type === 'arc_cw';
      const r = currentSegment.radius || 1.0;
      const pt = interpolateArcPoint(currentSegment.z1, currentSegment.x1, currentSegment.z2, currentSegment.x2, r, isCw, prog);
      return {
        x: pt.xDia,
        z: pt.z,
        dxToGo: Number(Math.abs(currentSegment.x2 - pt.xDia).toFixed(3)),
        dzToGo: Number(Math.abs(currentSegment.z2 - pt.z).toFixed(3))
      };
    }

    const x = currentSegment.x1 + (currentSegment.x2 - currentSegment.x1) * prog;
    const z = currentSegment.z1 + (currentSegment.z2 - currentSegment.z1) * prog;
    return {
      x,
      z,
      dxToGo: Number(Math.abs(currentSegment.x2 - x).toFixed(3)),
      dzToGo: Number(Math.abs(currentSegment.z2 - z).toFixed(3))
    };
  }, [currentSegment, subProgress]);

  // Check if current tool is in danger zone
  const hasChuckCollision = currentInterp.z <= -stickout;

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col shadow-2xl transition-all ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : ''
    }`}>
      {/* 1. Industrial Fanuc CNC Controller HUD Top Header */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Machine & Program Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full flex items-center justify-center ${
              isPlaying 
                ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' 
                : 'bg-amber-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-white ${isPlaying ? 'animate-ping' : ''}`}></span>
            </span>
            <span className="font-display font-bold tracking-wider text-amber-400 uppercase text-xs">
              2D Lathe Backplot Simulator
            </span>
          </div>

          <span className="text-slate-600">|</span>

          <span className="text-slate-300 font-mono-code hidden sm:inline">
            Bar: <strong className="text-cyan-300">Ø{barDia}mm</strong> &times;{' '}
            <strong className="text-cyan-300">{partLength}mm</strong> (Stickout: {stickout.toFixed(1)}mm)
          </span>

          {hasChuckCollision && (
            <span className="px-2 py-0.5 rounded bg-red-950 border border-red-500 text-red-300 text-[11px] font-bold flex items-center gap-1 animate-pulse">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span>{t('collisionDetected')}</span>
            </span>
          )}
        </div>

        {/* Center: Live Real-Time DRO Crosshair Readout */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/70 px-3 py-1 rounded font-mono-code text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">{t('cursorCoord')}:</span>
            <span className="text-cyan-400 font-semibold min-w-[55px]">
              X {cursorCoord ? cursorCoord.xDia.toFixed(2) : '0.00'}
            </span>
            <span className="text-emerald-400 font-semibold min-w-[55px]">
              Z {cursorCoord ? cursorCoord.zPos.toFixed(2) : '0.00'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-slate-800">
            <span className="text-slate-400">{t('toolCoord')}:</span>
            <span className="text-amber-400 font-bold min-w-[55px]">
              X {currentInterp.x.toFixed(2)}
            </span>
            <span className="text-amber-400 font-bold min-w-[55px]">
              Z {currentInterp.z.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Right: Quick Action Controls & Fullscreen */}
        <div className="flex items-center gap-1">
          {/* Caliper / Measure Tool Toggle */}
          <button
            onClick={() => {
              setMeasureMode(!measureMode);
              if (measureMode) setMeasurePoints([]);
            }}
            className={`p-1.5 rounded border transition flex items-center gap-1 ${
              measureMode 
                ? 'bg-purple-900/80 border-purple-500 text-purple-200' 
                : 'hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title={t('toggleMeasure')}
          >
            <Ruler className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xl:inline text-[11px]">Штангенциркуль</span>
          </button>

          {/* Fit to View */}
          <button
            onClick={fitView}
            className="p-1.5 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition"
            title={t('fitView')}
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Zoom Buttons */}
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 5.0))}
            className="p-1.5 hover:bg-slate-800 text-slate-300 rounded border border-slate-700"
            title={t('zoomIn')}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.4))}
            className="p-1.5 hover:bg-slate-800 text-slate-300 rounded border border-slate-700"
            title={t('zoomOut')}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition"
            title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Keyboard Shortcuts Help */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-700 transition"
            title="Горячие клавиши (Hotkeys)"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Layer Display Toggles Bar */}
      <div className="bg-slate-950/90 px-4 py-1.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-mono-code uppercase mr-1">Слои:</span>

          {/* Rapids G00 */}
          <button
            onClick={() => setShowRapids(!showRapids)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono-code border transition ${
              showRapids 
                ? 'bg-red-950/70 border-red-800 text-red-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            G00 Rapids
          </button>

          {/* Raw Stock */}
          <button
            onClick={() => setShowStock(!showStock)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono-code border transition ${
              showStock 
                ? 'bg-slate-800 border-slate-700 text-slate-200' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            Заготовка
          </button>

          {/* Grid */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono-code border transition ${
              showGrid 
                ? 'bg-sky-950/70 border-sky-800 text-sky-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            Сетка
          </button>

          {/* Tool Body */}
          <button
            onClick={() => setShowToolBody(!showToolBody)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono-code border transition ${
              showToolBody 
                ? 'bg-amber-950/70 border-amber-800 text-amber-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            Резец
          </button>

          {/* Mirror Contour */}
          <button
            onClick={() => setShowMirror(!showMirror)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono-code border transition ${
              showMirror 
                ? 'bg-cyan-950/70 border-cyan-800 text-cyan-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            Симметрия
          </button>

          {/* Cutting Sparks */}
          <button
            onClick={() => setShowSparks(!showSparks)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono-code border transition ${
              showSparks 
                ? 'bg-yellow-950/70 border-yellow-800 text-yellow-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <Sparkles className="w-3 h-3 inline mr-1" />
            Стружка
          </button>
        </div>

        {/* Measure Mode Banner (if active) */}
        {measureMode && (
          <div className="flex items-center gap-2 bg-purple-950/80 border border-purple-600/70 px-2 py-0.5 rounded text-purple-200">
            <span>{t('measurePrompt')}</span>
            {measurePoints.length > 0 && (
              <button
                onClick={() => setMeasurePoints([])}
                className="text-purple-300 hover:text-white underline font-bold"
              >
                {t('clearMeasure')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Main Interactive Canvas Viewport */}
      <div 
        ref={containerRef} 
        className={`relative w-full ${isFullscreen ? 'flex-1' : 'h-[500px]'} bg-slate-950 select-none overflow-hidden cursor-crosshair`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          className="w-full h-full block touch-none"
        />

        {/* Legend Overlay (Bottom Left) */}
        <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur border border-slate-800 p-2.5 rounded text-[11px] font-mono-code space-y-1 shadow-2xl pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-red-400 border-b border-dashed border-red-400"></span>
            <span className="text-slate-300">{t('legendG00')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-sky-400"></span>
            <span className="text-slate-300">{t('legendG01')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-amber-400"></span>
            <span className="text-slate-300">{t('legendG76')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-red-500 border border-red-500"></span>
            <span className="text-red-400">{t('legendZLimit')}</span>
          </div>
        </div>

        {/* CNC DRO & Active Modal Machine Status Overlay (Top Right) */}
        {currentSegment && (
          <div className="absolute top-3 right-3 bg-slate-950/95 border border-slate-700 p-3 rounded font-mono-code text-xs shadow-2xl min-w-[270px]">
            {/* Header: Cycle State & Block Index */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5 mb-2">
              <span className="font-bold">
                {t('activeBlock')} ({currentStep + 1}/{segments.length})
              </span>
              <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                isPlaying 
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700 animate-pulse' 
                  : singleBlockMode
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {isPlaying ? t('cycleRun') : singleBlockMode ? t('singleBlock') : t('feedHold')}
              </span>
            </div>

            {/* Big Active NC Code Line */}
            <div className="font-bold text-amber-400 text-sm tracking-wide bg-slate-900/90 px-2 py-1 rounded border border-slate-800 mb-2">
              {currentSegment.codeLine}
            </div>

            {/* Machine DRO Coordinate Readouts */}
            <div className="grid grid-cols-2 gap-2 text-[11px] mb-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[10px]">TARGET ABS:</span>
                <span className="text-amber-300 font-bold">X {currentSegment.x2.toFixed(3)}</span>
                <span className="text-amber-300 font-bold ml-2">Z {currentSegment.z2.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{t('distToGo')}</span>
                <span className="text-cyan-300 font-bold">ΔX {currentInterp.dxToGo.toFixed(2)}</span>
                <span className="text-cyan-300 font-bold ml-2">ΔZ {currentInterp.dzToGo.toFixed(2)}</span>
              </div>
            </div>

            {/* Tool & Feed details */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>{t('toolCoord')}: <strong className="text-purple-300">{currentSegment.toolNumber}</strong></span>
              <span>{t('speed')}: <strong className="text-emerald-300">{currentSegment.feed ? `${currentSegment.feed} mm/r` : 'RAPID'}</strong></span>
            </div>

            {/* Interpolated Progress Bar within Block */}
            <div className="w-full bg-slate-900 h-1.5 rounded mt-2.5 overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-75 ${
                  currentSegment.type === 'rapid' ? 'bg-red-400' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.round(subProgress * 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Hovered Segment Inspector Tooltip */}
        {hoveredSegmentIdx !== null && hoveredSegmentIdx !== currentStep && segments[hoveredSegmentIdx] && (
          <div className="absolute top-3 left-3 bg-slate-900/95 border border-cyan-500/70 px-3 py-1.5 rounded font-mono-code text-xs shadow-xl pointer-events-none">
            <span className="text-cyan-400 font-bold block">
              Block #{hoveredSegmentIdx + 1}: {segments[hoveredSegmentIdx].codeLine}
            </span>
            <span className="text-slate-400 text-[10px]">
              Кликните для перехода к этому кадру
            </span>
          </div>
        )}
      </div>

      {/* 4. Operation Jump Bookmarks Bar (Quick Access to Operations) */}
      {detectedOperations.length > 0 && (
        <div className="bg-slate-950 px-4 py-1.5 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
          <span className="text-slate-500 font-mono-code text-[11px] uppercase mr-1 flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-amber-400" />
            Операции:
          </span>
          {detectedOperations.map((op, idx) => {
            const isOpActive = currentStep >= op.startStep && currentStep <= op.endStep;
            return (
              <button
                key={idx}
                onClick={() => handleJumpToOperation(op.startStep)}
                className={`px-2.5 py-1 rounded text-xs font-mono-code whitespace-nowrap transition border ${
                  isOpActive
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
                title={`Перейти к ${op.name} (Кадр ${op.startStep + 1})`}
              >
                {op.name}
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Playback & Timeline Controls Footer */}
      <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Playback Button Group */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Main Play / Pause */}
          <button
            onClick={handleTogglePlay}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold shadow-md transition transform active:scale-95 ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title="Пуск / Пауза (Пробел)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-slate-950" />
                <span>{t('pause')}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>{t('simulate')}</span>
              </>
            )}
          </button>

          {/* Step Back (Left Arrow) */}
          <button
            onClick={handleStepBack}
            disabled={currentStep <= 0}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 disabled:opacity-30 transition"
            title="Предыдущий кадр (Стрелка влево)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Step Forward (Right Arrow) */}
          <button
            onClick={handleStepForward}
            disabled={currentStep >= segments.length - 1}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 border border-slate-700 disabled:opacity-30 transition font-semibold"
            title="Следующий кадр (Стрелка вправо)"
          >
            <SkipForward className="w-4 h-4" />
            <span>{t('stepFwd')}</span>
          </button>

          {/* Rewind to Start (R) */}
          <button
            onClick={handleReset}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Сброс в начало программы (R / Home)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fast Forward to End */}
          <button
            onClick={handleJumpToEnd}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="В конец программы (End)"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>

          {/* Single Block Mode (SBK) */}
          <button
            onClick={() => setSingleBlockMode(!singleBlockMode)}
            className={`px-2.5 py-1.5 rounded text-xs font-mono-code border transition ${
              singleBlockMode
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold shadow'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Fanuc SBK: Остановка после выполнения каждого кадра"
          >
            SBK
          </button>
        </div>

        {/* Step Progress Scrubber Slider */}
        <div className="flex-1 max-w-md flex items-center gap-3">
          <input
            type="range"
            min="0"
            max={Math.max(0, segments.length - 1)}
            value={currentStep}
            onChange={(e) => {
              setIsPlaying(false);
              setSubProgress(0);
              setCurrentStep(parseInt(e.target.value, 10));
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <span className="font-mono-code text-xs text-amber-400 font-bold min-w-[70px] text-right">
            {currentStep + 1} / {segments.length}
          </span>
        </div>

        {/* Playback Speed Multiplier */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 font-mono-code pl-1 pr-1">{t('speed')}:</span>
          {[0.25, 0.5, 1, 2, 5].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-2 py-0.5 rounded text-xs font-mono-code transition ${
                playbackSpeed === spd
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* 6. Keyboard Shortcuts Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-display font-bold text-slate-200 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                Горячие клавиши симулятора (Hotkeys)
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono-code">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Пробел (Space)</span>
                <span className="text-amber-300 font-bold">Пуск / Пауза симуляции</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Стрелка вправо (→)</span>
                <span className="text-amber-300 font-bold">Шаг вперёд (+1 кадр)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Стрелка влево (←)</span>
                <span className="text-amber-300 font-bold">Шаг назад (-1 кадр)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Клавиша R</span>
                <span className="text-amber-300 font-bold">Сброс в начало (Rewind)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Клавиша F</span>
                <span className="text-amber-300 font-bold">Автомасштаб по размеру экрана</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Колёсико мыши (Wheel)</span>
                <span className="text-amber-300 font-bold">Плавное масштабирование под курсором</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Перетаскивание (Drag)</span>
                <span className="text-amber-300 font-bold">Панорамирование чертежа</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Клик по траектории</span>
                <span className="text-amber-300 font-bold">Инспекция и переход к кадру УП</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Escape</span>
                <span className="text-amber-300 font-bold">Выход из полноэкранного режима</span>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
