export interface MachineSpec {
  id: string;
  name: string;
  type: 'swiss' | 'chucker' | 'standard_lathe';
  controller: string;
  maxBarDia: number; // mm
  maxRpmMain: number;
  maxRpmSub?: number;
  z1Travel: number; // mm
  x1Travel: number; // mm
  y1Travel?: number; // mm
  z2Travel?: number; // mm
  x2Travel?: number; // mm
  hasSubSpindle: boolean;
  hasYAxis: boolean;
  liveToolsCount: number;
  maxLiveRpm: number;
  guideBushingType: 'fixed' | 'rotary' | 'convertible' | 'none';
  recommendedBarTolerance: string;
  notes: string;
}

export type MaterialCategory = 
  | 'stainless' 
  | 'brass' 
  | 'aluminum' 
  | 'steel' 
  | 'titanium' 
  | 'copper' 
  | 'plastic' 
  | 'superalloy' 
  | 'cast_iron' 
  | 'other';

export interface MaterialSpec {
  id: string;
  name: string;
  code: string;
  category: MaterialCategory;
  density: number; // g/cm³
  kc1_1: number; // specific cutting force N/mm²
  vcRough: [number, number]; // m/min
  vcFinish: [number, number]; // m/min
  vcParting: [number, number]; // m/min
  vcThreading: [number, number]; // m/min
  feedRough: [number, number]; // mm/rev
  feedFinish: [number, number]; // mm/rev
  feedParting: [number, number]; // mm/rev
  depthRough: [number, number]; // mm
  depthFinish: [number, number]; // mm
  coolantRecommended: string;
  notes: string;
  // Custom Profile & Storage extensions
  isCustom?: boolean;
  colorCode?: string; // e.g. '#3b82f6', '#10b981', '#f59e0b'
  speedMultiplier?: number; // 1.0 = 100%, 1.15 = 115%
  feedMultiplier?: number; // 1.0 = 100%, 0.9 = 90%
  speedFeedMultiplier?: number; // optional unified multiplier
  hardnessHb?: number; // Brinell Hardness
  tensileStrengthMpa?: number; // MPa
  machinabilityRating?: number; // % relative to AISI 1212
  chipBreakability?: 'excellent' | 'good' | 'fair' | 'poor';
}

export type ContourPointType = 
  | 'start' 
  | 'face' 
  | 'turn' 
  | 'taper' 
  | 'chamfer'
  | 'arc_cw' 
  | 'arc_ccw' 
  | 'thread' 
  | 'groove' 
  | 'cutoff';

export interface ContourPoint {
  point_id: number;
  type: ContourPointType;
  x_diameter: number; // mm diameter
  z_coordinate: number; // mm (usually <= 0)
  chamfer?: number; // mm
  radius?: number; // mm for arc or fillet
  thread_pitch?: number; // mm for threading
  thread_depth?: number;
  groove_width?: number; // mm
  feed_override?: number;
}

export interface DrawingData {
  operation_type: 'turning' | 'swiss_turning' | 'milling_turning';
  material: string;
  part_name: string;
  drawing_number?: string;
  workpiece: {
    diameter_or_width_mm: number;
    length_mm: number;
    stickout_mm?: number;
    guide_bushing_clearance_mm?: number;
  };
  contour_points: ContourPoint[];
  roughness_requirements: {
    general_ra: number;
    critical_surfaces: string[];
  };
}

export type ToolType = 
  | 'rough_od' 
  | 'finish_od' 
  | 'groove' 
  | 'thread' 
  | 'part_off' 
  | 'center_drill' 
  | 'drill' 
  | 'boring'
  | 'facing';

export type InsertShape = 
  | 'W_80_trigon' 
  | 'C_80_diamond' 
  | 'D_55_diamond' 
  | 'V_35_diamond' 
  | 'T_60_triangle' 
  | 'R_round' 
  | 'groove_partoff' 
  | 'drill_point';

export interface CustomTool {
  id: string;
  toolNumber: string; // e.g. "T0101"
  station: number;    // e.g. 1
  offsetNumber: number; // e.g. 1
  name: string;       // e.g. "OD Rough Turn - WNMG 080408"
  type: ToolType;
  hand: 'right' | 'left' | 'neutral';
  
