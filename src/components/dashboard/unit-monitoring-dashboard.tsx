import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  BatteryCharging,
  Bell,
  Check,
  ChevronDown,
  CloudSun,
  Gauge,
  Home,
  MapPin,
  Search,
  SlidersHorizontal,
  Sun,
  Thermometer,
  Zap,
} from 'lucide-react'

interface UnitMonitoringDashboardProps {
  onOpenCalculator: () => void
}

type ActivityItem = {
  id: string
  unit: string
  status: 'healthy' | 'attention'
  time: string
  message: string
  detail?: string
}

const activityItems: ActivityItem[] = [
  {
    id: 'unit-05',
    unit: 'Home Number 05',
    status: 'healthy',
    time: 'Today · 09:20 AM',
    message: 'Peak energy production recorded during the sunlight period.',
    detail: 'Output 5.8 kW  ·  Generation 42.8 kWh',
  },
  {
    id: 'unit-17',
    unit: 'Home Number 17',
    status: 'attention',
    time: 'Today · 09:18 AM',
    message: 'Solar output is below the expected range due to partial shading.',
    detail: 'Suggested check · Inspect panel conditions',
  },
  {
    id: 'unit-09',
    unit: 'Home Number 09',
    status: 'healthy',
    time: 'Today · 09:14 AM',
    message: 'Battery storage reached full capacity and is operating normally.',
    detail: 'Output 5.2 kW  ·  Generation 40.8 kWh',
  },
  {
    id: 'unit-22',
    unit: 'Home Number 22',
    status: 'healthy',
    time: 'Today · 09:08 AM',
    message: 'Strong energy production recorded during the sunlight period.',
    detail: 'Output 5.9 kW  ·  Generation 48.6 kWh',
  },
]

const chartBars = [24, 31, 28, 42, 36, 51, 48, 64, 57, 70, 62, 78, 67, 85, 72, 94, 78]
const efficiencyBars = [24, 32, 30, 44, 40, 55, 50, 66, 61, 76, 70, 86, 77]
const inverterBars = [18, 35, 56, 39, 78, 49, 90, 62, 37, 68, 84, 45, 72, 56, 32, 64, 47]

