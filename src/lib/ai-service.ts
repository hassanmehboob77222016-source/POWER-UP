import { SetupInputs, CalculationResults } from './calculations'

export interface AICoachPlan {
  verdictTitle: string
  verdictDescription: string
  tacticalRecommendations: {
    title: string
    impact: string
    action: string
    badge: 'high-impact' | 'energy-saver' | 'safety'
  }[]
  timelineSchedule: {
    timeSlot: string
    action: string
    appliancesStatus: string
  }[]
  assumptionsNotes: string[]
}

export async function generateAICoachAdvice(
  inputs: SetupInputs,
  results: CalculationResults
): Promise<AICoachPlan> {
  // Simulate AI model reasoning with a realistic brief synthesis delay
  await new Promise(resolve => setTimeout(resolve, 800))

  const isPositive = results.isSufficient
  const bufferHours = results.runtimeSurplusDeficitHours

  // Dynamic tactical recommendations based on user selections
  const recommendations: AICoachPlan['tacticalRecommendations'] = []

  if (results.continuousLoadWatts > 350) {
    recommendations.push({
      title: "Intermittent Thermal Cycling",
      impact: "Saves ~300Wh - 500Wh per outage",
      action: "Run refrigerator compressor for 40 minutes, then power down for 80 minutes. The thermal seal prevents spoilage while doubling remaining fan/Wi-Fi duration.",
      badge: "high-impact"
    })
  }

  recommendations.push({
    title: "Pre-Outage Supercooling & Stored Energy",
    impact: "Extends battery life by 1.5+ hours",
    action: "When the municipal grid is active before load-shedding, drop freezer thermostat by 3°C and fully charge all laptops/power banks so your inverter isn't taxed early.",
    badge: "energy-saver"
  })

  if (results.surgeWarning) {
    recommendations.push({
      title: "Compressor Inrush Staggering",
      impact: "Prevents Inverter Fault / Overload Tripping",
      action: "Avoid starting refrigerator or pumps simultaneously with other loads. A starting compressor pulls up to 3x nominal wattage momentarily.",
      badge: "safety"
    })
  } else {
    recommendations.push({
      title: "Ceiling Fan Speed Optimization",
      impact: "Cuts ventilation draw by 28%",
      action: "Dropping ceiling fan regulators from speed 4 to speed 2 or 3 saves ~20W per fan without noticeable loss of airflow in enclosed rooms.",
      badge: "energy-saver"
    })
  }

  // Construct Hour-by-Hour Outage Timeline
  const hours = inputs.typicalOutageHours
  const timeline: AICoachPlan['timelineSchedule'] = [
    {
      timeSlot: "Hour 0:00 (Grid Outage Starts)",
      action: "Immediate triage. Disconnect high-draw appliances (irons, water heaters, microwave standby plugs).",
      appliancesStatus: "Wi-Fi: ON • Lights: Essential Only • Fans: Med"
    },
    {
      timeSlot: `Hour 0:30 – ${Math.min(hours, 2)}:00`,
      action: "Maintain communication line and workspace power. Monitor battery voltage display for abrupt drops.",
      appliancesStatus: "Laptops: Active • Fridge: Run 40m cycle"
    }
  ]

  if (hours > 2) {
    timeline.push({
      timeSlot: `Hour 2:00 – ${hours}:00 (Late Phase)`,
      action: isPositive 
        ? "Conserve reserves for outage safety buffer. Turn off vacant room illumination." 
        : "Critical phase: Shed non-essential loads immediately to protect battery from deep 100% discharge.",
      appliancesStatus: isPositive 
        ? "Comfort maintained within safety envelope" 
        : "Wi-Fi & Emergency LED Lights Only"
    })
  }

  timeline.push({
    timeSlot: `Post-Outage (Grid Restored)`,
    action: "Allow inverter 30 minutes of uninterrupted recharge before reconnecting heavy home appliances.",
    appliancesStatus: "System Recharging • Battery float mode"
  })

  const assumptions: string[] = [
    `Calculations use an 85% DC-to-AC conversion efficiency factor for inverter electronics.`,
    `DoD set to ${Math.round(results.depthOfDischargeRatio * 100)}% based on ${inputs.batteryChemistry.toUpperCase()} chemistry to prevent battery cell degradation.`,
    `Ambient battery temperature is assumed between 20°C - 30°C. Extreme heat or cold reduces capacity by 10-15%.`
  ]
  if (inputs.inverterRatingWatts === null) assumptions.push('Inverter continuous watt rating was not provided, so inverter load and surge headroom could not be checked.')

  if (!results.isCalculable) {
    return {
      verdictTitle: "Technical Specifications Required for Runtime Gauge",
      verdictDescription: results.missingDetailsReason || "Please verify battery voltage and amp-hours on your inverter sticker.",
      tacticalRecommendations: recommendations,
      timelineSchedule: timeline,
      assumptionsNotes: [
        "Check battery label: typically marked '12V 100Ah' or '12V 200Ah'.",
        "Keep total continuous draw under 200W until specs are confirmed."
      ]
    }
  }

  return {
    verdictTitle: isPositive 
      ? `System Sufficient: ${bufferHours > 0 ? `+${bufferHours}h Extra Buffer` : 'Exact Match'}`
      : `Capacity Deficit: Runs short by ${Math.abs(bufferHours)}h`,
    verdictDescription: isPositive
      ? `Under smart duty-cycling, your battery provides ${results.smartRuntimeHours} hours of runtime, fully covering your ${inputs.typicalOutageHours}-hour load-shedding window with ${results.batteryPercentageAtOutageEnd}% energy remaining.`
      : `Continuous draw (${results.continuousLoadWatts}W) drains the system in ${results.continuousRuntimeHours}h. You must implement the duty-cycling schedule below to survive the full ${inputs.typicalOutageHours}-hour outage.`,
    tacticalRecommendations: recommendations,
    timelineSchedule: timeline,
    assumptionsNotes: assumptions
  }
}
