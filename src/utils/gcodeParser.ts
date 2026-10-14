// Fanuc CNC Lathe G-Code Parser & Backplot Segment Reconstructor
import { ToolpathSegment } from '../types/cnc';

export interface ParsedGCodeResult {
  segments: ToolpathSegment[];
  programNumber: string;
  operations: {
    name: string;
    startStep: number;
    endStep: number;
    toolNumber: string;
    type: string;
  }[];
  totalLengthMm: number;
  minZ: number;
  maxZ: number;
  minX: number;
  maxX: number;
  toolsUsed: string[];
}

/**
 * Parses raw Fanuc G-code program into backplot segments, tracking modal coordinates and operations.
 */
export function parseFanucGCode(
  code: string,
  rawStockDia: number = 20,
  fallbackTool: string = 'T0101'
): ParsedGCodeResult {
  const lines = code.split('\n');
  const segments: ToolpathSegment[] = [];
  const operations: ParsedGCodeResult['operations'] = [];
  const toolsUsedSet = new Set<string>();

  let progNumber = '0001';
  let curX = rawStockDia + 2.0;
  let curZ = 2.0;
  let curFeed = 0.15;
  let curMotion: 'G00' | 'G01' | 'G02' | 'G03' = 'G00';
  let curTool = fallbackTool;
  let curOpName = 'Initialization';
  let opStartStep = 0;

  let minZ = 0;
  let maxZ = 2.0;
  let minX = 0;
  let maxX = rawStockDia + 2.0;
  let totalLengthMm = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];
    const cleanLine = rawLine.trim();

    if (!cleanLine || cleanLine.startsWith('%') || cleanLine.startsWith(';')) {
      continue;
    }

    // Program name / number (O0001)
    const oMatch = cleanLine.match(/O(\d+)/i);
    if (oMatch) {
      progNumber = oMatch[1];
    }

    // Operation comment banner e.g. (--- OPERATION: FACING ---)
    const opCommentMatch = cleanLine.match(/\(---+\s*(?:OPERATION\s*\d*:\s*)?([^)]+?)---+?\)/i);
    if (opCommentMatch) {
      if (segments.length > opStartStep) {
        operations.push({
          name: curOpName,
          startStep: opStartStep,
          endStep: segments.length - 1,
          toolNumber: curTool,
          type: detectOpType(curOpName)
        });
      }
      curOpName = opCommentMatch[1].trim();
      opStartStep = segments.length;
    }

    // Tool call (T0101, T0505, T101)
    const toolMatch = cleanLine.match(/\bT(\d{2,4})\b/i);
    if (toolMatch) {
      curTool = `T${toolMatch[1]}`;
      toolsUsedSet.add(curTool);
    }

    // Strip comments for word scanning
    const codePart = cleanLine.replace(/\(.*?\)/g, '').trim();
    if (!codePart) continue;

    // Words extraction
    const words = codePart.split(/\s+/);
    let targetX = curX;
    let targetZ = curZ;
    let hasX = false;
    let hasZ = false;
    let arcRadius: number | undefined = undefined;
    let explicitFeed: number | undefined = undefined;

    for (const w of words) {
      const upper = w.toUpperCase();
      // Motion mode
      if (upper === 'G00' || upper === 'G0') curMotion = 'G00';
      else if (upper === 'G01' || upper === 'G1') curMotion = 'G01';
      else if (upper === 'G02' || upper === 'G2') curMotion = 'G02';
      else if (upper === 'G03' || upper === 'G3') curMotion = 'G03';

      // Absolute Coordinates X and Z
      if (upper.startsWith('X')) {
        const val = parseFloat(upper.slice(1));
        if (!isNaN(val)) {
          targetX = val;
          hasX = true;
        }
      } else if (upper.startsWith('Z')) {
        const val = parseFloat(upper.slice(1));
        if (!isNaN(val)) {
          targetZ = val;
          hasZ = true;
        }
      }
      // Incremental coords U and W
      else if (upper.startsWith('U')) {
        const val = parseFloat(upper.slice(1));
        if (!isNaN(val)) {
          targetX = curX + val;
          hasX = true;
        }
      } else if (upper.startsWith('W')) {
        const val = parseFloat(upper.slice(1));
        if (!isNaN(val)) {
          targetZ = curZ + val;
          hasZ = true;
        }
      }
      // Radius R
      else if (upper.startsWith('R')) {
        const val = parseFloat(upper.slice(1));
        if (!isNaN(val)) arcRadius = val;
      }
      // Feedrate F
      else if (upper.startsWith('F')) {
        const val = parseFloat(upper.slice(1));
        if (!isNaN(val)) {
          curFeed = val;
          explicitFeed = val;
        }
      }
    }

    // Fanuc Home Return G28 U0 W0
    if (/G28/i.test(codePart)) {
      const homeX = rawStockDia + 10.0;
      const homeZ = 15.0;
      segments.push({
        type: 'rapid',
        x1: curX,
        z1: curZ,
        x2: homeX,
        z2: homeZ,
        codeLine: cleanLine,
        lineNumber: extractLineNum(cleanLine, lineIdx + 1),
        toolNumber: curTool,
        gcodeLineIndex: lineIdx
      });
      curX = homeX;
      curZ = homeZ;
      continue;
    }

    // If movement occurred
    if (hasX || hasZ) {
      if (Math.abs(targetX - curX) > 1e-4 || Math.abs(targetZ - curZ) > 1e-4) {
        let segType: ToolpathSegment['type'] = 'cut';
        if (curMotion === 'G00') {
          segType = 'rapid';
        } else if (curMotion === 'G02') {
          segType = 'arc_cw';
        } else if (curMotion === 'G03') {
          segType = 'arc_ccw';
        } else if (/G76/i.test(cleanLine) || /G32/i.test(cleanLine) || /thread/i.test(curOpName)) {
          segType = 'thread';
        }

        const moveDist = Math.hypot(targetZ - curZ, (targetX - curX) / 2);
        totalLengthMm += moveDist;

        segments.push({
          type: segType,
          x1: Number(curX.toFixed(3)),
          z1: Number(curZ.toFixed(3)),
          x2: Number(targetX.toFixed(3)),
          z2: Number(targetZ.toFixed(3)),
          radius: arcRadius,
          feed: explicitFeed || (segType === 'rapid' ? undefined : curFeed),
          codeLine: cleanLine,
          lineNumber: extractLineNum(cleanLine, lineIdx + 1),
          toolNumber: curTool,
          gcodeLineIndex: lineIdx
        });

        minZ = Math.min(minZ, curZ, targetZ);
        maxZ = Math.max(maxZ, curZ, targetZ);
        minX = Math.min(minX, curX, targetX);
        maxX = Math.max(maxX, curX, targetX);

        curX = targetX;
        curZ = targetZ;
      }
    }
  }

  // Push final operation
  if (segments.length > opStartStep) {
    operations.push({
      name: curOpName,
      startStep: opStartStep,
      endStep: segments.length - 1,
      toolNumber: curTool,
      type: detectOpType(curOpName)
    });
  }

  return {
    segments,
    programNumber: progNumber,
    operations: operations.length > 0 ? operations : [
      { name: 'Full CNC Cycle', startStep: 0, endStep: Math.max(0, segments.length - 1), toolNumber: fallbackTool, type: 'turn' }
    ],
    totalLengthMm: Number(totalLengthMm.toFixed(2)),
    minZ: Number(minZ.toFixed(2)),
    maxZ: Number(maxZ.toFixed(2)),
    minX: Number(minX.toFixed(2)),
    maxX: Number(maxX.toFixed(2)),
    toolsUsed: Array.from(toolsUsedSet)
  };
}

function extractLineNum(line: string, defaultIdx: number): number {
  const nMatch = line.match(/\bN(\d+)\b/i);
  return nMatch ? parseInt(nMatch[1], 10) : defaultIdx * 10;
}

function detectOpType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('face')) return 'face';
  if (lower.includes('rough')) return 'rough';
  if (lower.includes('finish')) return 'finish';
  if (lower.includes('thread')) return 'thread';
  if (lower.includes('groov')) return 'groove';
  if (lower.includes('part') || lower.includes('cutoff')) return 'cutoff';
  return 'turn';
}