function MetricCard({
  icon: Icon,
  title,
  children,
  className = '',
}: {
  icon: typeof BatteryCharging
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-[#E8E9E6] bg-white p-4 shadow-[0_2px_10px_rgba(28,35,27,0.025)] ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[#545A54]">
          <Icon className="h-4 w-4 text-[#AA8230]" strokeWidth={1.8} aria-hidden="true" />
          <h3>{title}</h3>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-[#A8ADA6]" aria-hidden="true" />
      </div>
      {children}
    </section>
  )
}

function SampleSiteMap({ sector }: { sector: string }) {
  return (
    <div className="relative h-full min-h-[250px] overflow-hidden rounded-xl border border-[#E8EAE6] bg-[#F5F6F3] sm:min-h-[320px]">
      <div className="absolute inset-0 opacity-50" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(30deg, transparent 49.7%, #e4e7e1 49.8%, #e4e7e1 50.2%, transparent 50.3%), linear-gradient(150deg, transparent 49.7%, #e4e7e1 49.8%, #e4e7e1 50.2%, transparent 50.3%)', backgroundSize: '150px 90px' }} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 760 360" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrative isometric view of a residential microgrid with solar homes">
        <defs>
          <linearGradient id="map-ground" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#FAFBF8" />
            <stop offset="1" stopColor="#E9ECE6" />
          </linearGradient>
          <linearGradient id="solar-roof" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#8199A8" />
            <stop offset="1" stopColor="#526B7A" />
          </linearGradient>
          <filter id="house-shadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#37463D" floodOpacity=".12" />
          </filter>
        </defs>
        <path d="M-30 230 365 16 800 238 400 382Z" fill="url(#map-ground)" />
        <path d="m-12 258 390-211 435 223M52 298l389-210 283 145M125 337l390-211 240 123" stroke="#D9DED7" strokeWidth="2" fill="none" />
        <path d="m-6 152 430 220M95 98l430 220M198 43l430 220M509 0 78 235M633 2 201 238M756 5 324 241" stroke="#E2E6E0" strokeWidth="1.5" fill="none" />
        <path d="m91 184 267-144 111 57-266 146Z" fill="#EEF0EC" stroke="#DDE1DB" />
        <path d="m311 321 307-166 98 50-308 168Z" fill="#EEF0EC" stroke="#DDE1DB" />
        <path d="M209 100 300 51l100 52-92 50Z" fill="#E2E6DF" />
        <path d="m219 98 80-43 82 43-81 44Z" fill="#FDFEFC" stroke="#CBD2CA" strokeWidth="2" />
        <path d="m219 98 81 44v76l-81-45Z" fill="#DDE3DC" stroke="#CBD2CA" />
        <path d="m300 142 81-44v76l-81 44Z" fill="#CBD4CB" stroke="#BBC5BA" />
        <path d="m241 98 57-30 58 30-58 31Z" fill="url(#solar-roof)" />
        <path d="m270 83 58 31m-42-39 57 31m-94-16 58 31" stroke="#BDCFD3" strokeWidth="1.5" opacity=".9" />
        <path d="m411 249 75-41 78 40-77 42Z" fill="#ECEFEA" />
        <path d="m419 246 67-36 68 35-67 37Z" fill="#FCFDFB" stroke="#D1D8D0" strokeWidth="1.5" />
        <path d="m419 246 68 36v55l-68-36Z" fill="#E1E6DF" stroke="#D1D8D0" />
        <path d="m487 282 67-37v55l-67 37Z" fill="#CCD5CC" stroke="#C0C9C0" />
        <path d="m437 245 49-27 49 26-49 27Z" fill="#8DA1A9" />
        <path d="m462 232 49 27m-34-35 49 27" stroke="#D7E1E0" strokeWidth="1.2" />
        <path d="m80 207 61-33 64 33-63 34Z" fill="#EDF0EA" />
        <path d="m89 205 52-28 53 28-53 29Z" fill="#FBFCFA" stroke="#D1D8D0" />
        <path d="m89 205 52 29v43l-52-29Z" fill="#E1E6DF" stroke="#D1D8D0" />
        <path d="m141 234 53-29v43l-53 29Z" fill="#CED6CD" stroke="#C0C9C0" />
        <path d="m103 205 38-21 39 21-39 21Z" fill="#AAB4AE" />
        <path d="M302 218c39 6 56 36 100 47 42 11 68-7 103-14" fill="none" stroke="#D6A845" strokeWidth="3" strokeDasharray="5 7" strokeLinecap="round" />
        <circle cx="302" cy="218" r="6" fill="#D6A845" stroke="white" strokeWidth="3" />
        <g filter="url(#house-shadow)">
          <rect x="469" y="77" width="109" height="39" rx="8" fill="white" stroke="#E2E5E0" />
          <circle cx="484" cy="96" r="4" fill="#45A878" />
          <text x="496" y="93" fill="#38423B" fontSize="11" fontWeight="700">Unit 05</text>
          <text x="496" y="106" fill="#858C84" fontSize="9">Selected home</text>
        </g>
      </svg>
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-white/80 bg-white/90 px-2.5 py-1.5 text-[10px] font-medium text-[#646C64] shadow-sm backdrop-blur-sm">
        <MapPin className="h-3 w-3 text-[#AA8230]" aria-hidden="true" /> {sector}
      </div>
      <div className="absolute bottom-3 right-3 flex gap-1 rounded-lg border border-[#E3E6E1] bg-white/90 p-1 shadow-sm" aria-label="Map controls">
        <button className="h-7 w-7 rounded-md text-sm text-[#646C64] hover:bg-[#F1F3EF]" aria-label="Zoom out">−</button>
        <button className="h-7 w-7 rounded-md text-sm text-[#646C64] hover:bg-[#F1F3EF]" aria-label="Zoom in">+</button>
      </div>
    </div>
  )
}

export function UnitMonitoringDashboard({ onOpenCalculator }: UnitMonitoringDashboardProps) {
  const [selectedSector, setSelectedSector] = useState('Residential Area 01')
  const [searchQuery, setSearchQuery] = useState('')
  const filteredActivity = useMemo(() => activityItems.filter((item) =>
    `${item.unit} ${item.message} ${item.detail ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase()),
  ), [searchQuery])

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-10 pt-4 text-left sm:px-6 lg:px-8 lg:pt-6">
      <header className="mb-5 flex flex-col justify-between gap-4 border-b border-[#E7E9E5] pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.035em] text-[#20251F] sm:text-[26px]">Unit Monitoring</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E7D9B8] bg-[#FBF7EC] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#8F6C25]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C49636]" /> Illustrative demo
            </span>
          </div>
          <p className="mt-1 text-xs text-[#7A8179]">A sample view of residential microgrid performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-[#E5E8E2] bg-white px-3 text-[11px] text-[#767E75]">
            Sector
            <select value={selectedSector} onChange={(event) => setSelectedSector(event.target.value)} className="max-w-[170px] cursor-pointer appearance-none bg-transparent pr-1 font-semibold text-[#30372F] outline-none">
              <option>Residential Area 01</option>
              <option>Residential Area 02</option>
              <option>Industrial Park 04</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </label>
          <button onClick={onOpenCalculator} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#D5AA4B] px-3.5 text-[11px] font-semibold text-[#292316] shadow-sm transition-colors hover:bg-[#C99D3D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AA8230]">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" /> Create backup plan
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12 xl:gap-5">
        <div className="space-y-4 xl:col-span-8">
          <section className="rounded-2xl border border-[#E8E9E6] bg-white p-3.5 shadow-[0_2px_10px_rgba(28,35,27,0.025)] sm:p-4">
            <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4F0E5] text-[#96762F]"><Home className="h-3.5 w-3.5" aria-hidden="true" /></div>
                <div>
                  <h2 className="text-[13px] font-semibold text-[#333A32]">Site overview</h2>
                  <p className="text-[10px] text-[#8B918A]">Residential microgrid · sample visualization</p>
                </div>
              </div>
              <label className="relative block sm:w-[220px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#929990]" aria-hidden="true" />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} type="search" placeholder="Search units or activity" className="h-9 w-full rounded-lg border border-[#E6E9E3] bg-[#FCFCFB] pl-9 pr-3 text-[11px] text-[#30372F] outline-none placeholder:text-[#A0A69E] focus:border-[#C9A24A] focus:ring-2 focus:ring-[#D5AA4B]/15" />
              </label>
            </div>
            <SampleSiteMap sector={selectedSector} />
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-3 text-[10px] text-[#858C84]">
              <span>Showing a representative site layout</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#45A878]" /> System status: normal</span>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            <MetricCard icon={BatteryCharging} title="Battery storage">
              <div className="flex items-end gap-1.5"><span className="text-[28px] font-semibold leading-none tracking-[-0.05em] text-[#252B25]">48</span><span className="pb-0.5 text-[12px] text-[#747C73]">kWh <span className="text-[10px] text-[#9AA097]">/ 60 kWh</span></span></div>
              <div className="mt-1.5 text-[10px] text-[#838A81]">30 hours estimated remaining</div>
              <div className="mt-4"><div className="relative h-2 rounded-full bg-[#F0F1ED]"><div className="h-2 rounded-full bg-[#C7B3E9]" style={{ width: '76%' }} /><span className="absolute -top-6 -translate-x-1/2 rounded-md bg-[#6F5A9D] px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ left: '76%' }}>76%</span></div><div className="mt-1.5 flex justify-between text-[9px] text-[#9AA097]"><span>0</span><span>20</span><span>40</span><span>60 kWh</span></div></div>
            </MetricCard>

            <MetricCard icon={Zap} title="Energy generation">
              <div className="flex items-end gap-1.5"><span className="text-[28px] font-semibold leading-none tracking-[-0.05em] text-[#252B25]">28.64</span><span className="pb-0.5 text-[12px] text-[#747C73]">MWh</span></div>
              <div className="mt-1.5 flex justify-between text-[10px] text-[#838A81]"><span>Sample today</span><span>Average 22 MWh</span></div>
              <div className="mt-3 flex h-12 items-end gap-[3px] border-b border-[#ECEEEA]">{chartBars.map((height, index) => <span key={index} className="flex-1 rounded-t-[2px] bg-[#B9ACE0]" style={{ height: `${height}%` }} />)}</div>
              <div className="mt-1.5 flex justify-between text-[9px] text-[#9AA097]"><span>09:00</span><span>10:00</span><span>11:00</span></div>
            </MetricCard>

            <MetricCard icon={Sun} title="Sunlight captured">
              <div className="text-[12px] font-semibold text-[#343B33]">In operation</div>
              <div className="mt-1 text-[10px] text-[#838A81]">Started at 08:30 AM</div>
              <div className="mt-4 flex h-12 items-end gap-[3px] border-b border-[#ECEEEA]">{chartBars.map((height, index) => <span key={index} className="flex-1 rounded-t-[2px] bg-[#D6B65E]" style={{ height: `${Math.max(16, height - (index % 3) * 8)}%` }} />)}</div>
              <div className="mt-1.5 flex justify-between text-[9px] text-[#9AA097]"><span>08:30</span><span>09:00</span><span>09:30</span></div>
            </MetricCard>

            <MetricCard icon={Activity} title="System efficiency">
              <div className="flex items-center gap-2"><span className="text-[28px] font-semibold leading-none tracking-[-0.05em] text-[#252B25]">83.6<span className="text-base">%</span></span><span className="inline-flex items-center gap-1 rounded-full bg-[#EEF7F0] px-2 py-1 text-[9px] font-semibold text-[#3B8254]"><Check className="h-3 w-3" aria-hidden="true" /> Optimal</span></div>
              <div className="mt-1.5 text-[10px] text-[#838A81]">Sample system performance</div>
              <div className="mt-4 flex h-12 items-end gap-1">{efficiencyBars.map((height, index) => <span key={index} className="flex-1 rounded-t-[2px] bg-[#A9C8AE]" style={{ height: `${height}%` }} />)}</div>
            </MetricCard>

            <MetricCard icon={Gauge} title="Inverter output">
              <div className="flex items-end gap-1.5"><span className="text-[28px] font-semibold leading-none tracking-[-0.05em] text-[#252B25]">5.8</span><span className="pb-0.5 text-[12px] text-[#747C73]">kW</span><span className="pb-1 text-[9px] text-[#929990]">Peak 6.4 kW</span></div>
              <div className="mt-1.5 text-[10px] text-[#838A81]">50.0 Hz · Pure sine wave</div>
              <div className="mt-4 flex h-12 items-center justify-between gap-[3px]">{inverterBars.map((height, index) => <span key={index} className="w-1 rounded-full bg-[#8E8BC6]" style={{ height: `${height}%` }} />)}</div>
            </MetricCard>

            <MetricCard icon={Thermometer} title="Panel temperature">
              <div className="flex items-center gap-2"><span className="text-[28px] font-semibold leading-none tracking-[-0.05em] text-[#252B25]">58<span className="text-base">°C</span></span><span className="inline-flex items-center gap-1 rounded-full bg-[#EEF7F0] px-2 py-1 text-[9px] font-semibold text-[#3B8254]"><Check className="h-3 w-3" aria-hidden="true" /> Optimal</span></div>
              <div className="mt-1.5 text-[10px] text-[#838A81]">Sample operating temperature</div>
              <div className="mt-4 grid grid-cols-12 gap-1">{Array.from({ length: 48 }).map((_, index) => <span key={index} className="h-2.5 rounded-[2px]" style={{ backgroundColor: `rgba(196, 157, 78, ${0.15 + ((index * 17) % 60) / 100})` }} />)}</div>
            </MetricCard>
          </div>
        </div>

        <aside className="space-y-4 xl:col-span-4">
          <section className="rounded-2xl border border-[#E8E9E6] bg-white p-4 shadow-[0_2px_10px_rgba(28,35,27,0.025)]">
            <div className="mb-3 flex items-center justify-between"><div><h2 className="text-[13px] font-semibold text-[#333A32]">Weather today</h2><p className="mt-0.5 text-[10px] text-[#8B918A]">Sample conditions</p></div><CloudSun className="h-4 w-4 text-[#A2A89F]" aria-hidden="true" /></div>
            <div className="flex items-center justify-between"><div className="text-[34px] font-semibold leading-none tracking-[-0.05em] text-[#252B25]">21°<span className="text-xl">C</span></div><div className="flex items-center gap-2 text-right"><Sun className="h-6 w-6 text-[#D9B448]" aria-hidden="true" /><div><div className="text-[12px] font-semibold text-[#353C34]">Sunny day</div><div className="text-[9px] text-[#929990]">10:22 AM · Jan 26</div></div></div></div>
          </section>

          <section className="rounded-2xl border border-[#E8E9E6] bg-white p-4 shadow-[0_2px_10px_rgba(28,35,27,0.025)]">
            <div className="flex items-start justify-between border-b border-[#ECEEEA] pb-3"><div><h2 className="text-[13px] font-semibold text-[#333A32]">Fleet performance</h2><div className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.05em] text-[#252B25]">1,248 <span className="text-[10px] font-normal tracking-normal text-[#8B918A]">systems</span></div></div><button onClick={onOpenCalculator} className="mt-1 text-[10px] font-semibold text-[#8B6C2A] hover:underline">View analytics</button></div>
            <div className="pt-3"><div className="flex h-2 overflow-hidden rounded-full bg-[#F0F1ED]"><div className="bg-[#7DAF88]" style={{ width: '96.5%' }} /><div className="min-w-[6px] bg-[#DAB64B]" style={{ width: '1.9%' }} /><div className="min-w-[5px] bg-[#9BA7AC]" style={{ width: '0.8%' }} /><div className="min-w-[5px] bg-[#D59663]" style={{ width: '0.8%' }} /></div><div className="mt-2 grid grid-cols-4 gap-1 text-center">{[['1,208', 'Healthy', 'text-[#578765]'], ['24', 'Warning', 'text-[#A98224]'], ['8', 'Offline', 'text-[#7C8589]'], ['8', 'Service due', 'text-[#BD7847]']].map(([value, label, color]) => <div key={label}><div className={`text-[11px] font-semibold ${color}`}>{value}</div><div className="mt-0.5 text-[9px] text-[#8B918A]">{label}</div></div>)}</div></div>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#F7F8F5] p-2.5 text-[10px] leading-relaxed text-[#7A8179]"><Bell className="mt-0.5 h-3 w-3 shrink-0 text-[#969D93]" aria-hidden="true" /><span>Illustrative fleet summary. No equipment is connected to this demo.</span></div>

            <div className="mt-4 flex items-center justify-between gap-3"><h3 className="text-[12px] font-semibold text-[#333A32]">Recent activity</h3><span className="text-[9px] text-[#979E95]">Sample feed</span></div>
            <div className="mt-2 divide-y divide-[#ECEEEA]">
              {filteredActivity.map((item) => <article key={item.id} className="py-3 first:pt-2 last:pb-1"><div className="flex items-start justify-between gap-2"><div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#353C34]"><span className={`h-1.5 w-1.5 rounded-full ${item.status === 'healthy' ? 'bg-[#6BA579]' : 'bg-[#D1A941]'}`} />{item.unit}</div><time className="whitespace-nowrap text-[9px] text-[#929990]">{item.time}</time></div><p className="mt-1.5 pl-3 text-[10px] leading-[1.55] text-[#747C73]">{item.message}</p>{item.detail && <p className={`mt-1 pl-3 text-[9px] leading-relaxed ${item.status === 'attention' ? 'text-[#997721]' : 'text-[#858C84]'}`}>{item.detail}</p>}</article>)}
              {filteredActivity.length === 0 && <div className="py-6 text-center text-[11px] text-[#858C84]">No sample activity matches “{searchQuery}”.</div>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
