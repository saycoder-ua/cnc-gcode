// Lathe 2D Geometry & Arc Mathematics Utility

export interface LatheArcResult {
  centerZ: number;
  centerXRscrap: number; // center in radius coordinates (mm)
  radiusMm: number;
  startAngle: number; // radians
  endAngle: number; // radians
  counterClockwise: boolean; // canvas direction
}

/**
 * Calculates arc center and angles in lathe coordinates (Z horizontal, X/2 vertical radius)
 * For Fanuc CNC:
 * G02 is Clockwise in ZX plane (from +X looking along -Y)
 * G03 is Counter-Clockwise in ZX plane
 * R > 0 indicates minor arc (<= 180 deg), R < 0 indicates major arc (> 180 deg)
 */
export function calculateLatheArc(
  z1: number,
  x1Dia: number,
  z2: number,
  x2Dia: number,
  radius: number,
  isCw: boolean
): LatheArcResult | null {
  const r1 = x1Dia / 2;
  const r2 = x2Dia / 2;
  const dz = z2 - z1;
  const dr = r2 - r1;
  const chordDist = Math.hypot(dz, dr);

  if (chordDist < 1e-6 || chordDist > 2 * Math.abs(radius) + 1e-4) {
    // Degenerate arc or impossible radius; fall back to linear
    return null;
  }

  const R = Math.abs(radius);
  const midZ = (z1 + z2) / 2;
  const midR = (r1 + r2) / 2;

  // Distance from chord midpoint to circle center
  const dToCenter = Math.sqrt(Math.max(0, R * R - (chordDist / 2) * (chordDist / 2)));

  // Normal vector perpendicular to chord
  const normZ = -dr / chordDist;
  const normR = dz / chordDist;

  // Sign determines which side of chord the center lies on
  // In lathe ZX coordinate system:
  // If isCw (G02) and R > 0: center is on the right side of the vector (z1,r1) -> (z2,r2)
  const isMajor = radius < 0;
  let side = isCw ? -1 : 1;
  if (isMajor) side = -side;

  const centerZ = midZ + side * normZ * dToCenter;
  const centerR = midR + side * normR * dToCenter;

  const startAngle = Math.atan2(r1 - centerR, z1 - centerZ);
  const endAngle = Math.atan2(r2 - centerR, z2 - centerZ);

  // In standard canvas coords where Y increases downward, canvasY = originY - R * scale
  // We handle angle interpolation carefully
  return {
    centerZ,
    centerXRscrap: centerR,
    radiusMm: R,
    startAngle,
    endAngle,
    counterClockwise: !isCw
  };
}

/**
 * Interpolates point along a circular lathe arc at parameter t (0.0 to 1.0)
 */
export function interpolateArcPoint(
  z1: number,
  x1Dia: number,
  z2: number,
  x2Dia: number,
  radius: number,
  isCw: boolean,
  t: number
): { z: number; xDia: number } {
  const arc = calculateLatheArc(z1, x1Dia, z2, x2Dia, radius, isCw);
  if (!arc) {
    return {
      z: z1 + (z2 - z1) * t,
      xDia: x1Dia + (x2Dia - x1Dia) * t
    };
  }

  let delta = arc.endAngle - arc.startAngle;
  if (isCw) {
    if (delta > 0) delta -= 2 * Math.PI;
  } else {
    if (delta < 0) delta += 2 * Math.PI;
  }

  const currentAngle = arc.startAngle + delta * t;
  const z = arc.centerZ + arc.radiusMm * Math.cos(currentAngle);
  const r = arc.centerXRscrap + arc.radiusMm * Math.sin(currentAngle);

  return {
    z: Number(z.toFixed(4)),
    xDia: Number((r * 2).toFixed(4))
  };
}

/**
 * Generates discretized polygon points for smooth canvas arc rendering
 */
export function generateArcPoints(
  z1: number,
  x1Dia: number,
  z2: number,
  x2Dia: number,
  radius: number,
  isCw: boolean,
  steps: number = 24
): { z: number; xDia: number }[] {
  const pts: { z: number; xDia: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(interpolateArcPoint(z1, x1Dia, z2, x2Dia, radius, isCw, t));
  }
  return pts;
}
