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
    name: 'Wi-Fi router',
    category: 'connectivity',
    wattage: 12,
    defaultSelected: true,
    isCritical: true,
    canCycle: false,
    dutyCycleRatio: 1.0,
    tip: 'Keeps your home Wi-Fi available during a power cut.'
  },
  {
    id: 'work-laptop',
    name: 'Laptop',
    category: 'connectivity',
    wattage: 55,
    defaultSelected: true,
    isCritical: true,
    canCycle: true,
    dutyCycleRatio: 0.8,
    tip: 'You can save backup power by using the laptop battery first.'
  },
  {
    id: 'phone-chargers',
    name: 'Phone charger',
    category: 'connectivity',
    wattage: 20,
    unitCount: 2,
    defaultSelected: true,
    isCritical: true,
    canCycle: true,
    dutyCycleRatio: 0.5,
    tip: 'Charge phones when needed instead of leaving them plugged in.'
  },
  {
    id: 'desktop-monitor',
    name: 'Desktop computer and monitor',
    category: 'connectivity',
    wattage: 180,
    defaultSelected: false,
    isCritical: false,
    canCycle: false,
    dutyCycleRatio: 1.0,
    tip: 'A desktop computer usually uses more power than a laptop.'
  },

  // Lighting
  {
    id: 'led-lights',
    name: 'LED light bulb',
    category: 'lighting',
    wattage: 36, // 4 x 9W
    unitCount: 4,
    defaultSelected: true,
    isCritical: true,
    canCycle: false,
    dutyCycleRatio: 0.9,
    tip: 'Use lights only in the rooms you need.'
  },
  {
    id: 'desk-lamp',
    name: 'Desk lamp',
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
    name: 'Ceiling fan',
    category: 'cooling',
    wattage: 70,
    defaultSelected: true,
    isCritical: false,
    canCycle: true,
    dutyCycleRatio: 0.8,
    tip: 'A lower fan speed may use less power.'
  },
  {
    id: 'dc-inverter-fan',
    name: 'Energy-saving fan',
    category: 'cooling',
    wattage: 30,
    defaultSelected: false,
    isCritical: false,
    canCycle: true,
    dutyCycleRatio: 0.8,
    tip: 'This fan may use less power than a standard ceiling fan.'
  },
  {
    id: 'standing-fan',
    name: 'Standing fan',
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
    name: 'Refrigerator',
    category: 'cooling',
    wattage: 120,
    surgeWattage: 350,
    defaultSelected: true,
    isCritical: true,
    canCycle: true,
    dutyCycleRatio: 0.45, // Thermal mass allows cycling
    tip: 'Keep the door closed to help food stay cold for longer.'
  },
  {
    id: 'deep-freezer',
    name: 'Chest freezer',
    category: 'cooling',
    wattage: 150,
    surgeWattage: 600,
    defaultSelected: false,
    isCritical: false,
    canCycle: true,
    dutyCycleRatio: 0.35,
    tip: 'Keeping the lid closed helps frozen food stay cold during an outage.'
  },

  // Critical & Medical
  {
    id: 'medical-cpap',
    name: 'CPAP or oxygen machine',
    category: 'critical',
    wattage: 65,
    defaultSelected: false,
    isCritical: true,
    canCycle: false,
    dutyCycleRatio: 1.0,
    tip: 'Include this if someone relies on it during a power cut.'
  },
  {
    id: 'aquarium-pump',
    name: 'Fish tank air pump',
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
    name: 'Television',
    category: 'kitchen',
    wattage: 85,
    defaultSelected: false,
    isCritical: false,
    canCycle: false,
    dutyCycleRatio: 1.0,
    tip: 'Add this if you plan to watch TV during an outage.'
  },
  {
    id: 'microwave',
    name: 'Microwave (short use)',
    category: 'kitchen',
    wattage: 950,
    surgeWattage: 1400,
    defaultSelected: false,
    isCritical: false,
    canCycle: true,
    dutyCycleRatio: 0.05, // 3 minutes total
    tip: 'A microwave uses a lot of power. Check that your system can run one.'
  }
]
