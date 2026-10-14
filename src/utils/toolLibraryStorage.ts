import { CustomTool, ActiveToolAssignments } from '../types/cnc';

export const TOOL_LIBRARY_STORAGE_KEY = 'cnc_calc_tool_library_v2';
export const ACTIVE_TOOL_ASSIGNMENTS_KEY = 'cnc_calc_active_tools_v2';

export const DEFAULT_PRESET_TOOLS: CustomTool[] = [
  {
    id: 'tool-t01-rough',
    toolNumber: 'T0101',
    station: 1,
    offsetNumber: 1,
    name: 'Main OD Roughing & Facing (WNMG 80°)',
    type: 'rough_od',
    hand: 'right',
    insertCode: 'WNMG 080408',
    insertShape: 'W_80_trigon',
    noseRadius: 0.40,
    includedAngle: 80,
    leadAngle: 95,
    maxDoc: 1.20,
    shankSize: '12x12 mm (Swiss)',
    coatingGrade: 'TiAlN PVD (AC6030M)',
    xOffset: 0.000,
    zOffset: 0.000,
    tipOrientation: 3, // Fanuc Tip 3: OD Right Hand
    wearX: 0.000,
    wearZ: 0.000,
    wearRadius: 0.000,
    notes: 'General OD longitudinal roughing & face squaring. Strong 80° cutting edge.',
    isPreset: true
  },
  {
    id: 'tool-t05-finish',
    toolNumber: 'T0505',
    station: 5,
    offsetNumber: 5,
    name: 'Precision Finishing OD (VBMT 35°)',
    type: 'finish_od',
    hand: 'right',
    insertCode: 'VBMT 110302-PF',
    insertShape: 'V_35_diamond',
    noseRadius: 0.20,
    includedAngle: 35,
    leadAngle: 93,
    maxDoc: 0.40,
    shankSize: '12x12 mm (Swiss)',
    coatingGrade: 'TiCN / Al2O3 Precision Ground',
    xOffset: -0.012,
    zOffset: 0.025,
    tipOrientation: 3,
    wearX: 0.000,
    wearZ: 0.000,
    wearRadius: 0.000,
    notes: 'Sharp 35° diamond insert for complex profile contours, deep undercuts and fine Ra finish.',
    isPreset: true
  },
  {
    id: 'tool-t02-thread',
    toolNumber: 'T0202',
    station: 2,
    offsetNumber: 2,
    name: '60° Laydown Threading (16ER AG60)',
    type: 'thread',
    hand: 'right',
    insertCode: '16ER AG60',
    insertShape: 'T_60_triangle',
    noseRadius: 0.05,
    insertWidth: 1.50,
    includedAngle: 60,
    leadAngle: 90,
    maxDoc: 0.25,
    shankSize: '12x12 mm (Swiss)',
    coatingGrade: 'TiAlN Micro-grain Carbide',
    xOffset: 0.000,
    zOffset: 0.000,
    tipOrientation: 3,
    wearX: 0.000,
    wearZ: 0.000,
    wearRadius: 0.000,
    notes: 'External metric threading pitch 0.5 - 3.0 mm. G76 synchronization.',
    isPreset: true
  },
  {
    id: 'tool-t03-groove',
    toolNumber: 'T0303',
    station: 3,
    offsetNumber: 3,
    name: 'OD Precision Grooving 1.5mm',
    type: 'groove',
    hand: 'neutral',
    insertCode: 'GDM 1.5-0.10',
    insertShape: 'groove_partoff',
    noseRadius: 0.10,
    insertWidth: 1.50,
    includedAngle: 0,
    leadAngle: 0,
    maxDoc: 2.50,
    shankSize: '12x12 mm (Swiss)',
    coatingGrade: 'TiAlN Nano-composite',
    xOffset: 0.000,
    zOffset: 0.000,
    tipOrientation: 3,
    wearX: 0.000,
    wearZ: 0.000,
    wearRadius: 0.000,
    notes: 'Snap ring / O-ring external groove with dwell at bottom.',
    isPreset: true
  },
  {
    id: 'tool-t04-cutoff',
    toolNumber: 'T0404',
    station: 4,
    offsetNumber: 4,
    name: 'Parting-Off / Cutoff Blade 2.0mm',
    type: 'part_off',
    hand: 'neutral',
    insertCode: 'N153.2-200 R0.1',
    insertShape: 'groove_partoff',
    noseRadius: 0.10,
    insertWidth: 2.00,
    includedAngle: 0,
    leadAngle: 0,
    maxDoc: 8.00,
    shankSize: '12x12 mm (Swiss)',
    coatingGrade: 'TiAlN PVD Tough Grade',
    xOffset: 0.000,
    zOffset: 0.000,
    tipOrientation: 3,
    wearX: 0.000,
    wearZ: 0.000,
    wearRadius: 0.000,
    notes: 'Cutoff blade with controlled center feed reduction to prevent pip formation.',
    isPreset: true
  },
  {
    id: 'tool-t06-drill',
    toolNumber: 'T0606',
    station: 6,
    offsetNumber: 6,
    name: 'Solid Carbide Micro Drill Ø2.0mm',
    type: 'drill',
    hand: 'neutral',
    insertCode: 'MicroDrill Ø2.00x5D',
    insertShape: 'drill_point',
    noseRadius: 0.00,
    insertWidth: 2.00,
    includedAngle: 140,
    leadAngle: 90,
    maxDoc: 10.00,
    shankSize: 'ER11 Collet',
    coatingGrade: 'TiAlN Sub-micron',
    xOffset: 0.000,
    zOffset: 6.500,
    tipOrientation: 7, // Fanuc Tip 7: Centerline tool
    wearX: 0.000,
    wearZ: 0.000,
    wearRadius: 0.000,
    notes: 'Face axial center hole drilling with G74/G83 peck cycle.',
    isPreset: true
  },
  {
    id: 'tool-t07-swiss',
    toolNumber: 'T0707',
    station: 7,
    offsetNumber: 7,
    name: 'Swiss Low-Force Turn (CCMT 80°)',
    type: 'rough_od',
    hand: 'right',
    insertCode: 'CCMT 060202-SM',
    insertShape: 'C_80_diamond',
    noseRadius: 0.20,
    includedAngle: 80,
    leadAngle: 95,
    maxDoc: 0.80,
    shankSize: '10x10 mm (Tsugami)',
    coatingGrade: 'PVD TiAlN Micro',
    xOffset: 0.000,
    zOffset: 0.000,
    tipOrientation: 3,
    wearX: 0.000,
    wearZ: 0.000,
    wearRadius: 0.000,
    notes: 'Positive 7° clearance angle. Low cutting pressure for small diameter Swiss turning.',
    isPreset: true
  }
];

