import UserMenu from '../../features/auth/UserMenu';
import { useClock } from '../../shared/hooks/useClock';
import Breadcrumb, { BreadcrumbItem } from '../../shared/ui/Breadcrumb';
import StatChip from '../../shared/ui/StatChip';

interface HeaderStat {
  value: string;
  label: string;
  tone?: string;
}

interface AppHeaderProps {
  brand?: string;
  crumbs?: BreadcrumbItem[];
  shiftLabel?: string;
  notificationsCount?: number;
  userInitials?: string;
  stats?: HeaderStat[];
}

const defaultCrumbs: BreadcrumbItem[] = [
  { label: 'Город N' },
  { label: 'Южный узел' },
  { label: 'К-142', emphasized: true },
  { label: 'пикет 24+350' },
];

const defaultStats: HeaderStat[] = [
  { value: '2', label: 'критических', tone: 'crit' },
  { value: '3', label: 'новых прогнозов', tone: 'pred' },
  { value: '7', label: 'в работе' },
  { value: '148', label: 'сенсоров онлайн', tone: 'live' },
  { value: '1', label: 'просроченная задача' },
];

export default function AppHeader({
  brand = 'КОНТУР',
  crumbs = defaultCrumbs,
  shiftLabel = 'Диспетчер · смена Б',
  notificationsCount = 3,
  userInitials = 'ДВ',
  stats = defaultStats,
}: AppHeaderProps) {
  const clock = useClock();

  return (
    <header>
      <div className="header-row">
        <div className="brand">
          <span className="brand-mark" />
          {brand}
        </div>

        <Breadcrumb items={crumbs} />

        <div className="header-spacer" />

        <div className="header-meta">
          <span>{shiftLabel}</span>
          <span className="clock">{clock}</span>

          <div className="bell">
            <span>♧</span>
            {notificationsCount > 0 && <span className="dot">{notificationsCount}</span>}
          </div>

          <UserMenu initials={userInitials} />
        </div>
      </div>

      <div className="status-strip">
        {stats.map(stat => (
          <StatChip key={stat.label} value={stat.value} label={stat.label} tone={stat.tone} />
        ))}
      </div>
    </header>
  );
}
