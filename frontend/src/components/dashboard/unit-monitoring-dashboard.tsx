import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, BatteryCharging, CircleHelp, LoaderCircle, Plus, Search, Sun, Zap } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { supabase } from '@/lib/supabase'
import type { SetupInputs } from '@/lib/calculations'
import { calculateBackupPlan } from '@/lib/calculations'
import { PRESET_APPLIANCES } from '@/lib/appliances-data'
import { getNominalCapacityWh, getTrendPoints, validateManualReading } from '@/lib/monitoring-data'
import { requestAdvisorExplanation } from '@/lib/advisor-client'
import type { AdvisorResponseV1 } from '@/lib/ai-advisor-contract'
import { AiExplanationPanel } from '@/components/dashboard/ai-explanation-panel'

interface Props { onOpenCalculator: () => void; onSignIn: () => void }
interface SavedSystem {
  id: string; user_id: string; plan_name: string; backup_configuration: SetupInputs
  selected_appliances: SetupInputs['selectedAppliances']; updated_at: string
}
interface Reading {
  id: string; system_id: string; user_id: string; recorded_at: string; battery_percentage: number | null
  battery_voltage: number | null; load_watts: number | null; solar_generation_watts: number | null; notes: string | null
}
type PlanExplanation = Extract<AdvisorResponseV1, { action: 'explain' }>
const card = 'rounded-2xl border border-[#E8E9E6] bg-white p-4 shadow-[0_2px_10px_rgba(28,35,27,0.025)]'
const field = 'w-full rounded-lg border border-[#E5E8E2] bg-white px-3 py-2 text-sm text-[#30372F] outline-none focus:border-[#C9A24A] focus:ring-2 focus:ring-[#D5AA4B]/15'

function numberOrDash(value: number | null | undefined, unit = '') { return value === null || value === undefined ? 'Not available' : `${value}${unit}` }
function Trend({ title, unit, readings, getValue }: { title: string; unit: string; readings: Reading[]; getValue: (reading: Reading) => number | null }) {
  const points = getTrendPoints(readings, getValue)
  if (!points.length) return null
  const values = points.map(item => item.value)
  const low = Math.min(...values); const high = Math.max(...values); const spread = high - low || 1
  const coords = values.map((value, index) => `${points.length === 1 ? 50 : 6 + index * 88 / (points.length - 1)},${94 - ((value - low) / spread) * 78}`).join(' ')
  return <section className={`${card} min-w-0`}><h3 className="text-sm font-semibold text-[#333A32]">{title}</h3><p className="mt-1 text-[11px] text-[#858C84]">Manual readings · {unit} · {points.length} point{points.length === 1 ? '' : 's'}</p><svg viewBox="0 0 100 100" className="mt-3 h-32 w-full overflow-visible" role="img" aria-label={`${title} historical trend in ${unit}`}><path d="M5 94H95" stroke="#E8E9E6" strokeWidth="1"/><polyline points={coords} fill="none" stroke="#B88628" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>{values.map((value, index) => <circle key={`${points[index].id}-${index}`} cx={points.length === 1 ? 50 : 6 + index * 88 / (points.length - 1)} cy={94 - ((value - low) / spread) * 78} r="2.8" fill="#B88628"><title>{value} {unit} · {new Date(points[index].recordedAt).toLocaleString()}</title></circle>)}</svg><div className="flex justify-between text-[10px] text-[#929990]"><span>{new Date(points[0].recordedAt).toLocaleDateString()}</span><span>{new Date(points[points.length - 1].recordedAt).toLocaleDateString()}</span></div></section>
}

