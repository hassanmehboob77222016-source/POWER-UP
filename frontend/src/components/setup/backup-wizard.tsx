import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, Sun, ArrowRight, ArrowLeft, 
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

type SelectedAppliance = {
  quantity: number
  customWatts?: number
  customName?: string
  watts?: number
  surgeWatts?: number
  operatingHours?: number
  mustRun?: boolean
  priority?: AppliancePriority
}

const UPS_VA_RATINGS = [300, 500, 600, 650, 750, 800, 850, 1000, 1200, 1500, 1600, 2000, 2500, 3000, 5000, 6000, 8000, 10000]

export function BackupWizard({ initialInputs, initialStep = 1, onSubmit, onCancel }: BackupWizardProps) {
  const [currentStep, setCurrentStep] = useState(Math.min(4, Math.max(1, initialStep)))

  // Form State
  const [backupType, setBackupType] = useState<BackupType | null>(
    initialInputs?.backupType === 'solar' || initialInputs?.backupType === 'inverter' ? initialInputs.backupType : null
  )
  const [batteryChemistry, setBatteryChemistry] = useState<BatteryChemistry>(initialInputs?.batteryChemistry || 'unknown')
  const [voltage, setVoltage] = useState<number>(initialInputs?.voltage || 0)
  const [ampHoursInput, setAmpHoursInput] = useState(initialInputs?.ampHours != null ? String(initialInputs.ampHours) : '')
  const ampHours = ampHoursInput === '' ? 0 : Number(ampHoursInput)
  const [directKwh, setDirectKwh] = useState<number | null>(initialInputs?.directKwh ?? null)
  const [useDirectKwh, setUseDirectKwh] = useState<boolean>(initialInputs?.directKwh != null)
  const [batteryDetailChoice, setBatteryDetailChoice] = useState<'have' | 'unknown' | null>(
    initialInputs ? (initialInputs.isCapacityUnknown ? 'unknown' : 'have') : null
  )
  const [inverterRatingWatts, setInverterRatingWatts] = useState<number | null>(initialInputs ? initialInputs.inverterRatingWatts : null)
  const [inverterRatingVA, setInverterRatingVA] = useState<number | null>(initialInputs?.inverterRatingVA ?? null)
  const inverterSurgeWatts = initialInputs?.inverterSurgeWatts ?? null
  const [solarPanelCount, setSolarPanelCount] = useState<number | null>(initialInputs?.solarPanelCount ?? null)
  const [solarPanelWatts, setSolarPanelWatts] = useState<number | null>(initialInputs?.solarPanelWatts ?? null)
  const [typicalOutageHours, setTypicalOutageHours] = useState<number>(initialInputs?.typicalOutageHours || 4)
  const [priorityMode, setPriorityMode] = useState<PriorityMode>(initialInputs?.priorityMode || 'balanced')

  // Selected appliances map
  const [selectedMap, setSelectedMap] = useState<Record<string, SelectedAppliance>>(() => {
    if (initialInputs?.selectedAppliances?.length) {
      const map: Record<string, SelectedAppliance> = {}
      initialInputs.selectedAppliances.forEach(item => {
        const preset = PRESET_APPLIANCES.find(appliance => appliance.id === item.applianceId)
        const savedWatts = item.watts ?? item.customWatts ?? preset?.wattage
        const groupedUnitCount = preset?.unitCount ?? 1
        const isSavedAsGroupedPreset = Boolean(preset?.unitCount && item.quantity === 1 && savedWatts === preset.wattage)
        const quantity = isSavedAsGroupedPreset ? groupedUnitCount : item.quantity
        map[item.applianceId] = {
          quantity,
          customWatts: item.customWatts,
          customName: item.customName,
          watts: isSavedAsGroupedPreset ? (savedWatts ?? 0) / quantity : savedWatts,
          surgeWatts: item.surgeWatts ?? preset?.surgeWattage,
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
        const unitCount = preset?.unitCount ?? 1
        next[id] = {
          quantity: unitCount,
          watts: preset ? preset.wattage / unitCount : 0,
          surgeWatts: preset?.surgeWattage === undefined ? undefined : preset.surgeWattage / unitCount,
          operatingHours: typicalOutageHours,
          mustRun: false,
          priority: preset?.isCritical ? 'critical' : 'normal',
        }
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

  const validateRequiredEquipmentDetails = () => {
    const validVA = inverterRatingVA !== null && Number.isFinite(inverterRatingVA) && inverterRatingVA > 0 && inverterRatingVA <= 100000
    if (!validVA) {
      setValidationError('Select the UPS/inverter VA or kVA rating to continue.')
      return false
    }
    if (backupType === 'solar' && (
      !Number.isInteger(solarPanelCount) || (solarPanelCount ?? 0) < 1 || (solarPanelCount ?? 0) > 10000 ||
      !Number.isFinite(solarPanelWatts) || (solarPanelWatts ?? 0) < 1 || (solarPanelWatts ?? 0) > 5000
    )) {
      setValidationError('Enter the solar panel count and each panel’s rated wattage.')
      return false
    }
    return true
  }

  const hasBatteryDetails = batteryDetailChoice === 'have' && batteryChemistry !== 'unknown' && (
    useDirectKwh
      ? directKwh !== null && Number.isFinite(directKwh) && directKwh > 0 && directKwh <= 1000
      : Number.isFinite(voltage) && voltage > 0 && voltage <= 1000 && Number.isFinite(ampHours) && ampHours > 0 && ampHours <= 1000000
  )

  const validateBatteryDetails = () => {
    if (batteryDetailChoice !== 'have') {
      setValidationError('Select “I have the label details” and enter your battery details to continue.')
      return false
    }
    if (batteryChemistry === 'unknown') {
      setValidationError('Choose the battery type shown on its label.')
      return false
    }
    if (!hasBatteryDetails) {
      setValidationError(useDirectKwh ? 'Enter a valid battery capacity in kWh.' : 'Enter a valid battery voltage and capacity in Ah.')
      return false
    }
    return true
  }

  const handleFinalSubmit = () => {
    setValidationError('')
    if (!backupType) { setCurrentStep(1); setValidationError('Choose a backup power setup to continue.'); return }
    if (!validateBatteryDetails()) { setCurrentStep(2); return }
    if (!validateRequiredEquipmentDetails()) return
    if (!Number.isFinite(typicalOutageHours) || typicalOutageHours < 1 || typicalOutageHours > 24) { setValidationError('Choose an outage length between 1 and 24 hours.'); return }
    if (Object.keys(selectedMap).length === 0) { setValidationError('Choose at least one appliance to see your backup estimate.'); return }
    const invalidAppliance = Object.values(selectedMap).some(item => !Number.isFinite(item.quantity) || item.quantity < 1 || !Number.isFinite(item.watts) || (item.watts ?? 0) <= 0 || !Number.isFinite(item.operatingHours) || (item.operatingHours ?? -1) < 0 || (item.operatingHours ?? 0) > typicalOutageHours || (item.surgeWatts !== undefined && (!Number.isFinite(item.surgeWatts) || item.surgeWatts <= 0)))
    if (invalidAppliance) { setValidationError(`Check the appliance counts, power values, and hours used (up to ${typicalOutageHours}).`); return }
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
      hasBattery: true,
      batteryChemistry,
      voltage: useDirectKwh ? 0 : voltage,
      ampHours: useDirectKwh ? 0 : ampHours,
      directKwh: useDirectKwh ? directKwh : null,
      isCapacityUnknown: false,
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
  const upsVaOptions = inverterRatingVA !== null && !UPS_VA_RATINGS.includes(inverterRatingVA)
    ? [...UPS_VA_RATINGS, inverterRatingVA].sort((a, b) => a - b)
    : UPS_VA_RATINGS
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Wizard Header with Step Progress */}
      <div className="mb-8 text-left">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-primary">
            {['Your backup setup', 'Your battery and outage', 'Appliances to power', 'Your backup priorities'][currentStep - 1]} | {currentStep} of 4
          </span>
          <div className="flex items-center gap-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(step => step - 1)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous step
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Exit calculator
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          className="w-full bg-surface rounded-full h-2 mb-4 overflow-hidden border border-border"
          role="progressbar"
          aria-label="Calculator progress"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={currentStep}
        >
          <div 
            className="bg-primary h-full transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
          {currentStep === 1 && "What do you use for backup power?"}
          {currentStep === 2 && "How long should power last?"}
          {currentStep === 3 && "What would you like to keep running?"}
          {currentStep === 4 && "What matters most during an outage?"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {currentStep === 1 && "Choose the closest match. If you are not sure, pick the option you use most often."}
          {currentStep === 2 && "Enter your battery details and how long your power usually goes out."}
          {currentStep === 3 && "Choose the lights, devices, and appliances you want to use. You can keep the suggested estimates."}
          {currentStep === 4 && "Choose whether to include everything or save power for the essentials."}
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
                title: "Home inverter or UPS",
                desc: "A backup unit connected to one or more batteries.",
                icon: Zap,
              },
              {
                id: 'solar' as BackupType,
                title: "Solar panels with batteries",
                desc: "Solar panels and a battery system for backup power.",
                icon: Sun
              },
            ].map(item => {
              const Icon = item.icon
              const isSelected = backupType === item.id
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => { setBackupType(item.id); setValidationError('') }}
                  aria-pressed={isSelected}
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
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </button>
              )
            })}
          </div>

          {validationError && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{validationError}</p>}

          <div className="pt-6 flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!backupType}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-black font-semibold text-sm hover:bg-primary-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue <ArrowRight className="w-4 h-4" />
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
          <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
              
              {/* Battery label details choice */}
              <div className="pb-4 border-b border-border">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Do you know the details on your battery label?</h4>
                  <p className="text-sm text-muted-foreground">Battery type and capacity are required to continue.</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {([
                    { id: 'have', label: 'I have the label details' },
                    { id: 'unknown', label: 'I do not know' },
                  ] as const).map(choice => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => { setBatteryDetailChoice(choice.id); setValidationError('') }}
                      aria-pressed={batteryDetailChoice === choice.id}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${batteryDetailChoice === choice.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-foreground hover:border-primary/50'}`}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>

              {batteryDetailChoice === 'have' ? (
                <>
                  {/* Chemistry Selector */}
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">
                      What kind of battery is it?
                    </label>
                    <p className="mb-3 text-sm text-muted-foreground">Choose the battery type shown on its label.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { id: 'lifepo4' as BatteryChemistry, name: "Lithium (LiFePO4)", dod: "Lithium battery", desc: "Often marked LiFePO4" },
                        { id: 'lead_acid' as BatteryChemistry, name: "Lead-acid", dod: "Tubular or deep-cycle", desc: "Usually a heavier battery" },
                        { id: 'agm' as BatteryChemistry, name: "AGM or gel", dod: "Sealed battery", desc: "Usually marked AGM or GEL" }
                      ].map(chem => (
                        <button
                          type="button"
                          key={chem.id}
                          onClick={() => setBatteryChemistry(chem.id)}
                          aria-pressed={batteryChemistry === chem.id}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            batteryChemistry === chem.id 
                              ? 'bg-primary/10 border-primary text-foreground' 
                              : 'bg-surface border-border text-muted-foreground hover:border-border/80'
                          }`}
                        >
                          <div className="font-bold text-xs text-foreground">{chem.name}</div>
                          <div className="text-xs text-primary font-semibold">{chem.dod}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{chem.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Mode: Volts+Ah vs Direct kWh */}
                  <div className="space-y-4 pt-2">
                    <p className="text-sm font-bold text-foreground">What numbers are shown on the label?</p>
                    <p className="text-sm text-muted-foreground">Use either the voltage and Ah, or the total kWh. Enter the battery bank total, not one battery in the bank.</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                          <button
                        type="button"
                        onClick={() => setUseDirectKwh(false)}
                        className={`pb-1 border-b-2 font-bold ${!useDirectKwh ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                      >
                        Voltage and Ah
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseDirectKwh(true)}
                        className={`pb-1 border-b-2 font-bold ${useDirectKwh ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                      >
                        Total kWh
                      </button>
                    </div>

                    {!useDirectKwh ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-foreground mb-1">Battery voltage (V)</label>
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            step="any"
                            value={voltage || ''}
                            onChange={e => setVoltage(e.target.value === '' ? 0 : Number(e.target.value))}
                            placeholder="For example, 12, 24, or 48"
                            className="w-full bg-surface border border-border rounded-xl p-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-foreground mb-1">Battery capacity (Ah)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={1000000}
                              value={ampHoursInput}
                              onChange={e => setAmpHoursInput(e.target.value.replace(/^0+(?=\d)/, ''))}
                              className="w-full bg-surface border border-border rounded-xl p-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                            />
                            <span className="text-xs font-mono text-muted-foreground">Ah</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm text-foreground mb-1">Battery capacity (kWh)</label>
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

                    {/* Show battery energy in a familiar unit. */}
                    <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Estimated battery storage:</span>
                      <span className="font-bold text-primary">
                        {useDirectKwh ? directKwh !== null ? `${directKwh} kWh` : 'Not entered' : voltage > 0 && ampHours > 0 ? `${(voltage * ampHours / 1000).toFixed(1)} kWh` : 'Not entered'}
                      </span>
                    </div>
                    {!hasBatteryDetails && <p className="text-sm text-amber-700">Enter the battery type and capacity shown on the label to continue.</p>}
                  </div>
                </>
              ) : batteryDetailChoice === 'unknown' ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <strong className="block font-bold">Battery details are required</strong>
                    Check your battery label or manual for its type and capacity before continuing.
                    <details className="mt-3 rounded-lg border border-amber-500/20 bg-background/60 p-3 text-foreground">
                      <summary className="cursor-pointer font-semibold">Where do I find these details?</summary>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                        <li>Look for a sticker on the battery or check its manual.</li>
                        <li>If you have several batteries connected together, use the total values for the whole group.</li>
                        <li>Only enter values you can confirm. PowerUp will not guess missing battery details.</li>
                      </ul>
                      <button type="button" onClick={() => setBatteryDetailChoice('have')} className="mt-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 font-semibold text-primary hover:bg-primary/20">
                        I found the label
                      </button>
                    </details>
                  </div>
                </div>
              ) : null}

              <details open className="border-t border-border pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">Backup unit details (required)</summary>
                <p className="mt-2 text-sm text-muted-foreground">Select the VA or kVA rating shown on your UPS or inverter label.</p>
                <div className="mt-3 sm:max-w-md">
                  <label htmlFor="ups-va-rating" className="block text-sm text-foreground mb-1">UPS size (VA / kVA)</label>
                  <select
                    id="ups-va-rating"
                    value={inverterRatingVA ?? ''}
                    onChange={e => {
                      setInverterRatingVA(e.target.value === '' ? null : Number(e.target.value))
                      setInverterRatingWatts(null)
                    }}
                    className="w-full bg-surface border border-border rounded-xl p-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Select a UPS size</option>
                    {upsVaOptions.map(rating => (
                      <option key={rating} value={rating}>
                        {rating.toLocaleString()} VA ({rating / 1000} kVA) · approx. {Math.round(rating * 0.6).toLocaleString()}–{rating.toLocaleString()} W{!UPS_VA_RATINGS.includes(rating) ? ' (saved rating)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">W ranges are broad examples because actual output varies by model. Load checks need a confirmed watt rating.</p>
              </details>

              {backupType === 'solar' && <details open className="border-t border-border pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">Solar panel details (required)</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-foreground">Number of solar panels <span aria-hidden="true">*</span>
                  <input type="number" min="1" max="10000" required value={solarPanelCount ?? ''} onChange={event => setSolarPanelCount(event.target.value === '' ? null : Number(event.target.value))} placeholder="Enter panel count" className="mt-1.5 w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-none" />
                </label>
                <label className="text-sm text-foreground">Power shown on each panel (W) <span aria-hidden="true">*</span>
                  <input type="number" min="1" max="5000" required value={solarPanelWatts ?? ''} onChange={event => setSolarPanelWatts(event.target.value === '' ? null : Number(event.target.value))} placeholder="Check panel label" className="mt-1.5 w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-none" />
                </label>
                {solarPanelCount && solarPanelWatts && <p className="text-xs text-muted-foreground sm:col-span-2">Configured panel nameplate capacity: <strong className="text-foreground">{solarPanelCount * solarPanelWatts} W</strong>. This is not a generation forecast.</p>}
                </div>
              </details>}

          </div>

          {/* Outage Duration Slider */}
          <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-foreground">How long is a typical power cut?</label>
                <p className="text-sm text-muted-foreground">Choose the number of hours you want your backup to cover.</p>
              </div>
              <span className="text-lg font-bold text-primary px-3 py-1 rounded-xl bg-primary/10 border border-primary/20">
                {typicalOutageHours} {typicalOutageHours === 1 ? 'hour' : 'hours'}
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
            <div className="relative h-4 text-[10px] font-mono text-muted-foreground">
              {[
                { hour: 1, label: '1 hour' },
                { hour: 4, label: '4 hours' },
                { hour: 8, label: '8 hours' },
                { hour: 24, label: '24 hours' },
              ].map(tick => (
                <span
                  key={tick.hour}
                  className={`absolute whitespace-nowrap ${tick.hour === 1 ? '' : tick.hour === 24 ? '-translate-x-full' : '-translate-x-1/2'}`}
                  style={{ left: `${((tick.hour - 1) / 23) * 100}%` }}
                >
                  {tick.label}
                </span>
              ))}
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
              onClick={() => {
                setValidationError('')
                if (!validateBatteryDetails()) return
                if (!validateRequiredEquipmentDetails()) return
                setCurrentStep(3)
              }}
              aria-disabled={!hasBatteryDetails}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-black font-semibold text-sm hover:bg-primary-hover transition-colors aria-disabled:opacity-50"
            >
              Choose appliances <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {validationError && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{validationError}</p>}
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
              <span className="text-sm font-semibold text-foreground">Estimated power if everything runs together</span>
              <div className="mt-1 text-2xl font-extrabold text-foreground flex items-center gap-2">
                <span>{totalLiveWatts} W</span>
                {inverterRatingWatts !== null && totalLiveWatts > (inverterRatingWatts * 0.85) && (
                  <span className="text-xs font-sans font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    May be more than your system can handle
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">W means watts, a measure of power. Appliance values are typical estimates, so you do not need to know the exact number.</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All appliances' },
                { id: 'connectivity', label: 'Internet & devices' },
                { id: 'cooling', label: 'Cooling & food' },
                { id: 'lighting', label: 'Lights' },
                { id: 'critical', label: 'Medical & other' },
                { id: 'kitchen', label: 'TV & kitchen' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-sm px-3 py-1.5 rounded-xl border transition-all ${
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

          {!initialInputs && <p className="text-sm text-muted-foreground">
            Choose only the appliances you want to include. Add them below, and adjust their quantity or estimated usage if needed.
          </p>}

          {/* Preset Appliances Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <span className="text-base font-bold text-foreground leading-tight">
                          {appliance.name}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface border border-border text-primary shrink-0">
                          About {Math.round(appliance.wattage / (appliance.unitCount ?? 1))} W each
                        </span>
                      </div>

                      {appliance.tip && (
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {appliance.tip}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => toggleAppliance(appliance.id)}
                        aria-pressed={isSelected}
                        className={`text-sm px-4 py-2 rounded-lg font-semibold transition-colors ${
                          isSelected 
                            ? 'bg-primary text-black' 
                            : 'bg-surface hover:bg-foreground/10 text-foreground'
                        }`}
                      >
                        {isSelected ? 'Added' : 'Add appliance'}
                      </button>

                      {isSelected && (
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                          <label className="text-sm text-foreground">How many?
                            <div className="mt-1 flex items-center gap-2">
                              <button type="button" aria-label={`Remove one ${appliance.name}`} onClick={() => changeQuantity(appliance.id, -1)} className="rounded-lg border border-border p-2 hover:bg-surface"><Minus className="h-4 w-4"/></button>
                              <input aria-label={`${appliance.name} quantity`} type="number" min="1" max="1000" value={count} onChange={event => updateAppliance(appliance.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} className="w-16 rounded-lg border border-border bg-surface p-2 text-center text-sm"/>
                              <button type="button" aria-label={`Add one ${appliance.name}`} onClick={() => changeQuantity(appliance.id, 1)} className="rounded-lg border border-border p-2 hover:bg-surface"><Plus className="h-4 w-4"/></button>
                            </div>
                          </label>
                          <details className="min-w-full border-t border-border/60 pt-2">
                            <summary className="cursor-pointer text-sm font-semibold text-primary">Adjust estimate or usage (optional)</summary>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <label className="text-sm text-foreground">Power shown on appliance label (W)
                                <input type="number" min="1" max="100000" value={item.watts ?? appliance.wattage} onChange={event => updateAppliance(appliance.id, { watts: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm"/>
                              </label>
                              <label className="text-sm text-foreground">Hours you expect to use it
                                <input type="number" min="0" max={typicalOutageHours} step="0.25" value={item.operatingHours ?? typicalOutageHours} onChange={event => updateAppliance(appliance.id, { operatingHours: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm"/>
                              </label>
                              <label className="text-sm text-foreground">Importance
                                <select value={item.priority ?? 'normal'} onChange={event => updateAppliance(appliance.id, { priority: event.target.value as AppliancePriority })} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm">
                                  <option value="critical">Essential</option><option value="high">Very important</option><option value="normal">Useful</option><option value="low">Can do without</option>
                                </select>
                              </label>
                              {appliance.surgeWattage !== undefined && <label className="text-sm text-foreground">Extra power to start (W), if on label
                                <input type="number" min="1" max="100000" value={item.surgeWatts ?? ''} onChange={event => updateAppliance(appliance.id, { surgeWatts: event.target.value === '' ? undefined : Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm"/>
                              </label>}
                              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-foreground">
                                <input type="checkbox" checked={item.mustRun ?? false} onChange={event => updateAppliance(appliance.id, { mustRun: event.target.checked })} className="accent-primary"/>
                                I need this appliance to stay on
                              </label>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {Object.entries(selectedMap).some(([, item]) => item.customName) && (
            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-base font-bold text-foreground">Appliances you added</h3>
              <div className="space-y-3">
                {Object.entries(selectedMap).filter(([, item]) => item.customName).map(([id, item]) => (
                  <div key={id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong className="text-sm text-foreground">{item.customName}</strong>
                      <button type="button" onClick={() => setSelectedMap(prev => { const next = { ...prev }; delete next[id]; return next })} className="text-sm font-semibold text-red-700 hover:underline">
                        Remove
                      </button>
                    </div>
                    <label className="mt-3 block text-sm text-foreground sm:max-w-40">How many?
                      <input type="number" min="1" max="1000" value={item.quantity} onChange={event => updateAppliance(id, { quantity: Math.max(1, Number(event.target.value) || 1) })} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm"/>
                    </label>
                    <details className="mt-3 border-t border-border pt-2">
                      <summary className="cursor-pointer text-sm font-semibold text-primary">Adjust estimate or usage (optional)</summary>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm text-foreground">Power shown on label (W)
                          <input type="number" min="1" max="100000" value={item.watts ?? item.customWatts ?? ''} onChange={event => updateAppliance(id, { watts: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm"/>
                        </label>
                        <label className="text-sm text-foreground">Hours you expect to use it
                          <input type="number" min="0" max={typicalOutageHours} step="0.25" value={item.operatingHours ?? typicalOutageHours} onChange={event => updateAppliance(id, { operatingHours: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm"/>
                        </label>
                        <label className="text-sm text-foreground">Importance
                          <select value={item.priority ?? 'normal'} onChange={event => updateAppliance(id, { priority: event.target.value as AppliancePriority })} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm">
                            <option value="critical">Essential</option><option value="high">Very important</option><option value="normal">Useful</option><option value="low">Can do without</option>
                          </select>
                        </label>
                        <label className="text-sm text-foreground">Extra power to start (W), if on label
                          <input type="number" min="1" max="100000" value={item.surgeWatts ?? ''} onChange={event => updateAppliance(id, { surgeWatts: event.target.value === '' ? undefined : Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm"/>
                        </label>
                        <label className="sm:col-span-2 flex items-center gap-2 text-sm text-foreground">
                          <input type="checkbox" checked={item.mustRun ?? false} onChange={event => updateAppliance(id, { mustRun: event.target.checked })} className="accent-primary"/>
                          I need this appliance to stay on
                        </label>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </section>
          )}

          <details className="rounded-2xl border border-dashed border-border bg-card/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-primary">Add an appliance that is not listed</summary>
            <p className="mt-2 text-sm text-muted-foreground">You will need its power in watts (W), usually printed on a label. Skip this if you are not sure.</p>
            <form onSubmit={handleAddCustom} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <label className="text-sm text-foreground">Appliance name
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </label>
              <label className="text-sm text-foreground">Power (W)
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={customWatts}
                  onChange={e => setCustomWatts(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </label>
              <button type="submit" className="flex items-center justify-center gap-1 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold transition-colors hover:bg-primary hover:text-black">
                <Plus className="h-4 w-4" /> Add
              </button>
            </form>
          </details>

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
              Choose how to save power <ArrowRight className="w-4 h-4" />
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
                title: "Save power for important appliances",
                desc: "Count appliances marked Essential or Very important. Set an appliance's importance in its optional settings."
              },
              {
                id: 'balanced' as PriorityMode,
                title: "Use everything I selected (recommended)",
                desc: "Estimate power for all the appliances you added."
              },
              {
                id: 'critical_only' as PriorityMode,
                title: "Only power the essentials",
                desc: "Count appliances marked Essential or marked as needing to stay on."
              }
            ].map(mode => (
              <button
                type="button"
                key={mode.id}
                onClick={() => setPriorityMode(mode.id)}
                aria-pressed={priorityMode === mode.id}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  priorityMode === mode.id 
                    ? 'bg-card border-primary ring-2 ring-primary/20 shadow-md' 
                    : 'bg-card/50 border-border hover:border-border/80'
                }`}
              >
                <h3 className="font-bold text-base text-foreground">{mode.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{mode.desc}</p>
              </button>
            ))}
          </div>

          {/* Pre-submission Summary Review */}
          <div className="p-4 rounded-2xl bg-surface border border-border space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Backup system</span>
              <span className="text-foreground">{backupType === 'inverter' ? 'Home inverter or UPS' : backupType === 'solar' ? 'Solar panels with batteries' : backupType === 'generator' ? 'Fuel generator' : 'No fixed system'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Power cut length</span>
              <span className="text-foreground">{typicalOutageHours} {typicalOutageHours === 1 ? 'hour' : 'hours'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Appliances added</span>
              <span className="text-foreground">{Object.keys(selectedMap).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated power</span>
              <span className="text-primary font-bold">{totalLiveWatts} W</span>
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
              See my backup estimate
            </button>
          </div>
        </motion.div>
      )}

    </div>
  )
}
