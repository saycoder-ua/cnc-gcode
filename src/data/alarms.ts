import { FanucAlarm } from '../types/cnc';

export const FANUC_ALARMS: FanucAlarm[] = [
  {
    code: 'SV0410',
    prefix: 'SV',
    title: 'AXIS EXCESS ERROR / ABSOLUTE PULSE CODER BATTERY ZERO',
    severity: 'critical_stop',
    description: 'The backup voltage for the absolute pulse coder has dropped to zero volts while power was off. The reference position (mechanical zero) for the affected axis has been lost.',
    probableCauses: [
      'Lithium backup battery pack (3.6V) completely discharged.',
      'Battery cable harness disconnected or severed in machine carriage/electronics cabinet.',
      'Machine remained powered off in storage for an extended period without battery replenishment.'
    ],
    remedySteps: [
      'DO NOT turn off main breaker while performing battery swap if machine still has partial backup.',
      'Install replacement 3.6V Lithium primary cell (Part: A98L-0031-0012 or CR17450SE-R).',
      'Power ON CNC controller and navigate to MDI mode.',
      'Release Parameter Write Enable (PWE = 1 in SETTING screen).',
      'Locate Parameter P1815: Check bit 5 (APC) is 1. Observe bit 4 (APZ) which has reverted to 0.',
      'Jog axis slowly to physical alignment witness mark or reference stop block.',
      'Change Parameter P1815.4 (APZ) to 1 to set mechanical home coordinate.',
      'Power cycle the CNC controller completely (power OFF, wait 10 sec, power ON).',
      'Execute G28 reference return (e.g., G28 U0 W0) in MDI to verify coordinate persistence.',
      'Reset PWE = 0 and confirm zero alarms remain.'
    ],
    parametersToCheck: ['P1815 bit 5 (APC)', 'P1815 bit 4 (APZ)', 'P1850 (Grid shift offset)'],
    machineApplicability: 'Fanuc 0i-TD, 16i, 30i, 31i (Tsugami S206, Star SR-20J, Citizen L20)'
  },
  {
    code: 'SV0411',
    prefix: 'SV',
    title: 'ABSOLUTE PULSE CODER BATTERY LOW VOLTAGE (WARNING)',
    severity: 'warning',
    description: 'The absolute pulse coder battery voltage has dropped below 3.2V. The position data is currently retained, but imminent data loss will occur if the battery is not replaced promptly.',
    probableCauses: [
      'Battery pack reached end of standard service life (recommended replacement cycle: 12 months).',
      'High ambient cabinet temperature increasing self-discharge.'
    ],
    remedySteps: [
      'LEAVE THE CNC POWER ON during the battery change to prevent losing machine zero coordinates.',
      'Open the CNC control unit battery door or servo amplifier cover.',
      'Unplug the old battery connector and plug in the fresh 3.6V CR17450SE-R lithium pack within 30 minutes.',
      'Press ALARM RESET button on Fanuc MDI operator panel.',
      'Verify battery warning icon disappears from CNC status bar.'
    ],
    parametersToCheck: ['Diagnostic D0000-D0007 (Battery status bits)'],
    machineApplicability: 'All Fanuc controls with absolute encoders'
  },
  {
    code: 'SV0401',
    prefix: 'SV',
    title: 'SERVO MOTOR OVERHEAT / SERVO AMPLIFIER READY OFF',
    severity: 'critical_stop',
    description: 'The built-in thermal sensor in the servo motor or drive amplifier has tripped due to excessive thermal rise.',
    probableCauses: [
      'Heavy continuous cutting load exceeding servo rated duty cycle (e.g. excessive depth of cut or dull insert).',
      'Mechanical gibs, ball screw or guide bushing binding causing high frictional torque.',
      'Amplifier cooling fan stopped or heat sink fins clogged with oily shop dust.'
    ],
    remedySteps: [
      'Allow motor and cabinet amplifier to cool down for 20-30 minutes.',
      'Inspect cabinet cooling fans; replace failed 24V DC fan units immediately.',
      'Clean amplifier heatsinks with compressed dry air or lint-free solvent.',
      'Check axis load meter on CNC MONITOR screen: normal un-laden jog should be < 20-25% load.',
      'Inspect mechanical axis lubrication and guide bushing clearance to ensure no galling or binding.',
      'Reduce feed rate and axial depth of cut in G-code program.'
    ],
    parametersToCheck: ['Servo Monitor: Axis Load %', 'P2043 (Thermal model coefficient)'],
    machineApplicability: 'Tsugami S206, Star SR-20J, Fanuc 0i'
  },
  {
    code: 'EX1001',
    prefix: 'EX',
    title: 'LUBRICATION OIL PRESSURE LOW / TANK EMPTY',
    severity: 'critical_stop',
    description: 'The centralized automatic guideway and spindle lubrication pump pressure switch failed to reach the required trip pressure (approx 1.5 - 2.0 MPa) during a timed lube stroke.',
    probableCauses: [
      'Lubrication oil reservoir empty or below low-level float switch.',
      'Oil viscosity incorrect (must use genuine ISO VG 32 slideway oil).',
      'Pump intake suction filter mesh clogged with sludge or chips.',
      'Ruptured nylon distributor line or leaky metering valve on Z1/X1 slide.'
    ],
    remedySteps: [
      'Check lube reservoir sight glass; replenish with clean ISO VG 32 oil to MAX mark.',
      'Check manual override lever on lube pump to test pressure build-up manually.',
      'Inspect pressure gauge: needle should kick past 1.5 MPa and hold for several seconds before depressurizing.',
      'Inspect oil lines along the sliding headstock and gang tool post for oil puddles or cracked lines.',
      'Clear alarm via PLC reset on machine operator panel.'
    ],
    parametersToCheck: ['Keep Relay K0005.2 (Lube monitor enable)', 'Timer T0012 (Lube cycle interval)'],
    machineApplicability: 'Tsugami S206, B0205, Star SB-16, Citizen'
  },
  {
    code: 'EX1002',
    prefix: 'EX',
    title: 'COLLET CHUCK NOT CLAMPED / PNEUMATIC PRESSURE LOW',
    severity: 'critical_stop',
    description: 'The collet clamping cylinder proximity sensors do not confirm clamped status, or main pneumatic system supply is below operating threshold.',
    probableCauses: [
      'Factory air line pressure dropped below minimum specification (required min 6 bar intake, 5 bar regulated).',
      'Collet adjustment ring too loose or over-tightened, preventing stroke completion.',
      'Collet pneumatic solenoid valve spool sticky or exhaust muffler clogged.',
      'Magnetic reed switch on clamp cylinder misadjusted or defective.'
    ],
    remedySteps: [
      'Check machine inlet pressure regulator gauge: ensure >= 5.0 - 6.0 bar.',
      'Verify air dryer operation; drain water trap bowls of compressor condensate.',
      'Adjust collet clamping sleeve nut: insert bar stock, adjust until toggle mechanism snaps firmly into over-center lock.',
      'Cycle foot pedal or M10 (clamp) / M11 (unclamp) in MDI to verify cylinder travel.',
      'Inspect LED status lights on clamping cylinder magnetic sensors.'
    ],
    parametersToCheck: ['PMC Diagnostic X0004.2 (Main chuck clamp sensor)', 'X0004.3 (Unclamp sensor)'],
    machineApplicability: 'Tsugami, Star, Citizen Swiss Lathes'
  },
  {
    code: 'EX2001',
    prefix: 'EX',
    title: 'BAR FEEDER COMMUNICATION LOST / ALARM INTERLOCK',
    severity: 'critical_stop',
    description: 'The CNC interface cable connection to the automatic bar feeder (Iemca, LNS, TOPS) reported a fault, bar-end signal, or emergency stop.',
    probableCauses: [
      'Bar feeder is in bar-end state and awaiting new bar loading sequence.',
      'Bar feeder safety cover/hood is open.',
      'Bar feeder emergency stop mushroom button depressed.',
      'Interface cable (Harting plug) loose or 24V interlock relay contact tripped.'
    ],
    remedySteps: [
      'Inspect display on bar feeder pendant (check for "End of Bar" or "Pusher torque error").',
      'Ensure new bar bundle is loaded on magazine rack and pushers are properly aligned.',
      'Verify bar feeder hood safety switches are engaged.',
      'Cycle bar feeder control to AUTO mode, then reset CNC alarm.',
      'Inspect guide channel bushings: ensure match with bar diameter.'
    ],
    parametersToCheck: ['PMC Diagnostic X0012.0 (Barfeeder OK signal)', 'X0012.1 (Bar end signal)'],
    machineApplicability: 'Swiss Lathes with LNS / Iemca bar loaders'
  },
  {
    code: 'PS0010',
    prefix: 'PS',
    title: 'IMPROPER G-CODE COMMANDED',
    severity: 'alarm',
    description: 'A G-code that is not supported by the current Fanuc option configuration or illegal combination was commanded in the program.',
    probableCauses: [
      'Commanding canned cycle (e.g. G71, G76, G84) with incorrect format or without optional software package enabled.',
      'Typo in block (e.g. G001 instead of G01, or letter O instead of number 0).',
      'Plane selection mismatch (e.g. G02/G03 commanded without G18 active for lathe).'
    ],
    remedySteps: [
      'Locate alarm block number highlighted in Fanuc program execution screen.',
      'Ensure ZX plane (G18) is set at program header.',
      'Verify canned cycle parameters adhere strictly to Fanuc 2-line format for G71 / G76 or single line format for older controls.',
      'Audit program with cnc-calc-plus Syntax Checker.'
    ],
    parametersToCheck: ['Program syntax at cursor position'],
    machineApplicability: 'Fanuc 0i, 16i, 30i'
  },
  {
    code: 'PS0030',
    prefix: 'PS',
    title: 'ILLEGAL G-CODE IN CANNED CYCLE / G71 PROFILE MONOTONE ERROR',
    severity: 'alarm',
    description: 'During a G71 roughing cycle profile definition (between P and Q blocks), a disallowed motion command or non-monotonic coordinate sequence occurred.',
    probableCauses: [
      'Commanding G00/G01 move in opposite Z direction inside G71 Type I profile.',
      'Including rapid moves (G00) or tool changes (T) inside the P/Q profile definition block.',
      'Using G71 Type I with a pocket/undercut (which requires G71 Type II with both X and Z in P block).'
    ],
    remedySteps: [
      'Inspect first block after G71 (the P block): for Type II (pocketing), include both X and Z coordinates in the P block (e.g. N10 G01 X10.0 Z0.0 F0.1).',
      'Ensure Z coordinates strictly decrease (Z0 -> Z-10 -> Z-20) for standard longitudinal turning.',
      'Remove any M-codes, G00 rapids, or T-codes from within the profile boundary.',
      'Re-generate code using cnc-calc-plus G71 Type II generator.'
    ],
    parametersToCheck: ['P and Q block numbers in G71 command'],
    machineApplicability: 'Fanuc 0i-TD, 16i, 31i'
  },
  {
    code: 'PS0041',
    prefix: 'PS',
    title: 'INTERFERENCE IN CUTTER RADIUS COMPENSATION (G41/G42)',
    severity: 'alarm',
    description: 'The tool nose radius offset (r_eps) creates a geometric collision or self-intersecting tool path in an internal corner or narrow groove.',
    probableCauses: [
      'Tool nose radius (e.g. R0.4 or R0.8 in tool offset table) is larger than internal fillet radius.',
      'Groove width is narrower than 2 * tool nose radius.',
      'Starting cutter compensation G41/G42 on a rapid move or without sufficient lead-in distance.'
    ],
    remedySteps: [
      'Switch to a smaller tool nose radius insert (e.g. 0.2mm or 0.1mm for micro Swiss turning).',
      'Ensure lead-in distance for G41/G42 is at least 3x the nose radius before touching workpiece.',
      'Cancel cutter compensation with G40 on a departure vector away from the finished surface.',
      'Review tool undercutting analysis in cnc-calc-plus Safety Check.'
    ],
    parametersToCheck: ['Tool Offset R column', 'Tool Tip Direction Code T (1-9)'],
    machineApplicability: 'All Fanuc Lathes'
  },
  {
    code: 'OT0500',
    prefix: 'OT',
    title: 'OVERTRAVEL : +X AXIS SOFT STROKE LIMIT EXCEEDED',
    severity: 'alarm',
    description: 'The commanded axis position exceeded the stored software stroke limit 1 in the positive X direction.',
    probableCauses: [
      'Tool retraction move programmed too far positive (e.g. G00 X150.0 on a Swiss lathe with 16mm X-travel).',
      'Incorrect workpiece coordinate system G54 or tool geometry offset value loaded.',
      'Machine lost reference zero and coordinate system is shifted.'
    ],
    remedySteps: [
      'Switch machine mode to JOG or MANUAL HANDLE.',
      'Depress Over-travel Release button if hard limit tripped, or jog X axis in MINUS direction.',
      'Press RESET to clear alarm.',
      'Check machine max X1 travel limit (e.g. Tsugami S206 has 16mm X1 travel).',
      'Verify tool offset values in OFFSET/GEOMETRY table.'
    ],
    parametersToCheck: ['P1320 (+Stroke limit 1)', 'P1321 (-Stroke limit 1)'],
    machineApplicability: 'Fanuc 0i, 16i, 31i'
  }
];
