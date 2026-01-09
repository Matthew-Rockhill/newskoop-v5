interface Stat {
  name: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
}

interface StatsCardProps {
  stats: Stat[];
  className?: string;
}

function classNames(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function StatsCard({ stats, className = '' }: StatsCardProps) {
  return (
    <dl className={classNames(
      'mx-auto grid grid-cols-1 gap-px bg-zinc-900/5 sm:grid-cols-2 lg:grid-cols-4 shadow-lg rounded-lg overflow-hidden',
      className
    )}>
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 bg-white px-4 py-10 sm:px-6 xl:px-8"
        >
          <dt className="text-sm/6 font-medium text-zinc-500">{stat.name}</dt>
          {stat.change && (
            <dd
              className={classNames(
                stat.changeType === 'negative' ? 'text-rose-600' : 
                stat.changeType === 'positive' ? 'text-emerald-600' : 'text-zinc-700',
                'text-xs font-medium',
              )}
            >
              {stat.change}
            </dd>
          )}
          <dd className="w-full flex-none text-3xl/10 font-semibold tracking-tight text-zinc-900">
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </dd>
          {stat.description && (
            <dd className="w-full text-xs text-zinc-500 mt-1">{stat.description}</dd>
          )}
        </div>
      ))}
    </dl>
  );
} 