export const DEFAULT_ACTIVE_ASSIGNMENTS: ActiveToolAssignments = {
  roughOdToolId: 'tool-t01-rough',
  finishOdToolId: 'tool-t05-finish',
  threadToolId: 'tool-t02-thread',
  grooveToolId: 'tool-t03-groove',
  cutoffToolId: 'tool-t04-cutoff'
};

/**
 * Load persistent tool library from localStorage with validation
 */
export function loadToolLibrary(): CustomTool[] {
  try {
    const raw = localStorage.getItem(TOOL_LIBRARY_STORAGE_KEY);
    if (!raw) {
      saveToolLibrary(DEFAULT_PRESET_TOOLS);
      return DEFAULT_PRESET_TOOLS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Validate that essential fields exist on each tool
      const valid = parsed.filter(t => t && t.id && t.toolNumber && t.name);
      if (valid.length > 0) {
        return valid;
      }
    }
  } catch (err) {
    console.error('Failed to parse tool library from localStorage:', err);
  }
  return DEFAULT_PRESET_TOOLS;
}

/**
 * Save persistent tool library to localStorage
 */
export function saveToolLibrary(tools: CustomTool[]): boolean {
  try {
    localStorage.setItem(TOOL_LIBRARY_STORAGE_KEY, JSON.stringify(tools));
    return true;
  } catch (err) {
    console.error('Failed to save tool library to localStorage:', err);
    return false;
  }
}

/**
 * Load persistent active tool assignments
 */
