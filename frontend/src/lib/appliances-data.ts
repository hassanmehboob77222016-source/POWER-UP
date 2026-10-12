export interface Appliance {
  id: string
  name: string
  category: 'connectivity' | 'lighting' | 'cooling' | 'kitchen' | 'critical'
  wattage: number
  /** Physical units represented by the preset's combined wattage (for example, 4 LED bulbs). */
  unitCount?: number
  surgeWattage?: number
  defaultSelected: boolean
  isCritical: boolean
  canCycle: boolean
  dutyCycleRatio: number // 0.0 to 1.0 (e.g. 0.4 for fridge: runs 40% of time)
  unitLabel?: string
  tip?: string
}

export const PRESET_APPLIANCES: Appliance[] = [
  // Connectivity & Work
  {
    id: 'wifi-router',
    name: 'Wi-Fi Fiber / Router',
    category: 'connectivity',
    wattage: 12,
    defaultSelected: true,
    isCritical: true,
    canCycle: false,
    dutyCycleRatio: 1.0,
    tip: 'Essential for communications; ultra-low draw.'
  },
  {
    id: 'work-laptop',
    name: 'Work Laptop (Type-C / 65W)',
    category: 'connectivity',
    wattage: 55,
    defaultSelected: true,
    isCritical: true,
    canCycle: true,
    dutyCycleRatio: 0.8,
    tip: 'Charge laptop during grid time; run on internal battery first.'
  },
  {
    id: 'phone-chargers',
    name: 'Mobile Phone Charging (x2)',
    category: 'connectivity',
    wattage: 20,
    unitCount: 2,
    defaultSelected: true,
    isCritical: true,
    canCycle: true,
    dutyCycleRatio: 0.5,
    tip: 'Fast charge phones in short bursts rather than keeping plugged in.'
  },
  {
    id: 'desktop-monitor',
    name: 'Desktop PC & Monitor',
    category: 'connectivity',
    wattage: 180,
    defaultSelected: false,
    isCritical: false,
    canCycle: false,
    dutyCycleRatio: 1.0,
    tip: 'High continuous draw. Consider switching to a laptop during long outages.'
  },

  // Lighting
  {
    id: 'led-lights',
    name: 'LED Light Bulbs (x4)',
    category: 'lighting',
    wattage: 36, // 4 x 9W
    unitCount: 4,
    defaultSelected: true,
    isCritical: true,
    canCycle: false,
    dutyCycleRatio: 0.9,
    tip: 'Only illuminate rooms actively in use.'
  },
  {
    id: 'desk-lamp',
    name: 'Study Desk Lamp',
    category: 'lighting',
    wattage: 10,
    defaultSelected: false,
    isCritical: false,
    canCycle: false,
    dutyCycleRatio: 1.0,
  },

  // Cooling & Ventilation
  {
    id: 'ceiling-fan',
    name: 'Ceiling Fan (Speed 3)',
    category: 'cooling',
    wattage: 70,
    defaultSelected: true,
    isCritical: false,
    canCycle: true,
    dutyCycleRatio: 0.8,
    tip: 'Running at speed 2 uses ~30% less power than maximum speed.'
  },
  {
    id: 'dc-inverter-fan',
    name: 'BLDC / DC Inverter Fan',
    category: 'cooling',
    wattage: 30,
    defaultSelected: false,
    isCritical: false,
    canCycle: true,
    dutyCycleRatio: 0.8,
    tip: 'Consumes less than half the power of standard AC fans.'
  },
  {
    id: 'standing-fan',
    name: 'Portable Standing Fan',
    category: 'cooling',
    wattage: 50,
    defaultSelected: false,
    isCritical: false,
    canCycle: true,
    dutyCycleRatio: 0.7,
  },

  // Food Preservation
  {
    id: 'inverter-fridge',
    name: 'Inverter Refrigerator',
    category: 'cooling',
    wattage: 120,
    surgeWattage: 350,
    defaultSelected: true,
    isCritical: true,
    canCycle: true,
    dutyCycleRatio: 0.45, // Thermal mass allows cycling
    tip: 'Keep door shut. Run 30-40 min every 2 hrs to preserve chilled items while saving 50%+ battery.'
  },
  {
    id: 'deep-freezer',
    name: 'Chest Deep Freezer',
    category: 'cooling',
    wattage: 150,
    surgeWattage: 600,
    defaultSelected: false,
    isCritical: false,
    canCycle: true,
    dutyCycleRatio: 0.35,
    tip: 'Well-insulated freezers maintain sub-zero temps for 12+ hrs unopened without power.'
  },

  // Critical & Medical
  {
    id: 'medical-cpap',
    name: 'Medical CPAP / Oxygen Concentrator',
    category: 'critical',
    wattage: 65,
    defaultSelected: false,
    isCritical: true,
    canCycle: false,
    dutyCycleRatio: 1.0,
    tip: 'Life-critical load. Keep backup battery dedicated to this circuit.'
  },
  {
    id: 'aquarium-pump',
    name: 'Aquarium Aerator Pump',
    category: 'critical',
    wattage: 15,
    defaultSelected: false,
    isCritical: true,
    canCycle: true,
    dutyCycleRatio: 0.5,
  },

  // Entertainment & Kitchen
  {
    id: 'smart-tv',
    name: 'Smart TV (43"–55")',
    category: 'kitchen',
    wattage: 85,
    defaultSelected: false,
    isCritical: false,
    canCycle: false,
    dutyCycleRatio: 1.0,
    tip: 'Significant drain on smaller backup inverters.'
  },
  {
    id: 'microwave',
    name: 'Microwave Oven (Quick Reheat)',
    category: 'kitchen',
    wattage: 950,
    surgeWattage: 1400,
    defaultSelected: false,
    isCritical: false,
    canCycle: true,
    dutyCycleRatio: 0.05, // 3 minutes total
    tip: 'Extremely high load. Use only on high-capacity (3kVA+) inverters.'
  }
]
