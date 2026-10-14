import { DrawingData, MachineSpec, MaterialSpec, ToolpathSegment, CustomTool, ActiveToolAssignments } from '../types/cnc';

export interface GCodeGeneratorOptions {
  programNumber: string; // e.g. "0001"
  cannedCycleMode: 'g71_canned' | 'swiss_single_pass';
  maxSpindleRpmLimit: number; // G50 Sxxxx
  useCss: boolean; // G96 vs G97
  vcRough: number; // m/min
  vcFinish: number; // m/min
  feedRough: number; // mm/rev
  feedFinish: number; // mm/rev
  toolNoseRadius: number; // mm
  roughDoc: number; // mm
  finishAllowanceX: number; // mm on diameter
  finishAllowanceZ: number; // mm
  partingFeed: number; // mm/rev
  partingWidth: number; // mm
  toolLibrary?: CustomTool[];
  toolAssignments?: ActiveToolAssignments;
}

export interface GeneratedGCodeResult {
  code: string;
  segments: ToolpathSegment[];
  estimatedCycleTimeSec: number;
}

export function generateFanucGCode(
  drawing: DrawingData,
  machine: MachineSpec,
  material: MaterialSpec,
  options: Partial<GCodeGeneratorOptions> = {}
): GeneratedGCodeResult {
  const barDia = drawing.workpiece.diameter_or_width_mm;
  const rawDia = Number((barDia + 0.4).toFixed(2));
  const progNum = options.programNumber || '0001';
  const cannedCycle = options.cannedCycleMode || (machine.type === 'swiss' ? 'swiss_single_pass' : 'g71_canned');

  // Resolve Active Tools from Custom Tool Library
  const tools = options.toolLibrary || [];
  const assignments = options.toolAssignments;

  const roughTool: CustomTool = (assignments?.roughOdToolId && tools.find(t => t.id === assignments.roughOdToolId)) ||
    tools.find(t => t.type === 'rough_od') || {
      id: 'default-rough',
      toolNumber: 'T0101',
      station: 1,
      offsetNumber: 1,
      name: 'Main OD Roughing & Facing',
      type: 'rough_od',
      hand: 'right',
      insertCode: 'WNMG 080408',
      insertShape: 'W_80_trigon',
      noseRadius: 0.40,
      maxDoc: 1.20,
      shankSize: '12x12 mm',
      coatingGrade: 'TiAlN',
      xOffset: 0.0,
      zOffset: 0.0,
      tipOrientation: 3,
      wearX: 0.0,
      wearZ: 0.0,
      wearRadius: 0.0
    };

  const finishTool: CustomTool = (assignments?.finishOdToolId && tools.find(t => t.id === assignments.finishOdToolId)) ||
    tools.find(t => t.type === 'finish_od') || {
      id: 'default-finish',
      toolNumber: 'T0505',
      station: 5,
      offsetNumber: 5,
      name: 'Precision Finishing OD',
      type: 'finish_od',
      hand: 'right',
      insertCode: 'VBMT 110302',
      insertShape: 'V_35_diamond',
      noseRadius: 0.20,
      maxDoc: 0.40,
      shankSize: '12x12 mm',
      coatingGrade: 'TiCN/Al2O3',
      xOffset: -0.012,
      zOffset: 0.025,
      tipOrientation: 3,
      wearX: 0.0,
      wearZ: 0.0,
      wearRadius: 0.0
    };

  const threadTool: CustomTool = (assignments?.threadToolId && tools.find(t => t.id === assignments.threadToolId)) ||
    tools.find(t => t.type === 'thread') || {
      id: 'default-thread',
      toolNumber: 'T0202',
      station: 2,
      offsetNumber: 2,
      name: '60° Laydown Threading',
      type: 'thread',
      hand: 'right',
      insertCode: '16ER AG60',
      insertShape: 'T_60_triangle',
      noseRadius: 0.05,
      insertWidth: 1.5,
      maxDoc: 0.25,
      shankSize: '12x12 mm',
      coatingGrade: 'TiAlN',
      xOffset: 0.0,
      zOffset: 0.0,
      tipOrientation: 3,
      wearX: 0.0,
      wearZ: 0.0,
      wearRadius: 0.0
    };

  const grooveTool: CustomTool = (assignments?.grooveToolId && tools.find(t => t.id === assignments.grooveToolId)) ||
    tools.find(t => t.type === 'groove') || {
      id: 'default-groove',
      toolNumber: 'T0303',
      station: 3,
      offsetNumber: 3,
      name: 'Precision Grooving',
      type: 'groove',
      hand: 'neutral',
      insertCode: 'GDM 1.5-0.10',
      insertShape: 'groove_partoff',
      noseRadius: 0.10,
      insertWidth: 1.50,
      maxDoc: 2.50,
      shankSize: '12x12 mm',
      coatingGrade: 'TiAlN',
      xOffset: 0.0,
      zOffset: 0.0,
      tipOrientation: 3,
      wearX: 0.0,
      wearZ: 0.0,
      wearRadius: 0.0
    };

  const cutoffTool: CustomTool = (assignments?.cutoffToolId && tools.find(t => t.id === assignments.cutoffToolId)) ||
    tools.find(t => t.type === 'part_off') || {
      id: 'default-cutoff',
      toolNumber: 'T0404',
      station: 4,
      offsetNumber: 4,
      name: 'Cutoff / Parting Blade',
      type: 'part_off',
      hand: 'neutral',
      insertCode: 'N153.2-200',
      insertShape: 'groove_partoff',
      noseRadius: 0.10,
      insertWidth: 2.00,
      maxDoc: 8.00,
      shankSize: '12x12 mm',
      coatingGrade: 'TiAlN',
      xOffset: 0.0,
      zOffset: 0.0,
      tipOrientation: 3,
      wearX: 0.0,
      wearZ: 0.0,
      wearRadius: 0.0
    };
  
  // Safe clamped RPM: Never exceed machine max RPM
  const machineMaxRpm = machine.maxRpmMain || 10000;
  const g50Rpm = Math.min(options.maxSpindleRpmLimit || 4500, machineMaxRpm);
  
  const matSpeedMult = material.speedMultiplier ?? material.speedFeedMultiplier ?? 1.0;
  const matFeedMult = material.feedMultiplier ?? material.speedFeedMultiplier ?? 1.0;

  const baseVcRough = Math.round(material.vcRough[0] * matSpeedMult);
  const baseVcFinish = Math.round(material.vcFinish[1] * matSpeedMult);
  const baseFeedRough = Number((material.feedRough[0] * matFeedMult).toFixed(3));
  const baseFeedFinish = Number((material.feedFinish[0] * matFeedMult).toFixed(3));
  const baseFeedParting = Number((material.feedParting[0] * matFeedMult).toFixed(3));

  const vcRough = (roughTool.useCustomCuttingData && roughTool.customVc) || options.vcRough || baseVcRough;
  const vcFinish = (finishTool.useCustomCuttingData && finishTool.customVc) || options.vcFinish || baseVcFinish;
  const feedRough = (roughTool.useCustomCuttingData && roughTool.customFeed) || options.feedRough || baseFeedRough;
  const feedFinish = (finishTool.useCustomCuttingData && finishTool.customFeed) || options.feedFinish || baseFeedFinish;
  const roughDoc = Math.min(options.roughDoc || material.depthRough[0], roughTool.maxDoc || 2.0);
  const uFinishAllowance = options.finishAllowanceX || 0.3; // mm on dia
  const wFinishAllowance = options.finishAllowanceZ || 0.05; // mm on Z
  const partingFeed = options.partingFeed || baseFeedParting;
  const partingWidth = cutoffTool.insertWidth || options.partingWidth || 2.0;

  const lines: string[] = [];
  const segments: ToolpathSegment[] = [];
  let lineNumber = 10;
  let currentX = rawDia + 20;
  let currentZ = 50;

  function addLine(text: string) {
    lines.push(text);
  }

  function addBlock(cmd: string, comment?: string) {
    const paddedNum = `N${lineNumber}`;
    const commentPart = comment ? ` (${comment})` : '';
    lines.push(`${paddedNum} ${cmd}${commentPart}`);
    lineNumber += 10;
  }

  function recordMove(type: ToolpathSegment['type'], x: number, z: number, cmd: string, feed?: number, radius?: number, activeTool: string = roughTool.toolNumber) {
    segments.push({
      type,
      x1: currentX,
      z1: currentZ,
      x2: x,
      z2: z,
      feed,
      radius,
      codeLine: cmd,
      lineNumber,
      toolNumber: activeTool,
      gcodeLineIndex: Math.max(0, lines.length - 1)
    });
    currentX = x;
    currentZ = z;
  }

  // Header & Fanuc Tool Setup Sheet
  addLine('%');
  addLine(`O${progNum} (${drawing.part_name.toUpperCase().replace(/[^A-Z0-9_-]/g, '_')} - ${material.code} DIA:${barDia}MM)`);
  addLine(';');
  addLine('(================ FANUC TOOL & MATERIAL SETUP SHEET ================)');
  addLine(`( MATERIAL  : ${material.code} [${material.name}] SPEED_MULT: ${(matSpeedMult * 100).toFixed(0)}% FEED_MULT: ${(matFeedMult * 100).toFixed(0)}% )`);
  addLine(`( ROUGH OD  : ${roughTool.toolNumber} [${roughTool.name} - ${roughTool.insertCode}] R=${roughTool.noseRadius.toFixed(2)} X=${roughTool.xOffset.toFixed(3)} Z=${roughTool.zOffset.toFixed(3)} TIP=${roughTool.tipOrientation} )`);
  addLine(`( FINISH OD : ${finishTool.toolNumber} [${finishTool.name} - ${finishTool.insertCode}] R=${finishTool.noseRadius.toFixed(2)} X=${finishTool.xOffset.toFixed(3)} Z=${finishTool.zOffset.toFixed(3)} TIP=${finishTool.tipOrientation} )`);
  addLine(`( THREADING : ${threadTool.toolNumber} [${threadTool.name} - ${threadTool.insertCode}] R=${threadTool.noseRadius.toFixed(2)} X=${threadTool.xOffset.toFixed(3)} Z=${threadTool.zOffset.toFixed(3)} TIP=${threadTool.tipOrientation} )`);
  addLine(`( GROOVING  : ${grooveTool.toolNumber} [${grooveTool.name} - ${grooveTool.insertCode}] W=${(grooveTool.insertWidth || 1.5).toFixed(2)} R=${grooveTool.noseRadius.toFixed(2)} X=${grooveTool.xOffset.toFixed(3)} Z=${grooveTool.zOffset.toFixed(3)} TIP=${grooveTool.tipOrientation} )`);
  addLine(`( CUTOFF    : ${cutoffTool.toolNumber} [${cutoffTool.name} - ${cutoffTool.insertCode}] W=${(cutoffTool.insertWidth || 2.0).toFixed(2)} R=${cutoffTool.noseRadius.toFixed(2)} X=${cutoffTool.xOffset.toFixed(3)} Z=${cutoffTool.zOffset.toFixed(3)} TIP=${cutoffTool.tipOrientation} )`);
  addLine('(========================================================)');
  addLine(';');
  addBlock('G18 G40 G97 G99', 'ZX plane, cancel cutter comp, RPM mode, feed per rev');
  addBlock('G28 U0 W0', 'Home return X and Z');
  addBlock(`${roughTool.toolNumber.slice(0, 3)}00 M42`, `Tool ${roughTool.station} index, spindle high gear range`);
  addLine(';');
  
  // Spindle start with mandatory G50
  lines.push('(--- MAIN SPINDLE START ---)');
  addBlock(`G50 S${g50Rpm}`, 'Mandatory max spindle speed limit for CSS');
  addBlock(`G96 S${vcRough} M03`, `Constant surface speed ${vcRough} m/min, spindle CW`);
  addBlock('M08', 'Coolant ON');
  addLine(';');

  // Tool 1: Facing
  lines.push(`(--- OPERATION 1: FACING [${roughTool.toolNumber} ${roughTool.name}] ---)`);
  const faceStartDia = Number((barDia + 1.2).toFixed(2));
  addBlock(`${roughTool.toolNumber}`, `Offset ${roughTool.offsetNumber} active`);
  addBlock(`G00 X${faceStartDia} Z1.0`, 'Rapid approach clearance');
  recordMove('rapid', faceStartDia, 1.0, `G00 X${faceStartDia} Z1.0`, undefined, undefined, roughTool.toolNumber);
  
  addBlock(`G00 Z0.05`, 'Position for face skim');
  recordMove('rapid', faceStartDia, 0.05, `G00 Z0.05`, undefined, undefined, roughTool.toolNumber);

  addBlock(`G01 X-0.5 F${feedFinish}`, 'Face to center past X0');
  recordMove('cut', -0.5, 0.05, `G01 X-0.5 F${feedFinish}`, feedFinish, undefined, roughTool.toolNumber);

  addBlock(`G00 Z1.0`, 'Retract in Z');
  recordMove('rapid', -0.5, 1.0, `G00 Z1.0`, undefined, undefined, roughTool.toolNumber);

  addBlock(`G00 X${faceStartDia}`, 'Retract in X');
  recordMove('rapid', faceStartDia, 1.0, `G00 X${faceStartDia}`, undefined, undefined, roughTool.toolNumber);
  addLine(';');

  // Find min turned diameter from contour, sorted monotonically in Z
  const turnedPoints = [...drawing.contour_points
    .filter(p => p.type !== 'start' && p.type !== 'face' && p.type !== 'cutoff')]
    .sort((a, b) => b.z_coordinate - a.z_coordinate);
  const minProfileDia = turnedPoints.length > 0 ? Math.min(...turnedPoints.map(p => p.x_diameter)) : barDia;
  const endZProfile = drawing.contour_points.find(p => p.type === 'cutoff')?.z_coordinate || -drawing.workpiece.length_mm;

  if (cannedCycle === 'g71_canned') {
    // Standard CNC Lathe G71 Roughing + G70 Finishing
    lines.push('(--- OPERATION 2: G71 ROUGH LONGITUDINAL TURNING ---)');
    addBlock(`G00 X${(barDia + 1.0).toFixed(2)} Z0.5`, 'Cycle start clearance');
    recordMove('rapid', barDia + 1.0, 0.5, `G00 X${(barDia + 1.0).toFixed(2)} Z0.5`);

    // G71 Two-Line Fanuc Format
    const pStartBlock = lineNumber + 20;
    // Calculate how many blocks profile will take
    const pEndBlock = pStartBlock + (turnedPoints.length * 10) + 10;
    
    addBlock(`G71 U${roughDoc.toFixed(2)} R0.5`, 'DoC per pass, retract relief');
    addBlock(`G71 P${pStartBlock} Q${pEndBlock} U${uFinishAllowance.toFixed(2)} W${wFinishAllowance.toFixed(2)} F${feedRough}`, 'G71 profile bounds and finish stock');
    
    // Profile definition (P to Q)
    lines.push(`(--- PROFILE BOUNDS N${pStartBlock} - N${pEndBlock} ---)`);
    lineNumber = pStartBlock;
    
    // First profile block (G01 with both X and Z for Fanuc G71 Type II pocket capability)
    const firstPoint = turnedPoints[0] || { x_diameter: minProfileDia, z_coordinate: 0.0 };
    addBlock(`G01 X${firstPoint.x_diameter.toFixed(2)} Z0.0 F${feedFinish}`, 'Start profile contour');
    recordMove('cut', firstPoint.x_diameter, 0.0, `G01 X${firstPoint.x_diameter.toFixed(2)} Z0.0`, feedFinish);

    for (let i = 0; i < turnedPoints.length; i++) {
      const pt = turnedPoints[i];
      if (pt.type === 'thread' || pt.type === 'groove') continue; // Thread and groove done separately

      if (pt.type === 'arc_cw' && pt.radius) {
        addBlock(`G02 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)} R${pt.radius.toFixed(2)}`, 'Arc CW');
        recordMove('arc_cw', pt.x_diameter, pt.z_coordinate, `G02 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)} R${pt.radius.toFixed(2)}`, feedFinish, pt.radius);
      } else if (pt.type === 'arc_ccw' && pt.radius) {
        addBlock(`G03 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)} R${pt.radius.toFixed(2)}`, 'Arc CCW');
        recordMove('arc_ccw', pt.x_diameter, pt.z_coordinate, `G03 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)} R${pt.radius.toFixed(2)}`, feedFinish, pt.radius);
      } else {
        addBlock(`G01 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)}`, `Profile to Z${pt.z_coordinate.toFixed(2)}`);
        recordMove('cut', pt.x_diameter, pt.z_coordinate, `G01 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)}`, feedFinish);
      }
    }

    // Profile exit block N(pEndBlock)
    lineNumber = pEndBlock;
    addBlock(`G01 X${(barDia + 1.0).toFixed(2)}`, 'Clearance retract at profile end');
    recordMove('cut', barDia + 1.0, currentZ, `G01 X${(barDia + 1.0).toFixed(2)}`);
    lineNumber += 10;
    addLine(';');

    // G70 Finishing
    lines.push(`(--- OPERATION 3: G70 FINISH CONTOUR [${finishTool.toolNumber} ${finishTool.name}] ---)`);
    if (finishTool.toolNumber !== roughTool.toolNumber) {
      addBlock(`${finishTool.toolNumber}`, `Offset ${finishTool.offsetNumber} active`);
    }
    addBlock(`G96 S${vcFinish} M03`, `Finish surface speed ${vcFinish} m/min`);
    addBlock(`G00 X${(barDia + 1.0).toFixed(2)} Z0.5`, 'Position for finish cycle');
    recordMove('rapid', barDia + 1.0, 0.5, `G00 X${(barDia + 1.0).toFixed(2)} Z0.5`, undefined, undefined, finishTool.toolNumber);
    addBlock(`G70 P${pStartBlock} Q${pEndBlock}`, 'Execute finish profile pass');
    addBlock(`G00 X${(barDia + 4.0).toFixed(2)} Z10.0`, 'Clearance retract');
    recordMove('rapid', barDia + 4.0, 10.0, `G00 X${(barDia + 4.0).toFixed(2)} Z10.0`, undefined, undefined, finishTool.toolNumber);
    addLine(';');

  } else {
    // Swiss-Type Direct Finish Turning (Guide Bushing supported)
    lines.push(`(--- OPERATION 2: SWISS DIRECT FINISH TURNING [${finishTool.toolNumber} ${finishTool.name}] ---)`);
    lines.push('(Material supported directly by carbide guide bushing. Precision turned in single pass.)');
    if (finishTool.toolNumber !== roughTool.toolNumber) {
      addBlock(`${finishTool.toolNumber}`, `Offset ${finishTool.offsetNumber} active`);
    }
    addBlock(`G96 S${vcFinish} M03`, `Finish surface speed ${vcFinish} m/min`);
    addBlock(`G00 X${(barDia + 0.8).toFixed(2)} Z0.5`, 'Rapid approach');
    recordMove('rapid', barDia + 0.8, 0.5, `G00 X${(barDia + 0.8).toFixed(2)} Z0.5`, undefined, undefined, finishTool.toolNumber);

    addBlock(`G01 Z0.0 F${feedFinish}`, 'Touch face');
    recordMove('cut', barDia + 0.8, 0.0, `G01 Z0.0`, feedFinish, undefined, finishTool.toolNumber);

    for (const pt of turnedPoints) {
      if (pt.type === 'thread' || pt.type === 'groove') continue;

      if (pt.type === 'chamfer' && pt.chamfer) {
        addBlock(`G01 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)} F${feedFinish}`, `Lead-in chamfer C${pt.chamfer}`);
        recordMove('cut', pt.x_diameter, pt.z_coordinate, `G01 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)}`, feedFinish, undefined, finishTool.toolNumber);
      } else if (pt.type === 'arc_cw' && pt.radius) {
        addBlock(`G02 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)} R${pt.radius.toFixed(2)} F${feedFinish}`, 'Fillet arc CW');
        recordMove('arc_cw', pt.x_diameter, pt.z_coordinate, `G02 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)} R${pt.radius.toFixed(2)}`, feedFinish, pt.radius, finishTool.toolNumber);
      } else if (pt.type === 'arc_ccw' && pt.radius) {
        addBlock(`G03 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)} R${pt.radius.toFixed(2)} F${feedFinish}`, 'Fillet arc CCW');
        recordMove('arc_ccw', pt.x_diameter, pt.z_coordinate, `G03 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)} R${pt.radius.toFixed(2)}`, feedFinish, pt.radius, finishTool.toolNumber);
      } else {
        addBlock(`G01 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)} F${feedFinish}`, `Turn dia ${pt.x_diameter.toFixed(2)}`);
        recordMove('cut', pt.x_diameter, pt.z_coordinate, `G01 X${pt.x_diameter.toFixed(2)} Z${pt.z_coordinate.toFixed(2)}`, feedFinish, undefined, finishTool.toolNumber);
      }
    }

    addBlock(`G00 X${(barDia + 1.5).toFixed(2)}`, 'Retract X off finished diameter');
    recordMove('rapid', barDia + 1.5, currentZ, `G00 X${(barDia + 1.5).toFixed(2)}`, undefined, undefined, finishTool.toolNumber);
    addBlock(`G00 Z1.0`, 'Retract Z');
    recordMove('rapid', barDia + 1.5, 1.0, `G00 Z1.0`, undefined, undefined, finishTool.toolNumber);
    addLine(';');
  }

  // Operation: Threading (if thread points present)
  const threadPoint = drawing.contour_points.find(p => p.type === 'thread');
  if (threadPoint && threadPoint.thread_pitch) {
    lines.push(`(--- OPERATION: G76 MULTI-PASS THREADING [${threadTool.toolNumber} ${threadTool.name}] ---)`);
    addBlock(`${threadTool.toolNumber}`, `Offset ${threadTool.offsetNumber} active`);
    const thDia = threadPoint.x_diameter;
    const thPitch = threadPoint.thread_pitch;
    const thDepth = threadPoint.thread_depth || Number((0.6134 * thPitch).toFixed(3));
    const thLeadInZ = 2.0 * thPitch;
    const thEndZ = threadPoint.z_coordinate;

    addBlock(`G97 S${Math.min(2200, Math.round((1000 * material.vcThreading[0]) / (Math.PI * thDia)))} M03`, 'Constant RPM mode for threading synchronization');
    addBlock(`G00 X${(thDia + 2.0).toFixed(2)} Z${thLeadInZ.toFixed(2)}`, 'Thread clearance entry point');
    recordMove('rapid', thDia + 2.0, thLeadInZ, `G00 X${(thDia + 2.0).toFixed(2)} Z${thLeadInZ.toFixed(2)}`, undefined, undefined, threadTool.toolNumber);

    // G76 Fanuc 2-Line Format
    // Line 1: G76 P(m)(r)(a) Q(dmin) R(d)
    // Line 2: G76 X(core_dia) Z(end_Z) P(height) Q(first_cut) F(pitch)
    const coreDia = Number((thDia - 2 * thDepth).toFixed(3));
    const pParam = '020060'; // 02 spring passes, 00 chamfer pullout, 60 deg angle
    const qMinDocMicrons = 30; // 0.030 mm in microns
    const rFinishingAllowance = 0.02; // mm
    const pHeightMicrons = Math.round(thDepth * 1000);
    const qFirstCutMicrons = Math.min(150, Math.round(thDepth * 350));

    addBlock(`G76 P${pParam} Q${qMinDocMicrons} R${rFinishingAllowance.toFixed(2)}`, '2 finish passes, 60 deg infeed, 0.02mm finish stock');
    addBlock(`G76 X${coreDia.toFixed(3)} Z${thEndZ.toFixed(2)} P${pHeightMicrons} Q${qFirstCutMicrons} F${thPitch.toFixed(3)}`, `Root dia ${coreDia}, pitch ${thPitch}mm`);
    recordMove('thread', coreDia, thEndZ, `G76 X${coreDia.toFixed(3)} Z${thEndZ.toFixed(2)} P${pHeightMicrons} F${thPitch.toFixed(3)}`, undefined, undefined, threadTool.toolNumber);

    addBlock(`G00 X${(barDia + 4.0).toFixed(2)} Z5.0`, 'Clearance retract');
    recordMove('rapid', barDia + 4.0, 5.0, `G00 X${(barDia + 4.0).toFixed(2)} Z5.0`, undefined, undefined, threadTool.toolNumber);
    addLine(';');
  }

  // Operation: Grooving (if groove points present)
  const groovePoint = drawing.contour_points.find(p => p.type === 'groove');
  if (groovePoint) {
    const grWidth = grooveTool.insertWidth || 1.5;
    lines.push(`(--- OPERATION: GROOVING / UNDERCUT [${grooveTool.toolNumber} ${grooveTool.name}] ---)`);
    addBlock(`${grooveTool.toolNumber}`, `Offset ${grooveTool.offsetNumber} active`);
    addBlock(`G97 S${Math.round((1000 * material.vcParting[0]) / (Math.PI * barDia))} M03`, 'RPM mode for grooving');
    addBlock(`G00 X${(barDia + 1.0).toFixed(2)} Z${groovePoint.z_coordinate.toFixed(2)}`, 'Align over groove center');
    recordMove('rapid', barDia + 1.0, groovePoint.z_coordinate, `G00 X${(barDia + 1.0).toFixed(2)} Z${groovePoint.z_coordinate.toFixed(2)}`, undefined, undefined, grooveTool.toolNumber);

    addBlock(`G01 X${groovePoint.x_diameter.toFixed(2)} F${partingFeed}`, 'Plunge groove to minor dia');
    recordMove('cut', groovePoint.x_diameter, groovePoint.z_coordinate, `G01 X${groovePoint.x_diameter.toFixed(2)} F${partingFeed}`, partingFeed, undefined, grooveTool.toolNumber);

    addBlock('G04 X0.2', 'Dwell 0.2s for clean bottom finish');
    
    addBlock(`G00 X${(barDia + 1.0).toFixed(2)}`, 'Retract from groove');
    recordMove('rapid', barDia + 1.0, groovePoint.z_coordinate, `G00 X${(barDia + 1.0).toFixed(2)}`, undefined, undefined, grooveTool.toolNumber);
    addLine(';');
  }

  // Operation: Cutoff / Parting
  const cutoffPoint = drawing.contour_points.find(p => p.type === 'cutoff');
  const cutoffZ = cutoffPoint ? cutoffPoint.z_coordinate : endZProfile - 1.5;

  lines.push(`(--- OPERATION: PARTING-OFF [${cutoffTool.toolNumber} ${cutoffTool.name}] ---)`);
  addBlock(`${cutoffTool.toolNumber}`, `Offset ${cutoffTool.offsetNumber} active`);
  addBlock(`G50 S3000`, 'Spindle clamp for parting');
  addBlock(`G96 S${material.vcParting[0]} M03`, `Parting CSS ${material.vcParting[0]} m/min`);
  addBlock(`G00 X${(barDia + 1.0).toFixed(2)} Z${cutoffZ.toFixed(2)}`, 'Approach cutoff line');
  recordMove('rapid', barDia + 1.0, cutoffZ, `G00 X${(barDia + 1.0).toFixed(2)} Z${cutoffZ.toFixed(2)}`, undefined, undefined, cutoffTool.toolNumber);

  // Plunge until 1.5mm from center, then reduce feed to avoid pip and catching
  addBlock(`G01 X1.50 F${partingFeed}`, 'Parting plunge outer body');
  recordMove('cut', 1.50, cutoffZ, `G01 X1.50 F${partingFeed}`, partingFeed, undefined, cutoffTool.toolNumber);

  const reducedFeed = Math.max(0.015, Number((partingFeed * 0.6).toFixed(3)));
  addBlock(`G01 X-0.40 F${reducedFeed}`, 'Drop off part past center (reduced feed prevents pip)');
  recordMove('cut', -0.40, cutoffZ, `G01 X-0.40 F${reducedFeed}`, reducedFeed, undefined, cutoffTool.toolNumber);

  addBlock(`G00 X${(barDia + 5.0).toFixed(2)}`, 'Retract X');
  recordMove('rapid', barDia + 5.0, cutoffZ, `G00 X${(barDia + 5.0).toFixed(2)}`);
  addLine(';');

  // Program End
  lines.push('(--- PROGRAM END & SAFE SHUTDOWN ---)');
  addBlock('M09', 'Coolant OFF');
  addBlock('M05', 'Spindle STOP');
  addBlock('G28 U0 W0', 'Home return reference axes');
  addBlock('M30', 'Program end & memory rewind');
  addLine('%');

  // Approximate cycle time calculation based on rapid distance & cutting moves
  let totalTime = 4.0; // tool index and startup
  for (const seg of segments) {
    const dx = Math.abs(seg.x2 - seg.x1) / 2; // radius delta
    const dz = Math.abs(seg.z2 - seg.z1);
    const dist = Math.hypot(dx, dz);
    if (seg.type === 'rapid') {
      totalTime += (dist / (20000 / 60)); // 20 m/min rapid
    } else {
      const safeFeed = Math.max(0.005, seg.feed || feedFinish);
      // RPM average ~ 3000
      const feedRateMmMin = Math.max(10, 3000 * safeFeed);
      totalTime += (dist / (feedRateMmMin / 60));
    }
  }

  return {
    code: lines.join('\n'),
    segments,
    estimatedCycleTimeSec: isNaN(totalTime) ? 15 : Math.max(8, Number(totalTime.toFixed(1)))
  };
}
