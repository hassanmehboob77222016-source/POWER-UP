import { motion } from 'framer-motion'
import {
  BatteryCharging,
  Gauge,
  Lightbulb,
  ArrowDownRight,
  ArrowUpRight,
  Zap,
  Check,
  PlugZap,
  Activity,
} from 'lucide-react'

const benefits = [
  {
    number: '01',
    title: 'Know your usable energy.',
    description:
      'Your battery has a rated capacity, but not all of that energy reaches your appliances. Account for discharge limits and inverter efficiency.',
    icon: BatteryCharging,
    metric: '4.59 kWh',
    metricLabel: 'Estimated usable energy',
  },
  {
    number: '02',
    title: 'Know what your inverter can handle.',
    description:
      'Add up your appliance wattages and compare the combined demand with your inverter rating before deciding what to run.',
    icon: Zap,
    metric: '550 W',
    metricLabel: 'Combined appliance load',
  },
  {
    number: '03',
    title: 'Make your power last longer.',
    description:
      'Compare your full appliance load with essential appliances only to understand how your choices affect estimated runtime.',
    icon: Gauge,
    metric: '20.0 h',
    metricLabel: 'Essentials-only estimate',
  },
]

const appliances = [
  { name: 'Wi-Fi router', watts: 20, essential: true },
  { name: 'LED lights', watts: 40, essential: true },
  { name: 'Laptop', watts: 100, essential: true },
  { name: 'Television', watts: 120, essential: false },
  { name: 'Other appliances', watts: 270, essential: false },
]

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: 'easeOut' as const },
  },
}

