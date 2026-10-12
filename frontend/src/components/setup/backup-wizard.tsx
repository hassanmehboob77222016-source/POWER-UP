import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, Sun, Fuel, AlertTriangle, ArrowRight, ArrowLeft, 
  Plus, Minus, Sparkles, Check, Info
} from 'lucide-react'
import { SetupInputs, BackupType, BatteryChemistry, PriorityMode, AppliancePriority } from '@/lib/calculations'
import { PRESET_APPLIANCES } from '@/lib/appliances-data'

interface BackupWizardProps {
  initialInputs?: SetupInputs | null
  initialStep?: number
  onSubmit: (inputs: SetupInputs) => void
  onCancel: () => void
}

export function BackupWizard({ initialInputs, initialStep = 1, onSubmit, onCancel }: BackupWizardProps) {
  const [currentStep, setCurrentStep] = useState(Math.min(4, Math.max(1, initialStep)))

  // Form State
  const [backupType, setBackupType] = useState<BackupType>(initialInputs?.backupType || 'inverter')
  const [hasBattery, setHasBattery] = useState<boolean>(initialInputs?.hasBattery ?? true)
  const [batteryChemistry, setBatteryChemistry] = useState<BatteryChemistry>(initialInputs?.batteryChemistry || 'unknown')
  const [voltage, setVoltage] = useState<number>(initialInputs?.voltage || 0)
  const [ampHours, setAmpHours] = useState<number>(initialInputs?.ampHours || 0)
  const [directKwh, setDirectKwh] = useState<number | null>(initialInputs?.directKwh ?? null)
  const [useDirectKwh, setUseDirectKwh] = useState<boolean>(initialInputs?.directKwh != null)
  const [isCapacityUnknown, setIsCapacityUnknown] = useState<boolean>(initialInputs ? initialInputs.isCapacityUnknown : true)
  const [inverterRatingWatts, setInverterRatingWatts] = useState<number | null>(initialInputs ? initialInputs.inverterRatingWatts : null)
  const [inverterRatingVA, setInverterRatingVA] = useState<number | null>(initialInputs?.inverterRatingVA ?? null)
  const [inverterSurgeWatts, setInverterSurgeWatts] = useState<number | null>(initialInputs?.inverterSurgeWatts ?? null)
  const [solarPanelCount, setSolarPanelCount] = useState<number | null>(initialInputs?.solarPanelCount ?? null)
  const [solarPanelWatts, setSolarPanelWatts] = useState<number | null>(initialInputs?.solarPanelWatts ?? null)
  const [typicalOutageHours, setTypicalOutageHours] = useState<number>(initialInputs?.typicalOutageHours || 4)
  const [priorityMode, setPriorityMode] = useState<PriorityMode>(initialInputs?.priorityMode || 'balanced')

  // Selected appliances map
  const [selectedMap, setSelectedMap] = useState<Record<string, { quantity: number; customWatts?: number; customName?: string; watts?: number; surgeWatts?: number; operatingHours?: number; mustRun?: boolean; priority?: AppliancePriority }>>(() => {
    if (initialInputs?.selectedAppliances?.length) {
      const map: Record<string, { quantity: number; customWatts?: number; customName?: string; watts?: number; surgeWatts?: number; operatingHours?: number; mustRun?: boolean; priority?: AppliancePriority }> = {}
      initialInputs.selectedAppliances.forEach(item => {
        map[item.applianceId] = {
          quantity: item.quantity,
          customWatts: item.customWatts,
          customName: item.customName,
          watts: item.watts ?? item.customWatts ?? PRESET_APPLIANCES.find(appliance => appliance.id === item.applianceId)?.wattage,
          surgeWatts: item.surgeWatts ?? PRESET_APPLIANCES.find(appliance => appliance.id === item.applianceId)?.surgeWattage,
          operatingHours: item.operatingHours ?? initialInputs.typicalOutageHours,
          mustRun: item.mustRun ?? false,
          priority: item.priority ?? 'normal',
        }
      })
      return map
    }
    return {}
  })

  // Custom appliance inputs
  const [customName, setCustomName] = useState('')
  const [customWatts, setCustomWatts] = useState('')

  // Category filter for appliances
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [validationError, setValidationError] = useState('')

  const toggleAppliance = (id: string) => {
    setSelectedMap(prev => {
      const next = { ...prev }
      if (next[id]) {
        delete next[id]
      } else {
        const preset = PRESET_APPLIANCES.find(appliance => appliance.id === id)
        next[id] = { quantity: 1, watts: preset?.wattage ?? 0, surgeWatts: preset?.surgeWattage, operatingHours: typicalOutageHours, mustRun: false, priority: 'normal' }
      }
      return next
    })
  }

  const changeQuantity = (id: string, delta: number) => {
    setSelectedMap(prev => {
      const current = prev[id]?.quantity || 0
      const updated = Math.max(1, current + delta)
      return {
        ...prev,
        [id]: { ...prev[id], quantity: updated }
      }
    })
  }

  const updateAppliance = (id: string, values: Partial<{ quantity: number; watts: number; surgeWatts: number | undefined; operatingHours: number; mustRun: boolean; priority: AppliancePriority }>) => {
    setSelectedMap(prev => ({ ...prev, [id]: { ...prev[id], ...values } }))
  }

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    const w = Number(customWatts)
    if (!customName.trim() || !Number.isFinite(w) || w <= 0 || w > 100000) { setValidationError('Enter an appliance name and rated wattage between 1 and 100,000 W.'); return }
    const id = `custom-${crypto.randomUUID()}`
    setSelectedMap(prev => ({
      ...prev,
      [id]: { quantity: 1, customName: customName.trim(), customWatts: w, watts: w, operatingHours: typicalOutageHours, mustRun: false, priority: 'normal' }
    }))
    setValidationError('')
    setCustomName('')
    setCustomWatts('')
  }

  const handleFinalSubmit = () => {
    setValidationError('')
    if (!Number.isFinite(typicalOutageHours) || typicalOutageHours < 1 || typicalOutageHours > 24) { setValidationError('Set a required backup duration between 1 and 24 hours.'); return }
    if (!Number.isFinite(voltage) || voltage < 0 || voltage > 1000 || !Number.isFinite(ampHours) || ampHours < 0 || ampHours > 1000000) { setValidationError('Enter a valid battery bank voltage (1–1,000 V) and capacity (up to 1,000,000 Ah), or leave unknown values blank.'); return }
    if (useDirectKwh && directKwh !== null && (!Number.isFinite(directKwh) || directKwh <= 0 || directKwh > 1000)) { setValidationError('Enter a total battery capacity above 0 and no greater than 1,000 kWh, or leave it blank.'); return }
    if (Object.keys(selectedMap).length === 0) { setValidationError('Select at least one appliance so PowerUp can calculate load and energy use.'); return }
    const invalidAppliance = Object.values(selectedMap).some(item => !Number.isFinite(item.quantity) || item.quantity < 1 || !Number.isFinite(item.watts) || (item.watts ?? 0) <= 0 || !Number.isFinite(item.operatingHours) || (item.operatingHours ?? -1) < 0 || (item.operatingHours ?? 0) > typicalOutageHours || (item.surgeWatts !== undefined && (!Number.isFinite(item.surgeWatts) || item.surgeWatts <= 0)))
    if (invalidAppliance) { setValidationError(`Check each selected appliance's quantity, wattage, and planned hours (0 to ${typicalOutageHours}).`); return }
    const applianceList = Object.entries(selectedMap).map(([id, val]) => ({
      applianceId: id,
      quantity: val.quantity,
      customName: val.customName,
      customWatts: val.customWatts,
      watts: val.watts,
      surgeWatts: val.surgeWatts,
      operatingHours: val.operatingHours,
      mustRun: val.mustRun,
      priority: val.priority,
    }))

    const payload: SetupInputs = {
      backupType,
      hasBattery: backupType !== 'none' && hasBattery,
      batteryChemistry: hasBattery ? batteryChemistry : 'unknown',
      voltage: hasBattery ? voltage : 0,
      ampHours: hasBattery ? ampHours : 0,
      directKwh: hasBattery && useDirectKwh ? directKwh : null,
      isCapacityUnknown: !hasBattery || isCapacityUnknown,
      inverterRatingWatts,
      inverterRatingVA,
      inverterSurgeWatts,
      solarPanelCount,
      solarPanelWatts,
      typicalOutageHours,
      selectedAppliances: applianceList,
      priorityMode
    }

    onSubmit(payload)
  }

  // Calculate live instant wattage for user feedback
  const totalLiveWatts = Object.entries(selectedMap).reduce((sum, [id, val]) => {
    const preset = PRESET_APPLIANCES.find(a => a.id === id)
    const watts = val.watts ?? val.customWatts ?? preset?.wattage ?? 0
    return sum + (watts * val.quantity)
  }, 0)
  const estimatedEnergyWh = Object.values(selectedMap).reduce((sum, item) => sum + (item.watts ?? item.customWatts ?? 0) * item.quantity * (item.operatingHours ?? typicalOutageHours), 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Wizard Header with Step Progress */}
      <div className="mb-8 text-left">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
            Step {currentStep} of 4
          </span>
          <button
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel & Return
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface rounded-full h-2 mb-4 overflow-hidden border border-border">
          <div 
            className="bg-primary h-full transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
          {currentStep === 1 && "What is your backup power setup?"}
          {currentStep === 2 && "Battery specifications & outage length"}
          {currentStep === 3 && "Select essential appliances"}
          {currentStep === 4 && "Household priorities & constraints"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {currentStep === 1 && "Select the primary backup technology used in your home during grid load-shedding."}
          {currentStep === 2 && "Enter the system specifications you know. Unknown values stay unknown and limit which estimates PowerUp can make."}
          {currentStep === 3 && "Add the appliances you actually use, their quantities, rated watts, outage hours, and priorities."}
          {currentStep === 4 && "Choose how PowerUp should treat optional loads when estimating backup demand."}
        </p>
      </div>

      {/* STEP 1: Backup System Type */}
      {currentStep === 1 && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                id: 'inverter' as BackupType,
                title: "Inverter / UPS with Battery",
                desc: "Grid-tied inverter with dedicated battery storage bank (12V, 24V, or 48V).",
                icon: Zap,
                recommended: true
              },
              {
                id: 'solar' as BackupType,
                title: "Solar PV + Hybrid Battery",
                desc: "Rooftop solar panels paired with lithium or tubular battery storage.",
                icon: Sun
              },
              {
                id: 'generator' as BackupType,
                title: "Fuel Generator Backup",
                desc: "Petrol or diesel generator with manual/automatic transfer switch.",
                icon: Fuel
              },
              {
                id: 'none' as BackupType,
                title: "No Installed Backup",
                desc: "Portable power stations, mobile power banks, or no backup yet.",
                icon: AlertTriangle
              }
            ].map(item => {
              const Icon = item.icon
              const isSelected = backupType === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => { setBackupType(item.id); setHasBattery(item.id === 'inverter' || item.id === 'solar') }}
                  className={`p-5 rounded-2xl border cursor-pointer text-left transition-all ${
                    isSelected 
                      ? 'bg-card border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/5' 
                      : 'bg-card/60 border-border hover:border-border/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-primary text-black' : 'bg-surface text-foreground'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-foreground mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>

          <div className="pt-6 flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-black font-semibold text-sm hover:bg-primary-hover transition-colors"
            >
              Continue to Battery Specs <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: Battery Specs & Outage Target */}
      {currentStep === 2 && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6 text-left"
        >
          {backupType !== 'none' ? (
            <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
              <label className="block text-xs font-bold text-foreground">Does this setup currently have a battery?
                <select value={hasBattery ? 'yes' : 'no'} onChange={event => setHasBattery(event.target.value === 'yes')} className="mt-2 w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-medium text-foreground sm:max-w-xs">
                  <option value="yes">Yes</option><option value="no">No</option>
                </select>
              </label>
              {hasBattery ? <>
              
              {/* Unknown Specs Toggle */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Do you know your battery capacity?</h4>
                  <p className="text-xs text-muted-foreground">You can continue even if technical numbers are unknown.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCapacityUnknown(!isCapacityUnknown)}
                  aria-pressed={!isCapacityUnknown}
                  title={isCapacityUnknown ? 'Show battery specification fields' : 'Hide specifications and continue in safe mode'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isCapacityUnknown 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                      : 'bg-surface border-border text-foreground hover:bg-foreground/5'
                  }`}
                >
                  {isCapacityUnknown ? "Enter battery specs" : "Use safe mode"}
                </button>
              </div>

              {!isCapacityUnknown ? (
                <>
                  {/* Chemistry Selector */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      Battery Chemistry (Determines Safe Depth of Discharge)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { id: 'lifepo4' as BatteryChemistry, name: "Lithium LiFePO4", dod: "90% Safe DoD", desc: "Long life, high efficiency" },
                        { id: 'lead_acid' as BatteryChemistry, name: "Tubular Lead-Acid", dod: "50% Safe DoD", desc: "Standard deep-cycle tall tubular" },
                        { id: 'agm' as BatteryChemistry, name: "AGM / Gel VRLA", dod: "65% Safe DoD", desc: "Sealed maintenance-free" },
                        { id: 'unknown' as BatteryChemistry, name: "Not sure", dod: "No runtime estimate", desc: "Check battery label before sizing" }
                      ].map(chem => (
                        <div
                          key={chem.id}
                          onClick={() => setBatteryChemistry(chem.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            batteryChemistry === chem.id 
                              ? 'bg-primary/10 border-primary text-foreground' 
                              : 'bg-surface border-border text-muted-foreground hover:border-border/80'
                          }`}
                        >
                          <div className="font-bold text-xs text-foreground">{chem.name}</div>
                          <div className="text-[11px] font-mono text-primary font-semibold">{chem.dod}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Input Mode: Volts+Ah vs Direct kWh */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-4 text-xs font-medium">
                          <button
                        type="button"
                        onClick={() => setUseDirectKwh(false)}
                        className={`pb-1 border-b-2 font-bold ${!useDirectKwh ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                      >
                        Voltage + Amp-Hours (Standard Inverters)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseDirectKwh(true)}
                        className={`pb-1 border-b-2 font-bold ${useDirectKwh ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                      >
                        Direct kWh (e.g., 5.1 kWh Powerwall)
                      </button>
                    </div>

                    {!useDirectKwh ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Total battery bank voltage</label>
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            step="any"
                            value={voltage || ''}
                            onChange={e => setVoltage(e.target.value === '' ? 0 : Number(e.target.value))}
                            placeholder="Whole bank voltage (e.g. 12, 24, 48)"
                            className="w-full bg-surface border border-border rounded-xl p-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Total Amp-Hours (Ah)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={1000000}
                              value={ampHours}
                              onChange={e => setAmpHours(e.target.value === '' ? 0 : Number(e.target.value))}
                              className="w-full bg-surface border border-border rounded-xl p-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                            />
                            <span className="text-xs font-mono text-muted-foreground">Ah</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Total Storage Capacity (kWh)</label>
                        <div className="flex items-center gap-2 max-w-xs">
                          <input
                            type="number"
                            step="0.1"
                            min="0.01"
                            max="1000"
                            value={directKwh ?? ''}
                            onChange={e => setDirectKwh(e.target.value === '' ? null : Number(e.target.value))}
                            className="w-full bg-surface border border-border rounded-xl p-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                          />
                          <span className="text-xs font-mono text-muted-foreground">kWh</span>
                        </div>
                      </div>
                    )}

                    {/* Calculated Nominal Wh badge */}
                    <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Calculated Nominal Wh:</span>
                      <span className="font-bold text-primary">
                        {useDirectKwh ? directKwh !== null ? `${Math.round(directKwh * 1000)} Wh` : 'Not available' : voltage > 0 && ampHours > 0 ? `${voltage * ampHours} Wh` : 'Not available'}
                      </span>
                    </div>
                    {((useDirectKwh && (directKwh === null || directKwh <= 0)) || (!useDirectKwh && !(voltage > 0 && ampHours > 0))) && <p className="text-xs text-amber-600 dark:text-amber-400">Capacity is still incomplete. You can continue, but runtime and battery reserve will stay unavailable until you enter total bank capacity and select its chemistry.</p>}
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <strong className="block font-bold">Battery capacity not provided</strong>
                    You can continue safely. PowerUp will calculate appliance load and energy use, but won’t estimate runtime or battery reserve until the battery bank capacity and chemistry are known.
                    <details className="mt-3 rounded-lg border border-amber-500/20 bg-background/60 p-3 text-foreground">
                      <summary className="cursor-pointer font-semibold">Where can I find these specifications?</summary>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                        <li>Check the battery label, product manual, or manufacturer datasheet for chemistry and capacity.</li>
                        <li>For a battery bank, enter the bank’s total voltage and total amp-hours (Ah), or its stated total kWh. Don’t enter a single battery’s rating if the bank has multiple batteries.</li>
                        <li>If only volts and amp-hours are listed, PowerUp calculates nominal energy as volts × amp-hours. This is not the usable capacity.</li>
                        <li>If you can’t confirm the values, leave safe mode on. No capacity or runtime will be guessed.</li>
                      </ul>
                      <button type="button" onClick={() => setIsCapacityUnknown(false)} className="mt-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 font-semibold text-primary hover:bg-primary/20">
                        I found the specifications — enter them
                      </button>
                    </details>
                  </div>
                </div>
              )}

              </> : <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700">No battery is configured. PowerUp can calculate load and energy use, but it will not estimate battery runtime.</p>}

              {/* Inverter Continuous Rating */}
              <div className="pt-2 border-t border-border">
                <label className="block text-xs text-muted-foreground mb-1">
                  Inverter Continuous Capacity (VA / Watts)
                </label>
                <select
                  value={inverterRatingWatts ?? ''}
                  onChange={e => { const watts = e.target.value ? parseInt(e.target.value, 10) : null; setInverterRatingWatts(watts); if (watts !== null) setInverterRatingVA(null) }}
                  className="w-full sm:max-w-xs bg-surface border border-border rounded-xl p-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Unknown / not provided</option>
                  {inverterRatingWatts !== null && ![1000, 1500, 2000, 3000, 5000].includes(inverterRatingWatts) && <option value={inverterRatingWatts}>{inverterRatingWatts.toLocaleString()} W (entered)</option>}
                  <option value={1000}>1,000 W</option>
                  <option value={1500}>1,500 W</option>
                  <option value={2000}>2,000 W</option>
                  <option value={3000}>3,000 W</option>
                  <option value={5000}>5,000 W</option>
                </select>
                <label className="mt-3 block text-xs text-muted-foreground">Inverter rating (VA), if watts are not listed
                  <input type="number" min="1" max="100000" value={inverterRatingVA ?? ''} onChange={event => { const va = event.target.value ? Number(event.target.value) : null; setInverterRatingVA(va); if (va !== null) setInverterRatingWatts(null) }} placeholder="Optional label value" className="mt-1.5 w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-none sm:max-w-xs" />
                </label>
                <label className="mt-3 block text-xs text-muted-foreground">Inverter surge capacity (optional, watts)
                  <input type="number" min={1} max={100000} placeholder="Check the inverter label" value={inverterSurgeWatts ?? ''} onChange={e => setInverterSurgeWatts(e.target.value ? parseInt(e.target.value, 10) : null)} className="mt-1.5 w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-none sm:max-w-xs" />
                </label>
              </div>

              {backupType === 'solar' && <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                <label className="text-xs text-muted-foreground">Solar panel count (optional)
                  <input type="number" min="1" max="10000" value={solarPanelCount ?? ''} onChange={event => setSolarPanelCount(event.target.value === '' ? null : Number(event.target.value))} placeholder="Not provided" className="mt-1.5 w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-none" />
                </label>
                <label className="text-xs text-muted-foreground">Rated watts per panel (optional)
                  <input type="number" min="1" max="5000" value={solarPanelWatts ?? ''} onChange={event => setSolarPanelWatts(event.target.value === '' ? null : Number(event.target.value))} placeholder="Check panel label" className="mt-1.5 w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-none" />
                </label>
                {solarPanelCount && solarPanelWatts && <p className="text-xs text-muted-foreground sm:col-span-2">Configured panel nameplate capacity: <strong className="text-foreground">{solarPanelCount * solarPanelWatts} W</strong>. This is not a generation forecast.</p>}
              </div>}

            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-border bg-card">
              <p className="text-sm text-muted-foreground">
                Since you do not currently have a battery inverter system, we will formulate an emergency load-shedding survival kit and advise on essential power bank capacities.
              </p>
            </div>
          )}

          {/* Outage Duration Slider */}
          <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-foreground">Typical Load-Shedding Outage Duration</label>
                <p className="text-xs text-muted-foreground">How many consecutive hours does your neighborhood lose grid power?</p>
              </div>
              <span className="text-lg font-bold font-mono text-primary px-3 py-1 rounded-xl bg-primary/10 border border-primary/20">
                {typicalOutageHours} Hours
              </span>
            </div>
            
            <input
              type="range"
              min={1}
              max={24}
              step={1}
              value={typicalOutageHours}
              onChange={e => setTypicalOutageHours(parseInt(e.target.value, 10))}
              className="w-full accent-primary h-2 bg-surface rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>1 Hour</span>
              <span>4 Hours (Standard)</span>
              <span>8 Hours</span>
              <span>24 Hours</span>
            </div>
          </div>

          <div className="flex justify-between pt-4">
                  <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-black font-semibold text-sm hover:bg-primary-hover transition-colors"
            >
              Select Appliances <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: Appliance Selection */}
      {currentStep === 3 && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6 text-left"
        >
          {/* Live Load Meter Header */}
          <div className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-mono">Total Connected Load</span>
              <div className="text-2xl font-extrabold text-foreground font-mono flex items-center gap-2">
                <span>{totalLiveWatts} Watts</span>
                {inverterRatingWatts !== null && totalLiveWatts > (inverterRatingWatts * 0.85) && (
                  <span className="text-xs font-sans font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    High Inverter Load
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Planned energy use: <strong className="text-foreground">{Math.round(estimatedEnergyWh)} Wh</strong> for the entered operating hours. Preset wattages are estimates.</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All' },
                { id: 'connectivity', label: 'Connectivity' },
                { id: 'cooling', label: 'Cooling & Food' },
                { id: 'lighting', label: 'Lights' },
                { id: 'critical', label: 'Critical' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                    activeCategory === cat.id 
                      ? 'bg-primary text-black font-bold border-primary' 
                      : 'bg-surface text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Appliances Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {PRESET_APPLIANCES
              .filter(a => activeCategory === 'all' || a.category === activeCategory)
              .map(appliance => {
                const isSelected = !!selectedMap[appliance.id]
                const item = selectedMap[appliance.id]
                const count = item?.quantity || 1

                return (
                  <div
                    key={appliance.id}
                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-primary/5 border-primary shadow-sm' 
                        : 'bg-card border-border hover:border-border/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-foreground leading-tight">
                          {appliance.name}
                        </span>
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-primary shrink-0">
                          Preset {appliance.wattage}W
                        </span>
                      </div>

                      {appliance.tip && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight mb-3">
                          {appliance.tip}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => toggleAppliance(appliance.id)}
                        className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                          isSelected 
                            ? 'bg-primary text-black' 
                            : 'bg-surface hover:bg-foreground/10 text-foreground'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>

                      {isSelected && (
                        <div className="mt-3 grid w-full grid-cols-2 gap-2 border-t border-border/60 pt-3">
                          <label className="text-[10px] text-muted-foreground">Quantity
                            <div className="mt-1 flex items-center gap-1"><button type="button" aria-label={`Remove one ${appliance.name}`} onClick={() => changeQuantity(appliance.id, -1)} className="rounded border border-border p-1"><Minus className="h-3 w-3"/></button><input type="number" min="1" max="1000" value={count} onChange={event => updateAppliance(appliance.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} className="w-full min-w-0 rounded border border-border bg-surface p-1 text-xs"/><button type="button" aria-label={`Add one ${appliance.name}`} onClick={() => changeQuantity(appliance.id, 1)} className="rounded border border-border p-1"><Plus className="h-3 w-3"/></button></div>
                          </label>
                          <label className="text-[10px] text-muted-foreground">Rated watts each<input type="number" min="1" max="100000" value={item.watts ?? appliance.wattage} onChange={event => updateAppliance(appliance.id, { watts: Number(event.target.value) })} className="mt-1 w-full rounded border border-border bg-surface p-1 text-xs"/></label>
                          <label className="text-[10px] text-muted-foreground">Surge W each (optional)<input type="number" min="1" max="100000" value={item.surgeWatts ?? ''} onChange={event => updateAppliance(appliance.id, { surgeWatts: event.target.value === '' ? undefined : Number(event.target.value) })} className="mt-1 w-full rounded border border-border bg-surface p-1 text-xs"/></label>
                          <label className="text-[10px] text-muted-foreground">Hours during outage<input type="number" min="0" max={typicalOutageHours} step="0.25" value={item.operatingHours ?? typicalOutageHours} onChange={event => updateAppliance(appliance.id, { operatingHours: Number(event.target.value) })} className="mt-1 w-full rounded border border-border bg-surface p-1 text-xs"/></label>
                          <label className="text-[10px] text-muted-foreground">Priority<select value={item.priority ?? 'normal'} onChange={event => updateAppliance(appliance.id, { priority: event.target.value as AppliancePriority })} className="mt-1 w-full rounded border border-border bg-surface p-1.5 text-xs"><option value="critical">Critical</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label>
                          <label className="col-span-2 flex items-center gap-2 text-[11px] text-foreground"><input type="checkbox" checked={item.mustRun ?? false} onChange={event => updateAppliance(appliance.id, { mustRun: event.target.checked })} className="accent-primary"/>Must run during outage</label>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {Object.entries(selectedMap).filter(([, item]) => item.customName).length > 0 && <section className="rounded-2xl border border-border bg-card p-4"><h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Custom appliances</h3><div className="space-y-3">{Object.entries(selectedMap).filter(([, item]) => item.customName).map(([id, item]) => <div key={id} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-7"><strong className="text-xs text-foreground sm:col-span-2">{item.customName}</strong><label className="text-[10px] text-muted-foreground">Quantity<input type="number" min="1" max="1000" value={item.quantity} onChange={event => updateAppliance(id, { quantity: Number(event.target.value) })} className="mt-1 w-full rounded border border-border bg-surface p-1 text-xs"/></label><label className="text-[10px] text-muted-foreground">Watts each<input type="number" min="1" max="100000" value={item.watts ?? item.customWatts ?? ''} onChange={event => updateAppliance(id, { watts: Number(event.target.value) })} className="mt-1 w-full rounded border border-border bg-surface p-1 text-xs"/></label><label className="text-[10px] text-muted-foreground">Surge W each<input type="number" min="1" max="100000" value={item.surgeWatts ?? ''} onChange={event => updateAppliance(id, { surgeWatts: event.target.value === '' ? undefined : Number(event.target.value) })} className="mt-1 w-full rounded border border-border bg-surface p-1 text-xs"/></label><label className="text-[10px] text-muted-foreground">Hours<input type="number" min="0" max={typicalOutageHours} step="0.25" value={item.operatingHours ?? typicalOutageHours} onChange={event => updateAppliance(id, { operatingHours: Number(event.target.value) })} className="mt-1 w-full rounded border border-border bg-surface p-1 text-xs"/></label><button type="button" onClick={() => setSelectedMap(prev => { const next = { ...prev }; delete next[id]; return next })} className="self-end text-xs font-semibold text-red-700">Remove</button><div className="flex flex-wrap items-center gap-3 sm:col-span-7"><label className="text-xs">Priority<select value={item.priority ?? 'normal'} onChange={event => updateAppliance(id, { priority: event.target.value as AppliancePriority })} className="ml-2 rounded border border-border bg-surface p-1"><option value="critical">Critical</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={item.mustRun ?? false} onChange={event => updateAppliance(id, { mustRun: event.target.checked })} className="accent-primary"/>Must run</label></div></div>)}</div></section>}

          {/* Add Custom Appliance Form */}
          <div className="p-4 rounded-2xl border border-dashed border-border bg-card/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Add a Custom Appliance
            </h4>
            <form onSubmit={handleAddCustom} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Appliance name (e.g. Baby Monitor, Oxygen Pump)"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100000"
                  placeholder="Watts"
                  value={customWatts}
                  onChange={e => setCustomWatts(e.target.value)}
                  className="w-24 bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-surface hover:bg-primary hover:text-black transition-colors rounded-xl text-xs font-bold border border-border flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </form>
            <p className="mt-2 text-[10px] text-muted-foreground">Preset watts are estimates from the appliance catalog. Confirm or edit them using your appliance label when possible.</p>
          </div>

          {validationError && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{validationError}</p>}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-black font-semibold text-sm hover:bg-primary-hover transition-colors"
            >
              Household Priorities <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 4: Household Priority Mode */}
      {currentStep === 4 && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6 text-left"
        >
          <div className="space-y-3">
            {[
              {
                id: 'maximum_runtime' as PriorityMode,
                title: "Maximum Runtime Mode",
                desc: "Include must-run, critical, and high-priority appliances in the planned energy estimate. Normal and low priorities are deferred.",
                tag: "High Resilience"
              },
              {
                id: 'balanced' as PriorityMode,
                title: "Balanced Household Comfort (Recommended)",
                desc: "Include all selected appliances using each item's entered operating hours.",
                tag: "Most Popular"
              },
              {
                id: 'critical_only' as PriorityMode,
                title: "Critical Infrastructure Only",
                desc: "Include only must-run and critical-priority appliances in the planned energy estimate.",
                tag: "Emergency Guard"
              }
            ].map(mode => (
              <div
                key={mode.id}
                onClick={() => setPriorityMode(mode.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  priorityMode === mode.id 
                    ? 'bg-card border-primary ring-2 ring-primary/20 shadow-md' 
                    : 'bg-card/50 border-border hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-foreground">{mode.title}</h3>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-primary">
                    {mode.tag}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{mode.desc}</p>
              </div>
            ))}
          </div>

          {/* Pre-submission Summary Review */}
          <div className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Backup Type:</span>
              <span className="text-foreground capitalize">{backupType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Outage Duration:</span>
              <span className="text-foreground">{typicalOutageHours} Hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Appliances Selected:</span>
              <span className="text-foreground">{Object.keys(selectedMap).length} Devices</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initial Base Load:</span>
              <span className="text-primary font-bold">{totalLiveWatts} Watts</span>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleFinalSubmit}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              Calculate Backup Plan
            </button>
          </div>
        </motion.div>
      )}

    </div>
  )
}
