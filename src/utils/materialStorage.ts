import { MaterialSpec, MaterialCategory } from '../types/cnc';
import { MATERIALS } from '../data/materials';

export const MATERIAL_STORAGE_KEY = 'cnc_calc_material_profiles_v1';

export const PRESET_MATERIAL_COLORS: { label: string; hex: string }[] = [
  { label: 'Steel Blue', hex: '#3b82f6' },
  { label: 'Cyan Aluminum', hex: '#06b6d4' },
  { label: 'Brass Gold', hex: '#eab308' },
  { label: 'Titanium Violet', hex: '#a855f7' },
  { label: 'Cast Slate', hex: '#94a3b8' },
  { label: 'Copper Bronze', hex: '#f97316' },
  { label: 'Emerald Eco', hex: '#10b981' },
  { label: 'Rose Superalloy', hex: '#f43f5e' },
  { label: 'Amber Polymer', hex: '#d97706' },
  { label: 'Teal Carbide', hex: '#14b8a6' }
];

export const CATEGORY_LABELS: Record<MaterialCategory, { en: string; ru: string }> = {
  stainless: { en: 'Stainless Steel', ru: 'Нержавеющая сталь' },
  steel: { en: 'Carbon / Alloy Steel', ru: 'Конструкционная сталь' },
  brass: { en: 'Brass / Bronze', ru: 'Латунь / Бронза' },
  aluminum: { en: 'Aluminum Alloys', ru: 'Алюминиевые сплавы' },
  titanium: { en: 'Titanium Alloys', ru: 'Титановые сплавы' },
  copper: { en: 'Pure Copper / Cu Alloys', ru: 'Медь и медные сплавы' },
  plastic: { en: 'Engineering Plastics (POM/PEEK)', ru: 'Инженерные пластики (POM/PEEK)' },
  superalloy: { en: 'Nickel / Inconel / Hastelloy', ru: 'Жаропрочные сплавы (Inconel)' },
  cast_iron: { en: 'Cast Iron (Grey / Nodular)', ru: 'Чугун (СЧ / ВЧ)' },
  other: { en: 'Special Alloy / Composite', ru: 'Спецсплавы / Прочие' }
};

/**
 * Loads materials from localStorage or falls back to factory defaults.
 */
export function loadMaterials(): MaterialSpec[] {
  if (typeof window === 'undefined') {
    return MATERIALS;
  }

  try {
    const raw = localStorage.getItem(MATERIAL_STORAGE_KEY);
    if (!raw) {
      saveMaterials(MATERIALS);
      return MATERIALS;
    }

    const parsed: MaterialSpec[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure colorCode and multipliers are populated
      return parsed.map((m, idx) => ({
        ...m,
        colorCode: m.colorCode || PRESET_MATERIAL_COLORS[idx % PRESET_MATERIAL_COLORS.length].hex,
        speedMultiplier: typeof m.speedMultiplier === 'number' ? m.speedMultiplier : 1.0,
        feedMultiplier: typeof m.feedMultiplier === 'number' ? m.feedMultiplier : 1.0
      }));
    }
    return MATERIALS;
  } catch (err) {
    console.error('Failed to load materials from localStorage:', err);
    return MATERIALS;
  }
}

/**
 * Saves materials array to localStorage.
 */
export function saveMaterials(materials: MaterialSpec[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MATERIAL_STORAGE_KEY, JSON.stringify(materials));
  } catch (err) {
    console.error('Failed to save materials to localStorage:', err);
  }
}

/**
 * Reset materials to original factory defaults.
 */
export function resetMaterialsToDefault(): MaterialSpec[] {
  saveMaterials(MATERIALS);
  return MATERIALS;
}

/**
 * Export materials to formatted JSON string.
 */
export function exportMaterialsToJson(materials: MaterialSpec[]): string {
  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    materialsCount: materials.length,
    materials
  }, null, 2);
}

/**
 * Download materials as a JSON file.
 */
