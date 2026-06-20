import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: number | string
  icon: LucideIcon
  color?: 'amber' | 'green' | 'blue' | 'purple'
  suffix?: string
}

const COLOR = {
  amber: 'bg-amber-500/10 text-amber-400',
  green: 'bg-emerald-500/10 text-emerald-400',
  blue: 'bg-blue-500/10 text-blue-400',
  purple: 'bg-purple-500/10 text-purple-400',
}

export default function StatCard({ label, value, icon: Icon, color = 'amber', suffix }: Props) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${COLOR[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="text-white text-2xl font-bold mt-0.5">
          {value}
          {suffix && <span className="text-slate-400 text-sm font-normal ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  )
}