  // Geometry & Insert
  insertCode: string; // e.g. "WNMG 080408", "VBMT 110302", "16ER AG60"
  insertShape: InsertShape;
  noseRadius: number; // mm (r_eps, e.g. 0.4)
  insertWidth?: number; // mm (for groove/cutoff/drill)
  includedAngle?: number; // deg (e.g. 80, 55, 35, 60)
  leadAngle?: number; // deg (e.g. 95, 93, 45, 90)
  maxDoc: number; // mm max depth of cut (for roughing cycles)
  shankSize: string; // e.g. "12x12 mm (Swiss)", "16x16 mm", "20x20 mm"
  coatingGrade: string; // e.g. "TiAlN PVD", "CVD Al2O3", "Uncoated K10"
  
  // Fanuc Offsets (Geometry & Wear)
  xOffset: number; // mm (Geometry X)
  zOffset: number; // mm (Geometry Z)
  tipOrientation: number; // Fanuc Tool Tip Code 1..9 (Tip 3 = OD Right, Tip 2 = Boring, Tip 7 = Drill)
  wearX: number; // mm
  wearZ: number; // mm
  wearRadius: number; // mm
  
  // Custom cutting speed & feed overrides (optional)
  useCustomCuttingData?: boolean;
  customVc?: number; // m/min
  customFeed?: number; // mm/rev

  notes?: string;
  isPreset?: boolean;
}

export interface ActiveToolAssignments {
  roughOdToolId: string;
  finishOdToolId: string;
  threadToolId: string;
  grooveToolId: string;
  cutoffToolId: string;
}

export interface ToolDefinition {
  toolNumber: string; // e.g. T0101
  description: string;
  type: ToolType;
  noseRadius: number; // mm (r_eps)
  insertWidth?: number; // for groove/partoff
  hand: 'right' | 'left' | 'neutral';
  maxDoc: number;
}

export interface SafetyCheckResult {
  g50Check: {
    passed: boolean;
    hasG50: boolean;
    clampRpm: number;
    maxMachineRpm: number;
    message: string;
  };
  slendernessRatio: {
    ldRatio: number;
    length: number;
    diameter: number;
    level: 'safe' | 'warning' | 'critical';
    message: string;
  };
  colletInterference: {
    passed: boolean;
    zLimit: number;
    stickout: number;
    clearance: number;
    deepestZ: number;
    message: string;
  };
  rapidTraverseRisk: {
    passed: boolean;
    maxRapidDist: number;
    message: string;
  };
  toolUndercutting: {
    passed: boolean;
    noseRadius: number;
    minProfileRadius: number;
    issues: string[];
  };
  subAgents: {
    syntaxChecker: { passed: boolean; details: string[] };
    integrationConsistency: { passed: boolean; details: string[] };
    logicReviewer: { passed: boolean; details: string[] };
    embeddedPerfAuditor: { 
      cycleTimeSec: number; 
      theoreticalRa: number; 
      mrrCm3PerMin: number;
      passed: boolean; 
      details: string[]; 
    };
  };
  overallPassed: boolean;
  formattedOutput: string; // exact [SAFETY CHECK RESULT] block
}

export interface FanucAlarm {
  code: string;
  prefix: 'PS' | 'SV' | 'SP' | 'OT' | 'OH' | 'EX';
  title: string;
  severity: 'warning' | 'alarm' | 'critical_stop';
  description: string;
  probableCauses: string[];
  remedySteps: string[];
  parametersToCheck?: string[];
  machineApplicability?: string;
}

export interface ToolpathSegment {
  type: 'rapid' | 'cut' | 'arc_cw' | 'arc_ccw' | 'thread' | 'retract';
  x1: number; // start diameter
  z1: number; // start Z
  x2: number; // end diameter
  z2: number; // end Z
  radius?: number;
  feed?: number;
  codeLine: string;
  lineNumber: number;
  toolNumber: string;
  gcodeLineIndex?: number;
}
