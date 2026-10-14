export interface CuttingCalculations {
  rpm: number;
  vc: number; // m/min
  feedRatePerMin: number; // mm/min
  feedPerRev: number; // mm/rev
  depthOfCut: number; // mm
  mrrCm3Min: number; // cm3/min
  theoreticalRa: number; // um
  theoreticalRmax: number; // um
  powerKw: number; // kW
  torqueNm: number; // Nm
}

export function calculateCuttingParameters(
  diameterMm: number,
  vcMMin: number,
  feedMmRev: number,
  depthOfCutMm: number,
  kc1_1Nmm2: number = 2100,
  toolNoseRadiusMm: number = 0.4
): CuttingCalculations {
  const safeDia = Math.max(0.1, diameterMm);
  // N = (1000 * Vc) / (pi * D)
  const rpm = Math.round((1000 * vcMMin) / (Math.PI * safeDia));
  const feedRatePerMin = Number((rpm * feedMmRev).toFixed(1));
  
  // MRR = (Vc * 1000 * depthOfCut * feedMmRev) / 1000 = Vc * ap * f cm3/min?
  // MRR cm3/min = (Vc m/min * 1000 mm/m * depthOfCut mm * feedMmRev mm/rev) / 1000 = Vc * ap * f
  const mrrCm3Min = Number((vcMMin * depthOfCutMm * feedMmRev).toFixed(2));

  // Surface roughness: Ra = (f^2 / (32 * r_eps)) * 1000 [in micrometers]
  const safeRadius = Math.max(0.05, toolNoseRadiusMm);
  const theoreticalRa = Number(((Math.pow(feedMmRev, 2) / (32 * safeRadius)) * 1000).toFixed(2));
  const theoreticalRmax = Number(((Math.pow(feedMmRev, 2) / (8 * safeRadius)) * 1000).toFixed(2));

  // Cutting power: Pc (kW) = (ap * f * Vc * kc) / (60 * 10^3 * efficiency(0.85))
  const powerKw = Number(((depthOfCutMm * feedMmRev * vcMMin * kc1_1Nmm2) / (60000 * 0.85)).toFixed(2));

  // Torque: T = (9550 * P) / N
  const torqueNm = rpm > 0 ? Number(((9550 * powerKw) / rpm).toFixed(2)) : 0;

  return {
    rpm,
    vc: vcMMin,
    feedRatePerMin,
    feedPerRev: feedMmRev,
    depthOfCut: depthOfCutMm,
    mrrCm3Min,
    theoreticalRa,
    theoreticalRmax,
    powerKw,
    torqueNm
  };
}

export interface GuideBushingCheck {
  nominalDia: number;
  actualDia: number;
  actualClearance: number; // mm
  targetMin: number; // 0.005 mm
  targetMax: number; // 0.015 mm
  status: 'too_tight' | 'optimal' | 'too_loose';
  statusLabel: string;
  recommendation: string;
}

export function evaluateGuideBushing(
  nominalDia: number,
  actualBarDia: number,
  guideBushingSetDia: number
): GuideBushingCheck {
  const actualClearance = Number((guideBushingSetDia - actualBarDia).toFixed(4));
  const targetMin = 0.005;
  const targetMax = 0.015;

  let status: 'too_tight' | 'optimal' | 'too_loose' = 'optimal';
  let statusLabel = 'Optimal Clearance (+0.005 to +0.015 mm)';
  let recommendation = 'Carbide guide bushing clearance is within ideal shop-floor range. Low vibration, zero galling risk.';

  if (actualClearance < targetMin) {
    status = 'too_tight';
    statusLabel = 'DANGER: Clearance Too Tight (< +0.005 mm)';
    recommendation = `CRITICAL RISK: Galling/scoring of carbide bushing or bar jamming. Back off guide bushing adjusting nut by ${(targetMin - actualClearance).toFixed(3)} mm immediately.`;
  } else if (actualClearance > targetMax) {
    status = 'too_loose';
    statusLabel = 'WARNING: Clearance Too Loose (> +0.015 mm)';
    recommendation = `Excessive clearance will induce part deflection, chatter marks, and taper error on long turned segments. Tighten sleeve collet by ${(actualClearance - targetMax).toFixed(3)} mm.`;
  }

  return {
    nominalDia,
    actualDia: actualBarDia,
    actualClearance,
    targetMin,
    targetMax,
    status,
    statusLabel,
    recommendation
  };
}