export function BenefitsSection() {
  return (
    <section
      id="benefits"
      className="relative isolate overflow-hidden bg-[#111111] px-4 py-24 text-white sm:px-6 sm:py-32 lg:px-8"
    >
      {/* Background atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-[-10%] top-0 h-[450px] w-[450px] rounded-full bg-[#E5A93C]/[0.07] blur-[120px]" />
        <div className="absolute bottom-0 right-[-8%] h-[400px] w-[400px] rounded-full bg-[#E5A93C]/[0.05] blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* Section introduction */}
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="mb-16 grid gap-8 lg:grid-cols-[1fr_0.65fr] lg:items-end"
        >
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E5A93C]/25 bg-[#E5A93C]/[0.08] px-3 py-1.5">
              <Activity className="h-3.5 w-3.5 text-[#E5A93C]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E5A93C]">
                Power, made predictable
              </span>
            </div>

            <h2 className="max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
              Every watt counts.
              <span className="mt-2 block text-[#E5A93C]">
                Make yours last.
              </span>
            </h2>
          </div>

          <p className="max-w-lg text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8 lg:pb-2">
            When the power goes out, guessing is not a plan. Understand your
            energy limits, see what your appliances demand, and make informed
            decisions about the power you have available.
          </p>
        </motion.div>

        {/* Three distinctive benefit panels */}
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon

            return (
              <motion.article
                key={benefit.number}
                variants={reveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.12 }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#191919] p-6 transition-colors duration-300 hover:border-[#E5A93C]/40 hover:bg-[#1D1C19] sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5A93C]/20 bg-[#E5A93C]/[0.09] text-[#E5A93C] transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>

                  <span className="font-mono text-xs text-zinc-600">
                    /{benefit.number}
                  </span>
                </div>

                <h3 className="mt-8 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {benefit.title}
                </h3>

                <p className="mt-3 min-h-[96px] text-sm leading-6 text-zinc-400">
                  {benefit.description}
                </p>

                <div className="mt-7 border-t border-white/[0.08] pt-5">
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.25 + index * 0.12 }}
                    className="text-3xl font-semibold tracking-[-0.05em] text-[#E5A93C]"
                  >
                    {benefit.metric}
                  </motion.p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {benefit.metricLabel}
                  </p>
                </div>

                <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-[#E5A93C]/[0.04] blur-2xl transition-colors group-hover:bg-[#E5A93C]/[0.1]" />
              </motion.article>
            )
          })}
        </div>

        {/* Interactive-feeling energy breakdown */}
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-20 overflow-hidden rounded-[30px] border border-white/[0.1] bg-[#181818]"
        >
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            {/* Left: Battery visualization */}
            <div className="relative overflow-hidden border-b border-white/[0.08] p-6 sm:p-10 lg:border-b-0 lg:border-r">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#E5A93C]/[0.07] blur-[80px]" />

              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  A closer look at your backup
                </p>

                <h3 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-0.055em] sm:text-4xl">
                  From battery capacity to usable power.
                </h3>

                <p className="mt-4 max-w-md text-sm leading-6 text-zinc-400">
                  Example system: a 6 kWh LiFePO4 battery, a 90% discharge
                  limit, and 85% inverter efficiency.
                </p>

                {/* Battery graphic */}
                <div className="mt-10 rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-500">Rated capacity</p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight">
                        6.00{' '}
                        <span className="text-sm font-medium text-zinc-500">
                          kWh
                        </span>
                      </p>
                    </div>

                    <BatteryCharging className="h-7 w-7 text-[#E5A93C]" />
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="text-zinc-400">
                        After discharge limit
                      </span>
                      <span className="text-white">5.40 kWh</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: '90%' }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 1,
                          delay: 0.2,
                          ease: 'easeOut',
                        }}
                        className="h-full rounded-full bg-[#E5A93C]"
                      />
                    </div>
                  </div>

                  <div className="my-5 flex items-center gap-3 text-xs text-zinc-500">
                    <ArrowDownRight className="h-4 w-4 text-[#E5A93C]" />
                    <span>Account for inverter losses</span>
                  </div>

                  <div className="rounded-xl border border-[#E5A93C]/25 bg-[#E5A93C]/[0.07] p-4">
                    <p className="text-xs text-zinc-400">
                      Estimated usable energy
                    </p>

                    <div className="mt-1 flex items-end justify-between gap-3">
                      <p className="text-4xl font-semibold tracking-[-0.06em] text-[#E5A93C]">
                        4.59
                        <span className="ml-1 text-base font-medium">kWh</span>
                      </p>

                      <span className="pb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                        Estimated
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  Illustrative example. Actual usable energy depends on battery
                  characteristics, system condition, and operating conditions.
                </p>
              </div>
            </div>

            {/* Right: Appliance load breakdown */}
            <div className="p-6 sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    See where your power goes
                  </p>

                  <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Build your appliance list.
                  </h3>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#E5A93C]" />
                  <span className="text-[10px] text-zinc-400">
                    Sample load
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Every appliance adds to your total demand. Separating essential
                loads from optional ones helps you compare different backup
                scenarios.
              </p>

              <div className="mt-8 space-y-5">
                {appliances.map((appliance, index) => (
                  <motion.div
                    key={appliance.name}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.45,
                      delay: index * 0.1,
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            appliance.essential
                              ? 'bg-[#E5A93C]/10 text-[#E5A93C]'
                              : 'bg-white/[0.06] text-zinc-400'
                          }`}
                        >
                          {appliance.essential ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <PlugZap className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-200">
                            {appliance.name}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {appliance.essential
                              ? 'Essential load'
                              : 'Additional load'}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 font-mono text-sm text-white">
                        {appliance.watts} W
                      </span>
                    </div>

                    <div className="ml-11 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{
                          width: `${(appliance.watts / 550) * 100}%`,
                        }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.8,
                          delay: 0.2 + index * 0.1,
                          ease: 'easeOut',
                        }}
                        className={`h-full rounded-full ${
                          appliance.essential
                            ? 'bg-[#E5A93C]'
                            : 'bg-zinc-500'
                        }`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-[#111111] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Essential load
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[#E5A93C]">
                    230 W
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[#111111] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Total load
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    550 W
                  </p>
                </div>
              </div>

              {/* Runtime comparison */}
              <div className="mt-4 rounded-2xl border border-[#E5A93C]/20 bg-[#E5A93C]/[0.05] p-5">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-[#E5A93C]" />
                  <p className="text-xs font-semibold text-zinc-200">
                    One battery. Two scenarios.
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-400">All selected appliances</span>
                      <span className="font-medium text-white">8.35 h</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: '41.8%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="h-full rounded-full bg-zinc-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-400">Essentials only</span>
                      <span className="font-medium text-[#E5A93C]">19.96 h</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: '100%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.35 }}
                        className="h-full rounded-full bg-[#E5A93C]"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-2 border-t border-white/[0.08] pt-4">
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#E5A93C]" />
                  <p className="text-xs leading-5 text-zinc-400">
                    In this example, prioritizing essentials increases the
                    estimated continuous runtime from about 8.35 to 19.96 hours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Closing statement */}
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-16 flex flex-col justify-between gap-6 border-t border-white/[0.1] pt-8 sm:flex-row sm:items-center"
        >
          <div>
            <p className="text-xl font-medium tracking-tight text-white sm:text-2xl">
              Less guesswork. Better backup decisions.
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
              Use your battery specifications and appliance requirements to
              make a more informed backup-power plan.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#E5A93C]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E5A93C]" />
            Plan with purpose
          </div>
        </motion.div>
      </div>
    </section>
  )
}
