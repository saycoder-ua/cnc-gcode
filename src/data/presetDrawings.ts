import { DrawingData } from '../types/cnc';

export const PRESET_DRAWINGS: DrawingData[] = [
  {
    part_name: 'Swiss Precision Guide Pin (Medical / Micro)',
    operation_type: 'swiss_turning',
    material: 'SS304',
    drawing_number: 'DWG-MED-0428',
    workpiece: {
      diameter_or_width_mm: 5.8,
      length_mm: 38.0,
      stickout_mm: 36.0,
      guide_bushing_clearance_mm: 0.008
    },
    contour_points: [
      { point_id: 1, type: 'start', x_diameter: 0.0, z_coordinate: 0.0 },
      { point_id: 2, type: 'face', x_diameter: 5.8, z_coordinate: 0.0 },
      { point_id: 3, type: 'taper', x_diameter: 2.5, z_coordinate: -1.0, chamfer: 0.5 },
      { point_id: 4, type: 'turn', x_diameter: 2.5, z_coordinate: -14.0 },
      { point_id: 5, type: 'arc_ccw', x_diameter: 3.8, z_coordinate: -16.0, radius: 1.5 },
      { point_id: 6, type: 'turn', x_diameter: 3.8, z_coordinate: -24.0 },
      { point_id: 7, type: 'groove', x_diameter: 3.0, z_coordinate: -26.0, groove_width: 1.5 },
      { point_id: 8, type: 'turn', x_diameter: 5.8, z_coordinate: -32.0 },
      { point_id: 9, type: 'cutoff', x_diameter: 0.0, z_coordinate: -33.5 }
    ],
    roughness_requirements: {
      general_ra: 1.6,
      critical_surfaces: [
        'Ra 0.4 on journal Z-1.0 to Z-14.0',
        'Ra 0.8 on journal Z-16.0 to Z-24.0',
        'No burrs on cutoff face'
      ]
    }
  },
  {
    part_name: 'Brass Threaded Pneumatic Fitting M8x1',
    operation_type: 'turning',
    material: 'CW614N',
    drawing_number: 'DWG-PNEU-M8',
    workpiece: {
      diameter_or_width_mm: 12.0,
      length_mm: 28.0,
      stickout_mm: 25.0,
      guide_bushing_clearance_mm: 0.012
    },
    contour_points: [
      { point_id: 1, type: 'start', x_diameter: 0.0, z_coordinate: 0.0 },
      { point_id: 2, type: 'face', x_diameter: 12.0, z_coordinate: 0.0 },
      { point_id: 3, type: 'chamfer', x_diameter: 7.9, z_coordinate: -0.8, chamfer: 0.8 },
      { point_id: 4, type: 'turn', x_diameter: 7.9, z_coordinate: -8.0 },
      { point_id: 5, type: 'thread', x_diameter: 7.9, z_coordinate: -7.5, thread_pitch: 1.0, thread_depth: 0.65 },
      { point_id: 6, type: 'groove', x_diameter: 6.2, z_coordinate: -9.5, groove_width: 2.0 },
      { point_id: 7, type: 'turn', x_diameter: 12.0, z_coordinate: -18.0 },
      { point_id: 8, type: 'cutoff', x_diameter: 0.0, z_coordinate: -20.0 }
    ],
    roughness_requirements: {
      general_ra: 1.6,
      critical_surfaces: [
        'Class 6g fit on M8x1 thread',
        'O-ring groove surface finish Ra 0.8'
      ]
    }
  },
  {
    part_name: 'Aerospace Stepped Bushing',
    operation_type: 'turning',
    material: 'SS303',
    drawing_number: 'DWG-AERO-303-12',
    workpiece: {
      diameter_or_width_mm: 16.0,
      length_mm: 42.0,
      stickout_mm: 38.0,
      guide_bushing_clearance_mm: 0.010
    },
    contour_points: [
      { point_id: 1, type: 'start', x_diameter: 0.0, z_coordinate: 0.0 },
      { point_id: 2, type: 'face', x_diameter: 16.0, z_coordinate: 0.0 },
      { point_id: 3, type: 'chamfer', x_diameter: 9.98, z_coordinate: -1.0, chamfer: 1.0 },
      { point_id: 4, type: 'turn', x_diameter: 9.98, z_coordinate: -16.0 },
      { point_id: 5, type: 'arc_ccw', x_diameter: 13.5, z_coordinate: -18.0, radius: 2.0 },
      { point_id: 6, type: 'turn', x_diameter: 13.5, z_coordinate: -28.0 },
      { point_id: 7, type: 'turn', x_diameter: 16.0, z_coordinate: -34.0 },
      { point_id: 8, type: 'cutoff', x_diameter: 0.0, z_coordinate: -35.5 }
    ],
    roughness_requirements: {
      general_ra: 1.6,
      critical_surfaces: [
        'Ra 0.8 on bearing journal dia 9.98 (-0.005 / -0.012)',
        'Flange runout <= 0.008 mm'
      ]
    }
  },
  {
    part_name: 'High-Speed Aluminum Optical Spacer',
    operation_type: 'turning',
    material: 'AL6061-T6',
    drawing_number: 'DWG-OPT-6061',
    workpiece: {
      diameter_or_width_mm: 20.0,
      length_mm: 30.0,
      stickout_mm: 26.0,
      guide_bushing_clearance_mm: 0.012
    },
    contour_points: [
      { point_id: 1, type: 'start', x_diameter: 0.0, z_coordinate: 0.0 },
      { point_id: 2, type: 'face', x_diameter: 20.0, z_coordinate: 0.0 },
      { point_id: 3, type: 'chamfer', x_diameter: 15.0, z_coordinate: -0.5, chamfer: 0.5 },
      { point_id: 4, type: 'turn', x_diameter: 15.0, z_coordinate: -12.0 },
      { point_id: 5, type: 'taper', x_diameter: 18.0, z_coordinate: -16.0 },
      { point_id: 6, type: 'turn', x_diameter: 20.0, z_coordinate: -22.0 },
      { point_id: 7, type: 'cutoff', x_diameter: 0.0, z_coordinate: -24.0 }
    ],
    roughness_requirements: {
      general_ra: 0.8,
      critical_surfaces: ['Ra 0.4 optical face', 'Perpendicularity 0.005 mm']
    }
  },
  {
    part_name: 'Titanium Micro Cannula Core',
    operation_type: 'swiss_turning',
    material: 'Ti-6Al-4V',
    drawing_number: 'DWG-MED-TI-02',
    workpiece: {
      diameter_or_width_mm: 4.0,
      length_mm: 25.0,
      stickout_mm: 22.0,
      guide_bushing_clearance_mm: 0.006
    },
    contour_points: [
      { point_id: 1, type: 'start', x_diameter: 0.0, z_coordinate: 0.0 },
      { point_id: 2, type: 'face', x_diameter: 4.0, z_coordinate: 0.0 },
      { point_id: 3, type: 'taper', x_diameter: 1.8, z_coordinate: -2.0 },
      { point_id: 4, type: 'turn', x_diameter: 1.8, z_coordinate: -12.0 },
      { point_id: 5, type: 'turn', x_diameter: 3.2, z_coordinate: -18.0 },
      { point_id: 6, type: 'cutoff', x_diameter: 0.0, z_coordinate: -19.5 }
    ],
    roughness_requirements: {
      general_ra: 0.4,
      critical_surfaces: ['Ra 0.2 polish finish on tip dia 1.8']
    }
  }
];
