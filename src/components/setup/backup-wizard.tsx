import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, Sun, Fuel, AlertTriangle, ArrowRight, ArrowLeft, 
  Plus, Minus, Sparkles, Check, Info
} from 'lucide-react'
import { SetupInputs, BackupType, BatteryChemistry, PriorityMode } from '@/lib/calculations'
import { PRESET_APPLIANCES } from '@/lib/appliances-data'

interface BackupWizardProps {
  initialInputs?: SetupInputs | null
  onSubmit: (inputs: SetupInputs) => void
  onCancel: () => void
}

export function BackupWizard({ initialInputs, onSubmit, onCancel }: BackupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)

  // Form State
  const [backupType, setBackupType] = useState<BackupType>(initialInputs?.backupType || 'inverter')
  const [batteryChemistry, setBatteryChemistry] = useState<BatteryChemistry>(initialInputs?.batteryChemistry || 'lifepo4')
  const [voltage, setVoltage] = useState<number>(initialInputs?.voltage || 48)
  const [ampHours, setAmpHours] = useState<number>(initialInputs?.ampHours || 100)
  const [directKwh, setDirectKwh] = useState<number | null>(initialInputs?.directKwh || null)
  const [useDirectKwh, setUseDirectKwh] = useState<boolean>(initialInputs?.directKwh ? true : false)
  const [isCapacityUnknown, setIsCapacityUnknown] = useState<boolean>(initialInputs?.isCapacityUnknown || false)
  const [inverterRatingWatts, setInverterRatingWatts] = useState<number | null>(initialInputs ? initialInputs.inverterRatingWatts : 2000)
  const [inverterSurgeWatts, setInverterSurgeWatts] = useState<number | null>(initialInputs?.inverterSurgeWatts ?? null)
  const [typicalOutageHours, setTypicalOutageHours] = useState<number>(initialInputs?.typicalOutageHours || 4)
  const [priorityMode, setPriorityMode] = useState<PriorityMode>(initialInputs?.priorityMode || 'balanced')

  // Selected appliances map
  const [selectedMap, setSelectedMap] = useState<Record<string, { quantity: number; customWatts?: number; customName?: string }>>(() => {
    if (initialInputs?.selectedAppliances?.length) {
      const map: Record<string, { quantity: number; customWatts?: number; customName?: string }> = {}
      initialInputs.selectedAppliances.forEach(item => {
        map[item.applianceId] = {
          quantity: item.quantity,
          customWatts: item.customWatts,
          customName: item.customName
        }
      })
      return map
    }
    // Default selected appliances
    const defaultMap: Record<string, { quantity: number }> = {}
    PRESET_APPLIANCES.filter(a => a.defaultSelected).forEach(a => {
      defaultMap[a.id] = { quantity: 1 }
    })
    return defaultMap
  })

  // Custom appliance inputs
  const [customName, setCustomName] = useState('')
  const [customWatts, setCustomWatts] = useState('')

  // Category filter for appliances
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const toggleAppliance = (id: string) => {
    setSelectedMap(prev => {
      const next = { ...prev }
      if (next[id]) {
        delete next[id]
      } else {
        next[id] = { quantity: 1 }
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

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customName.trim() || !customWatts) return
    const id = `custom-${Date.now()}`
    const w = parseInt(customWatts, 10) || 50
    setSelectedMap(prev => ({
      ...prev,
      [id]: { quantity: 1, customName: customName.trim(), customWatts: w }
    }))
    setCustomName('')
    setCustomWatts('')
  }

  const handleFinalSubmit = () => {
    const applianceList = Object.entries(selectedMap).map(([id, val]) => ({
      applianceId: id,
      quantity: val.quantity,
      customName: val.customName,
      customWatts: val.customWatts
    }))

    const payload: SetupInputs = {
      backupType,
      hasBattery: backupType !== 'none',
      batteryChemistry,
      voltage,
      ampHours,
      directKwh: useDirectKwh ? directKwh : null,
      isCapacityUnknown,
      inverterRatingWatts,
      inverterRatingVA: inverterRatingWatts === null ? initialInputs?.inverterRatingVA ?? null : null,
      inverterSurgeWatts,
      typicalOutageHours,
      selectedAppliances: applianceList,
      priorityMode
    }

    onSubmit(payload)
  }

  // Calculate live instant wattage for user feedback
  const totalLiveWatts = Object.entries(selectedMap).reduce((sum, [id, val]) => {
    const preset = PRESET_APPLIANCES.find(a => a.id === id)
    const watts = val.customWatts || preset?.wattage || 0
    return sum + (watts * val.quantity)
  }, 0)

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
          {currentStep === 2 && "Input your battery details if known. Don't worry if you don't know—we have safe fallbacks."}
          {currentStep === 3 && "Choose which appliances you need running during the outage to calculate live load."}
          {currentStep === 4 && "Choose whether you prioritize maximum duration or balanced household comfort."}
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
                  onClick={() => setBackupType(item.id)}
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
              
              {/* Unknown Specs Toggle */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Do you know your battery capacity?</h4>
                  <p className="text-xs text-muted-foreground">You can continue even if technical numbers are unknown.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCapacityUnknown(!isCapacityUnknown)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isCapacityUnknown 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                      : 'bg-surface border-border text-foreground hover:bg-foreground/5'
                  }`}
                >
                  {isCapacityUnknown ? "Specs Unknown (Safe Mode)" : "I Know My Specs"}
                </button>
              </div>

              {!isCapacityUnknown ? (
                <>
                  {/* Chemistry Selector */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      Battery Chemistry (Determines Safe Depth of Discharge)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'lifepo4' as BatteryChemistry, name: "Lithium LiFePO4", dod: "90% Safe DoD", desc: "Long life, high efficiency" },
                        { id: 'lead_acid' as BatteryChemistry, name: "Tubular Lead-Acid", dod: "50% Safe DoD", desc: "Standard deep-cycle tall tubular" },
                        { id: 'agm' as BatteryChemistry, name: "AGM / Gel VRLA", dod: "65% Safe DoD", desc: "Sealed maintenance-free" }
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
                          <label className="block text-xs text-muted-foreground mb-1">System Voltage</label>
                          <select
                            value={voltage}
                            onChange={e => setVoltage(parseInt(e.target.value, 10))}
                            className="w-full bg-surface border border-border rounded-xl p-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                          >
                            <option value={12}>12 Volts (1 battery)</option>
                            <option value={24}>24 Volts (2 batteries in series)</option>
                            <option value={48}>48 Volts (4 batteries / 48V bank)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">Total Amp-Hours (Ah)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={20}
                              max={1000}
                              value={ampHours}
                              onChange={e => setAmpHours(Math.max(10, parseInt(e.target.value, 10) || 0))}
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
                            min="0.5"
                            max="50"
                            value={directKwh || 2.4}
                            onChange={e => setDirectKwh(parseFloat(e.target.value) || 1.0)}
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
                        {useDirectKwh ? `${Math.round((directKwh || 2.4) * 1000)} Wh` : `${voltage * ampHours} Wh`}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Safe Fallback Activated</strong>
                    We will organize appliances by priority and duty-cycling without displaying unconfirmed runtime numbers until you inspect your battery label.
                  </div>
                </div>
              )}

              {/* Inverter Continuous Rating */}
              <div className="pt-2 border-t border-border">
                <label className="block text-xs text-muted-foreground mb-1">
                  Inverter Continuous Capacity (VA / Watts)
                </label>
                <select
                  value={inverterRatingWatts ?? ''}
                  onChange={e => setInverterRatingWatts(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full sm:max-w-xs bg-surface border border-border rounded-xl p-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Unknown / not provided</option>
                  <option value={1000}>1,000 Watts (1 kVA)</option>
                  <option value={1500}>1,500 Watts (1.5 kVA)</option>
                  <option value={2000}>2,000 Watts (2 kVA)</option>
                  <option value={3000}>3,000 Watts (3 kVA)</option>
                  <option value={5000}>5,000 Watts (5 kVA)</option>
                </select>
                <label className="mt-3 block text-xs text-muted-foreground">Inverter surge capacity (optional, watts)
                  <input type="number" min={1} max={100000} placeholder="Check the inverter label" value={inverterSurgeWatts ?? ''} onChange={e => setInverterSurgeWatts(e.target.value ? parseInt(e.target.value, 10) : null)} className="mt-1.5 w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-none sm:max-w-xs" />
                </label>
              </div>

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
              max={12}
              step={1}
              value={typicalOutageHours}
              onChange={e => setTypicalOutageHours(parseInt(e.target.value, 10))}
              className="w-full accent-primary h-2 bg-surface rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>1 Hour</span>
              <span>4 Hours (Standard)</span>
              <span>8 Hours</span>
              <span>12+ Hours (Severe)</span>
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
              <span className="text-xs text-muted-foreground uppercase font-mono">Continuous Active Load</span>
              <div className="text-2xl font-extrabold text-foreground font-mono flex items-center gap-2">
                <span>{totalLiveWatts} Watts</span>
                {inverterRatingWatts !== null && totalLiveWatts > (inverterRatingWatts * 0.85) && (
                  <span className="text-xs font-sans font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    High Inverter Load
                  </span>
                )}
              </div>
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
                const count = selectedMap[appliance.id]?.quantity || 1

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
                          {appliance.wattage}W
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
                        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => changeQuantity(appliance.id, -1)}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-card text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-bold px-1">{count}</span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(appliance.id, 1)}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-card text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

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
          </div>

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
                desc: "Sacrifices non-essential comfort to stretch battery hours as long as possible. Aggressively duty-cycles refrigerators and shuts down idle electronics.",
                tag: "High Resilience"
              },
              {
                id: 'balanced' as PriorityMode,
                title: "Balanced Household Comfort (Recommended)",
                desc: "Balances continuous Wi-Fi and fans with intermittent refrigeration cycles. Best for family load-shedding survival.",
                tag: "Most Popular"
              },
              {
                id: 'critical_only' as PriorityMode,
                title: "Critical Infrastructure Only",
                desc: "Powers solely communications (Wi-Fi), medical equipment, and basic emergency illumination. Completely isolates high loads.",
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
              Generate AI Backup Plan
            </button>
          </div>
        </motion.div>
      )}

    </div>
  )
}