export function downloadMaterialsJson(materials: MaterialSpec[], filename = 'cnc-calc-materials.json'): void {
  const jsonStr = exportMaterialsToJson(materials);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import materials from JSON file/string.
 */
export function importMaterialsFromJson(jsonString: string): { success: boolean; materials?: MaterialSpec[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const list: MaterialSpec[] = Array.isArray(parsed) ? parsed : parsed.materials;
    
    if (!Array.isArray(list) || list.length === 0) {
      return { success: false, error: 'JSON does not contain a valid materials array.' };
    }

    // Validate essential properties
    const validated: MaterialSpec[] = [];
    for (const item of list) {
      if (!item.name || !item.code || !item.category || !Array.isArray(item.vcRough)) {
        return { success: false, error: `Invalid material entry: missing name, code, or cutting regimes.` };
      }
      validated.push({
        id: item.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: String(item.name).trim(),
        code: String(item.code).trim().toUpperCase(),
        category: (item.category as MaterialCategory) || 'other',
        density: Number(item.density) || 7.8,
        kc1_1: Number(item.kc1_1) || 1800,
        vcRough: [Number(item.vcRough[0]) || 80, Number(item.vcRough[1]) || 120],
        vcFinish: [Number(item.vcFinish?.[0]) || 120, Number(item.vcFinish?.[1]) || 180],
        vcParting: [Number(item.vcParting?.[0]) || 60, Number(item.vcParting?.[1]) || 90],
        vcThreading: [Number(item.vcThreading?.[0]) || 60, Number(item.vcThreading?.[1]) || 90],
        feedRough: [Number(item.feedRough?.[0]) || 0.08, Number(item.feedRough?.[1]) || 0.15],
        feedFinish: [Number(item.feedFinish?.[0]) || 0.03, Number(item.feedFinish?.[1]) || 0.07],
        feedParting: [Number(item.feedParting?.[0]) || 0.02, Number(item.feedParting?.[1]) || 0.04],
        depthRough: [Number(item.depthRough?.[0]) || 0.3, Number(item.depthRough?.[1]) || 1.0],
        depthFinish: [Number(item.depthFinish?.[0]) || 0.05, Number(item.depthFinish?.[1]) || 0.2],
        coolantRecommended: item.coolantRecommended || 'Neat cutting oil or 8-10% emulsion',
        notes: item.notes || '',
        isCustom: item.isCustom ?? true,
        colorCode: item.colorCode || '#10b981',
        speedMultiplier: typeof item.speedMultiplier === 'number' ? item.speedMultiplier : 1.0,
        feedMultiplier: typeof item.feedMultiplier === 'number' ? item.feedMultiplier : 1.0,
        hardnessHb: item.hardnessHb ? Number(item.hardnessHb) : undefined,
        tensileStrengthMpa: item.tensileStrengthMpa ? Number(item.tensileStrengthMpa) : undefined,
        machinabilityRating: item.machinabilityRating ? Number(item.machinabilityRating) : undefined,
        chipBreakability: item.chipBreakability || 'good'
      });
    }

    return { success: true, materials: validated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to parse JSON file' };
  }
}

/**
 * Calculates effective cutting values taking into account the material's speed & feed multipliers.
 */
export function getEffectiveRegimes(material: MaterialSpec) {
  const speedMult = material.speedMultiplier ?? material.speedFeedMultiplier ?? 1.0;
  const feedMult = material.feedMultiplier ?? material.speedFeedMultiplier ?? 1.0;

  return {
    speedMult,
    feedMult,
    vcRough: [Math.round(material.vcRough[0] * speedMult), Math.round(material.vcRough[1] * speedMult)] as [number, number],
    vcFinish: [Math.round(material.vcFinish[0] * speedMult), Math.round(material.vcFinish[1] * speedMult)] as [number, number],
    vcParting: [Math.round(material.vcParting[0] * speedMult), Math.round(material.vcParting[1] * speedMult)] as [number, number],
    vcThreading: [Math.round(material.vcThreading[0] * speedMult), Math.round(material.vcThreading[1] * speedMult)] as [number, number],
    feedRough: [Number((material.feedRough[0] * feedMult).toFixed(3)), Number((material.feedRough[1] * feedMult).toFixed(3))] as [number, number],
    feedFinish: [Number((material.feedFinish[0] * feedMult).toFixed(3)), Number((material.feedFinish[1] * feedMult).toFixed(3))] as [number, number],
    feedParting: [Number((material.feedParting[0] * feedMult).toFixed(3)), Number((material.feedParting[1] * feedMult).toFixed(3))] as [number, number],
  };
}