export function UnitMonitoringDashboard({ onOpenCalculator, onSignIn }: Props) {
  const { user, loading: authLoading, configured } = useAuth()
  const [systems, setSystems] = useState<SavedSystem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [readings, setReadings] = useState<Reading[]>([])
  const [readingsSystemId, setReadingsSystemId] = useState('')
  const [loadingSystems, setLoadingSystems] = useState(true)
  const [loadingReadings, setLoadingReadings] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [batteryPct, setBatteryPct] = useState('')
  const [batteryVoltage, setBatteryVoltage] = useState('')
  const [loadWatts, setLoadWatts] = useState('')
  const [solarWatts, setSolarWatts] = useState('')
  const [recordedAt, setRecordedAt] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')
  const [explanation, setExplanation] = useState<PlanExplanation | null>(null)
  const [explanationSystemId, setExplanationSystemId] = useState('')
  const [explanationStatus, setExplanationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [explanationError, setExplanationError] = useState('')
  const pendingReadingId = useRef<string | null>(null)
  const systemRequestId = useRef(0)
  const readingRequestId = useRef(0)
  const explanationRequestId = useRef(0)
  const activeSystemId = useRef(selectedId)
  const activeUserId = useRef(user?.id)
  activeSystemId.current = selectedId
  activeUserId.current = user?.id

  const loadSystems = useCallback(async () => {
    const requestId = ++systemRequestId.current
    setError('')
    if (authLoading) return
    if (!supabase || !user) { setSystems([]); setSelectedId(''); setReadings([]); setReadingsSystemId(''); setLoadingSystems(false); return }
    setLoadingSystems(true)
    const { data, error: queryError } = await supabase.from('backup_plans').select('id,user_id,plan_name,backup_configuration,selected_appliances,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false })
    if (requestId !== systemRequestId.current || activeUserId.current !== user.id) return
    if (queryError) { setError(queryError.message); setSystems([]) }
    else {
      const records = (data || []) as unknown as SavedSystem[]
      setSystems(records)
      setSelectedId(current => records.some(item => item.id === current) ? current : records[0]?.id ?? '')
    }
    setLoadingSystems(false)
  }, [user, authLoading])

  useEffect(() => { void loadSystems() }, [loadSystems])
  const ownedSystems = systems.filter(item => item.user_id === user?.id)
  const selected = ownedSystems.find(item => item.id === selectedId) ?? null

  const loadReadings = useCallback(async () => {
    const requestId = ++readingRequestId.current
    if (!supabase || !user || !selected) { setReadings([]); setReadingsSystemId(''); setLoadingReadings(false); return }
    const requestedSystemId = selected.id
    setLoadingReadings(true); setReadings([]); setReadingsSystemId(''); setError('')
    const { data, error: queryError } = await supabase.from('system_readings').select('id,system_id,user_id,recorded_at,battery_percentage,battery_voltage,load_watts,solar_generation_watts,notes').eq('system_id', requestedSystemId).eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(200)
    if (requestId !== readingRequestId.current || activeSystemId.current !== requestedSystemId || activeUserId.current !== user.id) return
    if (queryError) { setError(queryError.message); setReadings([]); setReadingsSystemId('') }
    else { setReadings((data || []) as Reading[]); setReadingsSystemId(requestedSystemId) }
    setLoadingReadings(false)
  }, [user, selected?.id])
  useEffect(() => { void loadReadings() }, [loadReadings])

  const inputs = selected?.backup_configuration
  const calculated = useMemo(() => inputs ? calculateBackupPlan(inputs, PRESET_APPLIANCES) : null, [inputs])
  const capacityWh = inputs ? getNominalCapacityWh(inputs) : null
  const selectedReadings = readingsSystemId === selectedId ? readings : []
  const filteredReadings = useMemo(() => selectedReadings.filter(item => `${item.notes ?? ''} ${item.recorded_at} ${item.battery_percentage ?? ''} ${item.battery_voltage ?? ''} ${item.load_watts ?? ''} ${item.solar_generation_watts ?? ''}`.toLowerCase().includes(search.toLowerCase())), [selectedReadings, search])

  const explainSelectedPlan = async () => {
    if (!selected || !inputs || !calculated || !user) return
    const requestId = ++explanationRequestId.current
    const requestedSystemId = selected.id
    const requestedUserId = user.id
    setExplanationSystemId(requestedSystemId)
    setExplanation(null); setExplanationError(''); setExplanationStatus('loading')
    try {
      const response = await requestAdvisorExplanation(inputs, calculated)
      if (requestId !== explanationRequestId.current || activeSystemId.current !== requestedSystemId || activeUserId.current !== requestedUserId) return
      setExplanation(response); setExplanationStatus('ready')
    } catch (cause) {
      if (requestId !== explanationRequestId.current || activeSystemId.current !== requestedSystemId || activeUserId.current !== requestedUserId) return
      setExplanationError(cause instanceof Error ? cause.message : 'The AI explanation is unavailable.')
      setExplanationStatus('error')
    }
  }

  const changeSystem = (systemId: string) => {
    ++readingRequestId.current
    ++explanationRequestId.current
    activeSystemId.current = systemId
    pendingReadingId.current = null
    setSelectedId(systemId); setReadings([]); setReadingsSystemId(''); setLoadingReadings(Boolean(systemId))
    setShowForm(false); setSearch(''); setError(''); setNotice('')
    setBatteryPct(''); setBatteryVoltage(''); setLoadWatts(''); setSolarWatts(''); setNotes('')
    setExplanation(null); setExplanationSystemId(''); setExplanationStatus('idle'); setExplanationError('')
  }

  const saveReading = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !user || !selected || !inputs) return
    const parse = (value: string) => value.trim() === '' ? null : Number(value)
    const values = { battery_percentage: parse(batteryPct), battery_voltage: parse(batteryVoltage), load_watts: parse(loadWatts), solar_generation_watts: parse(solarWatts) }
    const timestamp = new Date(recordedAt)
    const validationError = validateManualReading(inputs, values, timestamp, Date.now())
    if (validationError) { setError(validationError); return }
    if (!pendingReadingId.current) pendingReadingId.current = crypto.randomUUID()
    setSaving(true); setError(''); setNotice('')
    const record = { id: pendingReadingId.current, system_id: selected.id, user_id: user.id, recorded_at: timestamp.toISOString(), ...values, notes: notes.trim() || null }
    const { error: saveError } = await supabase.from('system_readings').upsert(record, { onConflict: 'id', ignoreDuplicates: true })
    if (saveError) setError(saveError.message)
    else {
      pendingReadingId.current = null; setNotice('Manual reading saved.'); setShowForm(false)
      setBatteryPct(''); setBatteryVoltage(''); setLoadWatts(''); setSolarWatts(''); setNotes('')
      setRecordedAt(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16))
      await loadReadings()
    }
    setSaving(false)
  }

  if (authLoading || loadingSystems) return <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-20 text-sm text-[#7A8179]" role="status"><LoaderCircle className="h-4 w-4 animate-spin" />Loading your saved systems…</div>

  return <main className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6">
    <header className="mb-6 flex flex-col justify-between gap-4 border-b border-[#E7E9E5] pb-5 sm:flex-row sm:items-end"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#B88628]">Your saved system data</p><h1 className="text-2xl font-semibold tracking-tight text-[#20251F]">Monitoring</h1><p className="mt-1 max-w-2xl text-sm text-[#7A8179]">Configuration comes from your saved backup plan. Readings are entered manually; no equipment is connected.</p></div>{user && ownedSystems.length > 0 && <div className="flex flex-wrap gap-2"><button onClick={onOpenCalculator} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#E5E8E2] px-3 text-sm font-semibold text-[#545A54] hover:border-[#C9A24A]"><Plus className="h-4 w-4" />Add system</button><button onClick={() => { if (showForm) pendingReadingId.current = null; setShowForm(value => !value); setError(''); setNotice('') }} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#D5AA4B] px-4 text-sm font-semibold text-[#292316] hover:bg-[#C99D3D]"><Plus className="h-4 w-4" />Add reading</button></div>}</header>
    {!configured && <div className={`${card} mb-5 text-sm text-[#7A5818]`}>Connect Supabase to sign in and load private saved systems.</div>}
    {!user && configured && <div className={`${card} mx-auto max-w-xl py-10 text-center`}><BatteryCharging className="mx-auto h-8 w-8 text-[#AA8230]"/><h2 className="mt-3 text-lg font-semibold text-[#30372F]">Sign in to monitor your systems</h2><p className="mt-2 text-sm text-[#7A8179]">Monitoring only displays systems saved to your account.</p><button onClick={onSignIn} className="mt-5 rounded-lg bg-[#D5AA4B] px-4 py-2 text-sm font-semibold text-[#292316]">Sign in</button></div>}
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {user && ownedSystems.length === 0 && !error && <div className={`${card} mx-auto max-w-xl border-dashed py-12 text-center`}><BatteryCharging className="mx-auto h-9 w-9 text-[#AA8230]"/><h2 className="mt-3 text-xl font-semibold text-[#30372F]">No saved backup systems yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-[#7A8179]">Create a backup plan, then save it from the results page. Monitoring will use that saved plan as your system record.</p><button onClick={onOpenCalculator} className="mt-5 rounded-lg bg-[#D5AA4B] px-4 py-2.5 text-sm font-semibold text-[#292316]">Create backup plan</button></div>}
    {user && ownedSystems.length > 0 && <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-sm font-semibold text-[#545A54]">System<select value={selectedId} onChange={event => changeSystem(event.target.value)} disabled={saving} className={`${field} max-w-md`} aria-label="Select saved system">{ownedSystems.map(item => <option key={item.id} value={item.id}>{item.plan_name}</option>)}</select></label><p className="text-xs text-[#858C84]">Updated {selected ? new Date(selected.updated_at).toLocaleString() : '—'}</p></div>
      {selected && inputs && <>
        <section className={`${card} mb-4`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold text-[#30372F]">{selected.plan_name}</h2><span className="rounded-full border border-[#E7D9B8] bg-[#FBF7EC] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#8F6C25]">{inputs.backupType}</span></div><p className="mt-1 text-xs text-[#858C84]">System configuration from your saved backup plan · estimates are calculated from saved specifications</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F8F5] px-2.5 py-1 text-[10px] text-[#646C64]"><CircleHelp className="h-3 w-3"/>Manual readings only</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><InfoCard icon={BatteryCharging} title="Battery capacity" value={capacityWh === null ? 'Not available' : `${(capacityWh / 1000).toFixed(2)} kWh nominal`} detail={inputs.hasBattery ? `${inputs.batteryChemistry.replace('_', ' ')} · ${inputs.voltage || '—'} V · ${inputs.ampHours || '—'} Ah` : 'No battery configured'}/><InfoCard icon={Zap} title="Inverter" value={inputs.inverterRatingWatts === null ? inputs.inverterRatingVA ? `${inputs.inverterRatingVA} VA` : 'Not available' : `${inputs.inverterRatingWatts} W`} detail={inputs.inverterSurgeWatts ? `Surge rating ${inputs.inverterSurgeWatts} W` : 'Surge rating not provided'}/><InfoCard icon={Activity} title="Calculated load" value={calculated ? `${calculated.totalConnectedLoadWatts} W` : 'Not available'} detail={calculated ? `${inputs.selectedAppliances.length} appliances · ${calculated.estimatedEnergyWh} Wh estimated energy` : 'Calculated from saved appliances'}/><InfoCard icon={Sun} title="Solar configuration" value={inputs.backupType === 'solar' ? inputs.solarPanelCount && inputs.solarPanelWatts ? `${inputs.solarPanelCount} × ${inputs.solarPanelWatts} W` : 'Solar backup selected' : 'Not applicable'} detail={inputs.backupType === 'solar' ? inputs.solarPanelCount && inputs.solarPanelWatts ? `${inputs.solarPanelCount * inputs.solarPanelWatts} W nameplate capacity; no generation forecast` : 'Panel specifications not provided' : 'No solar system selected'}/></div>
          <div className="mt-4 rounded-xl bg-[#F7F8F5] p-3"><div className="text-xs font-semibold text-[#545A54]">Connected appliances</div>{inputs.selectedAppliances.length ? <ul className="mt-2 grid gap-1 text-xs text-[#737A72] sm:grid-cols-2">{inputs.selectedAppliances.map((item, index) => { const preset = PRESET_APPLIANCES.find(appliance => appliance.id === item.applianceId); const watts = item.watts ?? item.customWatts ?? preset?.wattage; return <li key={`${item.applianceId}-${index}`}>{item.customName || preset?.name || item.applianceId} × {item.quantity}{watts !== undefined ? ` · ${watts} W each${item.watts == null && item.customWatts == null ? ' (preset)' : ''}` : ' · wattage unknown'}</li> })}</ul> : <p className="mt-1 text-xs text-[#858C84]">No appliances saved.</p>}</div>
        </section>
        {calculated && <div className="mb-4"><AiExplanationPanel context="monitoring" results={calculated} explanation={explanationSystemId === selected.id ? explanation : null} status={explanationSystemId === selected.id ? explanationStatus : 'idle'} error={explanationSystemId === selected.id ? explanationError : ''} onRequest={() => { void explainSelectedPlan() }}/></div>}
        {showForm && <form onSubmit={saveReading} className={`${card} mb-4`}><h2 className="text-base font-semibold text-[#30372F]">Add manual reading</h2><p className="mt-1 text-xs text-[#858C84]">Enter only measurements you observed. Blank fields stay unknown.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-medium text-[#545A54]">Recorded at<input className={`${field} mt-1`} type="datetime-local" value={recordedAt} required onChange={event => setRecordedAt(event.target.value)}/></label>{inputs.hasBattery && <><label className="text-xs font-medium text-[#545A54]">Battery charge (%)<input className={`${field} mt-1`} type="number" min="0" max="100" step="0.1" value={batteryPct} onChange={event => setBatteryPct(event.target.value)} placeholder="Optional"/></label><label className="text-xs font-medium text-[#545A54]">Battery voltage (V)<input className={`${field} mt-1`} type="number" min="0.01" max="1000" step="0.01" value={batteryVoltage} onChange={event => setBatteryVoltage(event.target.value)} placeholder="Optional"/></label></>}
          <label className="text-xs font-medium text-[#545A54]">Current load (W)<input className={`${field} mt-1`} type="number" min="0" max="1000000" step="1" value={loadWatts} onChange={event => setLoadWatts(event.target.value)} placeholder="Optional"/></label>{inputs.backupType === 'solar' && <label className="text-xs font-medium text-[#545A54]">Solar generation (W)<input className={`${field} mt-1`} type="number" min="0" max="1000000" step="1" value={solarWatts} onChange={event => setSolarWatts(event.target.value)} placeholder="Optional"/></label>}<label className="text-xs font-medium text-[#545A54] sm:col-span-2">Notes<textarea className={`${field} mt-1`} rows={2} maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Optional measurement context"/></label></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { pendingReadingId.current = null; setShowForm(false) }} className="rounded-lg border border-[#E5E8E2] px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#D5AA4B] px-4 py-2 text-sm font-semibold text-[#292316] disabled:opacity-60">{saving && <LoaderCircle className="h-4 w-4 animate-spin"/>}Save reading</button></div></form>}
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{inputs.hasBattery && <><Trend title="Battery charge" unit="%" readings={selectedReadings} getValue={item => item.battery_percentage}/><Trend title="Battery voltage" unit="V" readings={selectedReadings} getValue={item => item.battery_voltage}/></>}<Trend title="Measured load" unit="W" readings={selectedReadings} getValue={item => item.load_watts}/>{inputs.backupType === 'solar' && <Trend title="Solar generation" unit="W" readings={selectedReadings} getValue={item => item.solar_generation_watts}/>}</div>
        <section className={card}><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#333A32]">Reading history</h2><p className="mt-0.5 text-[11px] text-[#858C84]">Latest {selectedReadings.length} manual reading{selectedReadings.length === 1 ? '' : 's'} · last recorded {selectedReadings[0] ? new Date(selectedReadings[0].recorded_at).toLocaleString() : 'No readings available yet'}</p></div><label className="relative block sm:w-56"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#929990]"/><input className={`${field} pl-9`} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search readings" aria-label="Search readings and notes"/></label></div>{loadingReadings ? <div role="status" className="py-8 text-center text-sm text-[#7A8179]">Loading readings…</div> : filteredReadings.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="text-[#858C84]"><tr><th className="pb-2 font-medium">Recorded at</th><th className="pb-2 font-medium">Battery</th><th className="pb-2 font-medium">Voltage</th><th className="pb-2 font-medium">Load</th>{inputs.backupType === 'solar' && <th className="pb-2 font-medium">Solar</th>}<th className="pb-2 font-medium">Notes</th></tr></thead><tbody className="divide-y divide-[#ECEEEA]">{filteredReadings.map(item => <tr key={item.id}><td className="py-2.5 text-[#454C44]">{new Date(item.recorded_at).toLocaleString()}</td><td className="py-2.5">{numberOrDash(item.battery_percentage, '%')}</td><td className="py-2.5">{numberOrDash(item.battery_voltage, ' V')}</td><td className="py-2.5">{numberOrDash(item.load_watts, ' W')}</td>{inputs.backupType === 'solar' && <td className="py-2.5">{numberOrDash(item.solar_generation_watts, ' W')}</td>}<td className="max-w-xs truncate py-2.5">{item.notes || '—'}</td></tr>)}</tbody></table></div> : <div className="py-8 text-center text-sm text-[#858C84]">{selectedReadings.length ? `No readings match “${search}”.` : 'No readings available yet. Add a manual reading when you have an observed measurement.'}</div>}</section>
      </>}
    </>}
  </main>
}

function InfoCard({ icon: Icon, title, value, detail }: { icon: typeof BatteryCharging; title: string; value: string; detail: string }) { return <div className="rounded-xl border border-[#ECEEEA] bg-[#FCFCFB] p-3"><div className="flex items-center gap-2 text-[11px] font-semibold text-[#545A54]"><Icon className="h-3.5 w-3.5 text-[#AA8230]"/>{title}</div><div className="mt-2 text-base font-semibold text-[#30372F]">{value}</div><div className="mt-1 text-[10px] text-[#858C84]">{detail}</div></div> }