export function loadActiveToolAssignments(availableTools: CustomTool[]): ActiveToolAssignments {
  try {
    const raw = localStorage.getItem(ACTIVE_TOOL_ASSIGNMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ActiveToolAssignments;
      // Ensure the referenced tool IDs actually exist in availableTools
      const toolIdExists = (id: string) => availableTools.some(t => t.id === id);
      
      const assignments: ActiveToolAssignments = {
        roughOdToolId: toolIdExists(parsed.roughOdToolId) ? parsed.roughOdToolId : DEFAULT_ACTIVE_ASSIGNMENTS.roughOdToolId,
        finishOdToolId: toolIdExists(parsed.finishOdToolId) ? parsed.finishOdToolId : DEFAULT_ACTIVE_ASSIGNMENTS.finishOdToolId,
        threadToolId: toolIdExists(parsed.threadToolId) ? parsed.threadToolId : DEFAULT_ACTIVE_ASSIGNMENTS.threadToolId,
        grooveToolId: toolIdExists(parsed.grooveToolId) ? parsed.grooveToolId : DEFAULT_ACTIVE_ASSIGNMENTS.grooveToolId,
        cutoffToolId: toolIdExists(parsed.cutoffToolId) ? parsed.cutoffToolId : DEFAULT_ACTIVE_ASSIGNMENTS.cutoffToolId
      };
      return assignments;
    }
  } catch (err) {
    console.error('Failed to parse active tool assignments:', err);
  }
  return DEFAULT_ACTIVE_ASSIGNMENTS;
}

/**
 * Save persistent active tool assignments
 */
export function saveActiveToolAssignments(assignments: ActiveToolAssignments): boolean {
  try {
    localStorage.setItem(ACTIVE_TOOL_ASSIGNMENTS_KEY, JSON.stringify(assignments));
    return true;
  } catch (err) {
    console.error('Failed to save active tool assignments:', err);
    return false;
  }
}

/**
 * Export tool library to JSON string
 */
export function exportToolsToJson(tools: CustomTool[]): string {
  return JSON.stringify(
    {
      app: 'CNC GCode',
      version: '2.0',
      exportDate: new Date().toISOString(),
      toolsCount: tools.length,
      tools
    },
    null,
    2
  );
}

/**
 * Import tool library from JSON string
 */
export function importToolsFromJson(jsonStr: string): { success: boolean; tools?: CustomTool[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    const toolsArray = Array.isArray(parsed) ? parsed : parsed.tools;

    if (!Array.isArray(toolsArray) || toolsArray.length === 0) {
      return { success: false, error: 'JSON does not contain a valid array of tools' };
    }

    const cleanedTools: CustomTool[] = toolsArray.map((t, idx) => ({
      id: t.id || `custom-tool-${Date.now()}-${idx}`,
      toolNumber: t.toolNumber || `T0${idx + 1}0${idx + 1}`,
      station: Number(t.station) || (idx + 1),
      offsetNumber: Number(t.offsetNumber) || (idx + 1),
      name: t.name || `Imported Tool ${idx + 1}`,
      type: t.type || 'rough_od',
      hand: t.hand || 'right',
      insertCode: t.insertCode || 'Custom Insert',
      insertShape: t.insertShape || 'W_80_trigon',
      noseRadius: Number(t.noseRadius) || 0.4,
      insertWidth: t.insertWidth !== undefined ? Number(t.insertWidth) : undefined,
      includedAngle: t.includedAngle !== undefined ? Number(t.includedAngle) : 80,
      leadAngle: t.leadAngle !== undefined ? Number(t.leadAngle) : 95,
      maxDoc: Number(t.maxDoc) || 1.0,
      shankSize: t.shankSize || '12x12 mm',
      coatingGrade: t.coatingGrade || 'Carbide',
      xOffset: Number(t.xOffset) || 0.0,
      zOffset: Number(t.zOffset) || 0.0,
      tipOrientation: Number(t.tipOrientation) || 3,
      wearX: Number(t.wearX) || 0.0,
      wearZ: Number(t.wearZ) || 0.0,
      wearRadius: Number(t.wearRadius) || 0.0,
      notes: t.notes || '',
      isPreset: false
    }));

    return { success: true, tools: cleanedTools };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Invalid JSON syntax' };
  }
}
