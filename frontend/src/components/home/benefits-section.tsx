import { Bell, Database, GitBranch } from 'lucide-react'

const cards = [
  {
    title: 'Battery health',
    icon: GitBranch,
    tone: 'bg-[#f0eadf] text-[#171717]',
    accent: 'bg-[#e9d9ff] text-[#5b2ca5]',
    details: [
      { label: 'monitors', value: 'depth of discharge' },
    ],
  },
  {
    title: 'Load protection',
    icon: Database,
    tone: 'bg-[#edf1ff] text-[#171717]',
    accent: 'bg-[#dfe7ff] text-[#3c4ec3]',
    details: [
      { label: 'prioritizes', value: 'essential loads' },
      { label: 'blocks', value: 'high-draw appliances' },
    ],
  },
  {
    title: 'Notifications',
    icon: Bell,
    tone: 'bg-[#fde7e7] text-[#171717]',
    accent: 'bg-[#ffd7d7] text-[#d41717]',
    details: [
      { label: 'alerts', value: 'low reserve / peak draw' },
      { label: 'supports', value: 'critical appliance protection' },
    ],
  },
]

export function BenefitsSection() {
  return (
    <section id="benefits" className="mx-auto max-w-[1600px] bg-black px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1.55fr]">
        <div className="pr-4 lg:pt-6">
          <h2
            className="max-w-[520px] text-[2.3rem] font-semibold leading-[1.04] tracking-[-0.06em] text-white sm:text-[3.1rem] lg:text-[4rem]"
            style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
          >
            Smarter backup planning for real-world power demand
          </h2>

          <p
            className="mt-6 max-w-[520px] text-[1.06rem] leading-[1.8] text-zinc-300"
            style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
          >
            PowerUp helps you model which loads your battery can sustain, when to prioritize essential devices, and how long your system can hold through an outage. It turns backup planning from guesswork into a clear resilience strategy.
          </p>

          <p
            className="mt-5 max-w-[520px] text-[1.06rem] leading-[1.8] text-zinc-300"
            style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
          >
            From Wi‑Fi and refrigeration to workstations and security systems, you can plan around your true energy footprint and protect the equipment that matters most during load shedding.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-[#2b2b2b] bg-[#111111] p-4 shadow-[0_12px_32px_rgba(17,24,39,0.18)] sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),transparent_40%)]" />

          <div className="relative space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {cards.slice(0, 2).map(({ title, icon: Icon, tone, accent, details }) => (
                <div
                  key={title}
                  className="rounded-[22px] border border-[#2b2b2b] bg-[#171717] p-3 shadow-[0_8px_18px_rgba(0,0,0,0.22)]"
                >
                  <div className={`${tone} rounded-[18px] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className="text-[1.02rem] font-medium"
                        style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
                      >
                        {title}
                      </span>
                    </div>
                  </div>

                  <div
                    className="mt-4 rounded-2xl border border-[#2b2b2b] bg-[#1d1d1d] px-3 py-3 text-sm text-[#f3f4f6]"
                    style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
                  >
                    {details.map((item) => (
                      <div key={item.value} className="flex items-center gap-2 text-[0.8rem]">
                        <span className="text-zinc-400">{item.label}</span>
                        <span className="font-mono text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="relative mx-auto h-12 w-full max-w-[510px]">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#d1d5db]" />
              <div className="absolute left-[38%] top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#f3f4f6] bg-[#9ca3af]" />
              <div className="absolute right-[26%] top-1/2 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#f3f4f6] bg-[#9ca3af]" />
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
              <div className="rounded-[22px] border border-[#2b2b2b] bg-[#171717] p-3 shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
                <div
                  className={`${cards[2].tone} rounded-[18px] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${cards[2].accent}`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <span
                      className="text-[1.02rem] font-medium"
                      style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
                    >
                      {cards[2].title}
                    </span>
                  </div>
                </div>

                <div
                  className="mt-4 rounded-2xl border border-[#2b2b2b] bg-[#1d1d1d] px-3 py-3 text-sm text-[#f3f4f6]"
                  style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
                >
                  {cards[2].details.map((item) => (
                    <div key={item.value} className="flex items-center gap-2 text-[0.8rem]">
                      <span className="text-zinc-400">{item.label}</span>
                      <span className="font-mono text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center pt-4">
                <div className="max-w-[420px] pl-2">
                  <h3
                    className="text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.06em] text-white"
                    style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
                  >
                    Flexible backup plans for every home and small business
                  </h3>
                  <p
                    className="mt-4 text-[1.04rem] leading-[1.8] text-zinc-300"
                    style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}
                  >
                    PowerUp adapts to your system design, appliance load profile, and outage duration so you can manage backup power with confidence. Whether you need longer runtime for essential devices or safer cycling for battery health, the system helps you plan intelligently.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
