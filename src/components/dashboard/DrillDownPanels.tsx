import { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import {
  useAssetDrill,
  useAssetPortfolio,
  useWorkforceDrill,
  useWorkforce,
  usePPMDrill,
  useAllPPMDrill,
  usePPMOperations,
  useServiceDesk,
  useSiteDrill,
  useDashboardKPIs,
  useSitePerformance,
  useVisitorsDrill,
} from '@/hooks/useGroupedDashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { exportToCSV, exportToXLSX } from '@/utils/exportData';
import {
  Download,
  RefreshCw,
  Wrench,
  Users,
  ClipboardCheck,
  UserCheck,
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  ChevronRight,
  Filter,
  Sparkles,
  Search,
  UserX,
} from 'lucide-react';

const COLORS = {
  operational: '#22c55e',
  maintenance: '#f59e0b',
  critical: '#ef4444',
  offline: '#6b7280',
  present: '#22c55e',
  absent: '#ef4444',
  healthy: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
  neutral: '#94a3b8',
};

function PanelHeader({
  title,
  icon: Icon,
  lastUpdated,
  onRefresh,
  isRefreshing,
  onExport,
}: {
  title: string;
  icon: React.ElementType;
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onExport?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4 pb-3 border-b">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">Last updated: {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 text-white"
            style={{ background: 'linear-gradient(90deg, #8f53a1 0%, #f47920 100%)' }}
            onClick={onExport}
          >
            <Download className="h-3 w-3" /> Export
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} /> Refresh
        </Button>
      </div>
    </div>
  );
}

// Theme-aware high contrast chart tooltip
export const ThemeChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const isLight =
      typeof document !== 'undefined' &&
      (document.documentElement.getAttribute('data-theme') === 'light' ||
        document.documentElement.classList.contains('light'));
    return (
      <div
        style={{
          backgroundColor: isLight ? '#FFFFFF' : '#0F172A',
          border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: isLight
            ? '0 10px 24px -2px rgba(15, 23, 42, 0.15), 0 4px 8px -2px rgba(15, 23, 42, 0.08)'
            : '0 12px 28px rgba(0, 0, 0, 0.8), 0 0 15px rgba(0, 0, 0, 0.5)',
          color: isLight ? '#0F172A' : '#FFFFFF',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        {label && (
          <div
            style={{
              color: isLight ? '#64748B' : '#94A3B8',
              fontSize: '11px',
              fontWeight: 600,
              marginBottom: '4px',
            }}
          >
            {label}
          </div>
        )}
        {payload.map((entry: any, index: number) => {
          const color = entry.color || entry.fill || entry.payload?.fill || '#00C853';
          const name = entry.name || entry.dataKey || label;
          const value = entry.value;
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                fontSize: '12px',
                fontWeight: 600,
                color: isLight ? '#0F172A' : '#FFFFFF',
                marginTop: index > 0 ? '4px' : '0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: isLight ? '#334155' : '#CBD5E1' }}>{name}</span>
              </div>
              <span
                style={{
                  fontWeight: 800,
                  color: isLight ? '#0F172A' : '#FFFFFF',
                  fontFamily: 'monospace',
                }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// ==========================================
// ==========================================
// REUSABLE STATUS BREAKDOWN COMPONENT
// ==========================================
interface StatusBreakdownItem {
  name: string;
  value: number;
  color: string;
}

function StatusBreakdownSection({
  title,
  icon: Icon,
  score,
  scoreLabel,
  total,
  items,
}: {
  title: string;
  icon: React.ElementType;
  score: number;
  scoreLabel: string;
  total: number;
  items: StatusBreakdownItem[];
}) {
  const [chartMode, setChartMode] = useState<'Pie' | 'Vertical Bar' | 'Horizontal Bar'>('Pie');
  const validItems = items.filter((it) => it.value > 0);
  const displayItems = validItems.length > 0 ? validItems : items;

  return (
    <div
      style={{
        backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon className="h-4 w-4 text-primary" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Switcher Buttons */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
            }}
          >
            {(['Pie', 'Vertical Bar', 'Horizontal Bar'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setChartMode(m)}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.6875rem',
                  fontWeight: chartMode === m ? 700 : 500,
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: chartMode === m ? '#00E676' : 'transparent',
                  color: chartMode === m ? '#0B0F19' : 'var(--text-muted, #94A3B8)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Score Badge */}
          <span
            style={{
              padding: '3px 10px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              borderRadius: '999px',
              backgroundColor: score >= 80 ? 'rgba(0, 230, 118, 0.15)' : score >= 50 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: score >= 80 ? '#00E676' : score >= 50 ? '#F59E0B' : '#EF4444',
              border: `1px solid ${score >= 80 ? 'rgba(0, 230, 118, 0.3)' : score >= 50 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}
          >
            {scoreLabel}: {score.toFixed(1)}%
          </span>

          {/* Total Badge */}
          <span
            style={{
              padding: '3px 10px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
            }}
          >
            Total: {total}
          </span>
        </div>
      </div>

      {/* Chart Graphic */}
      <div style={{ height: '180px', width: '100%', position: 'relative' }}>
        {total === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            No status distribution data available
          </div>
        ) : chartMode === 'Pie' ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ThemeChartTooltip />} />
                <Pie
                  data={displayItems}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={validItems.length > 1 ? 3 : 0}
                >
                  {displayItems.map((entry, index) => (
                    <Cell key={`slice-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                {score.toFixed(0)}%
              </span>
              <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '3px', letterSpacing: '0.04em' }}>
                {scoreLabel}
              </span>
            </div>
          </>
        ) : chartMode === 'Vertical Bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayItems} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color, rgba(255, 255, 255, 0.08))" />
              <XAxis dataKey="name" fontSize={10} stroke="var(--text-muted)" />
              <YAxis fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
              <Tooltip content={<ThemeChartTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28}>
                {displayItems.map((entry, index) => (
                  <Cell key={`vbar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayItems} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color, rgba(255, 255, 255, 0.08))" />
              <XAxis type="number" fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
              <YAxis type="category" dataKey="name" fontSize={10} stroke="var(--text-muted)" width={95} />
              <Tooltip content={<ThemeChartTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {displayItems.map((entry, index) => (
                  <Cell key={`hbar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Progress Strip */}
      <div
        style={{
          marginTop: '12px',
          width: '100%',
          height: '6px',
          borderRadius: '999px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {items.map((item, idx) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div
              key={idx}
              style={{ width: `${pct}%`, backgroundColor: item.color }}
              title={`${item.name}: ${item.value} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Bottom Legend */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '0.75rem',
        }}
      >
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: item.color,
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>{item.name}:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 1. ASSET PORTFOLIO & HEALTH DRILL-DOWN (AUTHENTIC API)
// ==========================================
export function AssetDrillPanel() {
  const { filters, slideOver } = useDashboard();
  const r = slideOver.data as any;

  const initCategory = r?.category || (r?.type === 'category' ? r.value : null);
  const initStatus = r?.status || (r?.type === 'status' ? r.value : null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(initCategory);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(initStatus);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (r?.category || (r?.type === 'category' && r.value)) {
      setSelectedCategory(r?.category || r.value);
    }
    if (r?.status || (r?.type === 'status' && r.value)) {
      setSelectedStatus(r?.status || r.value);
    }
  }, [r]);

  const { data: portfolioData } = useAssetPortfolio(filters);
  const { data: a, isPending: o, dataUpdatedAt: s, refetch: l, isFetching: u } = useAssetDrill(filters, {
    status: selectedStatus || undefined,
    category: selectedCategory || undefined,
  });
  const lastUpdated = s ? new Date(s) : null;

  const allRecords = a?.records ?? [];
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return allRecords;
    const q = searchQuery.toLowerCase();
    return allRecords.filter(
      (it: any) =>
        (it.name || '').toLowerCase().includes(q) ||
        (it.asset_number || '').toLowerCase().includes(q) ||
        (it.location || '').toLowerCase().includes(q) ||
        (it.category || '').toLowerCase().includes(q) ||
        (it.site_name || '').toLowerCase().includes(q)
    );
  }, [allRecords, searchQuery]);

  const handleExport = () => {
    if (!allRecords.length) return;
    const b = allRecords.map((E: any) => ({
      'Asset Number': E.asset_number || '—',
      'Asset Name': E.name || '—',
      'Category': E.category || '—',
      'Status': (E.status || 'operational').toUpperCase(),
      'Location': E.location || '—',
      'Site Name': E.site_name || '—',
    }));
    exportToXLSX({
      summary: {
        'Total Assets': a?.total ?? allRecords.length,
        'Filter Context': selectedCategory || selectedStatus || 'All',
        'Exported At': new Date().toLocaleString(),
      },
      sheets: [{ name: 'Assets', data: b }],
      filename: `assets_${(selectedCategory || selectedStatus || 'drill').replace(/[^a-zA-Z0-9]/g, '_')}`,
    });
  };

  if (o) return <Skeleton className="h-64" />;

  const v = a?.summary;
  const total = v?.total ?? a?.total ?? allRecords.length;
  const operational = v?.operational ?? allRecords.filter((x: any) => x.status === 'operational').length;
  const maintenance = v?.maintenance ?? allRecords.filter((x: any) => x.status === 'maintenance').length;
  const critical = v?.critical ?? allRecords.filter((x: any) => x.status === 'critical').length;
  const healthRate = v?.health_percentage ?? (total > 0 ? (operational / total) * 100 : 0);

  const titleText = selectedCategory
    ? `Assets — Category: ${selectedCategory}`
    : selectedStatus
    ? `Assets — Status: ${selectedStatus.toUpperCase()}`
    : 'Asset Portfolio & Health Telemetry';

  const categoriesList = portfolioData?.categories || [];

  return (
    <div>
      <PanelHeader
        title={titleText}
        icon={Wrench}
        lastUpdated={lastUpdated}
        onRefresh={() => l()}
        isRefreshing={u}
        onExport={handleExport}
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div
          className={cn('p-3 rounded-lg border transition-all cursor-pointer', !selectedStatus ? 'bg-muted/70 ring-1 ring-primary' : 'bg-muted/40 hover:bg-muted/60')}
          onClick={() => setSelectedStatus(null)}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Total</div>
          <div className="text-xl font-bold">{total}</div>
        </div>
        <div
          className={cn('p-3 rounded-lg border transition-all cursor-pointer', selectedStatus === 'operational' ? 'bg-healthy/20 ring-1 ring-healthy' : 'bg-healthy/10 hover:bg-healthy/15')}
          onClick={() => setSelectedStatus(selectedStatus === 'operational' ? null : 'operational')}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Operational</div>
          <div className="text-xl font-bold text-healthy">{operational}</div>
        </div>
        <div
          className={cn('p-3 rounded-lg border transition-all cursor-pointer', selectedStatus === 'maintenance' ? 'bg-warning/20 ring-1 ring-warning' : 'bg-warning/10 hover:bg-warning/15')}
          onClick={() => setSelectedStatus(selectedStatus === 'maintenance' ? null : 'maintenance')}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Breakdown</div>
          <div className="text-xl font-bold text-warning">{maintenance}</div>
        </div>
        <div
          className={cn('p-3 rounded-lg border transition-all cursor-pointer', selectedStatus === 'critical' ? 'bg-critical/20 ring-1 ring-critical' : 'bg-critical/10 hover:bg-critical/15')}
          onClick={() => setSelectedStatus(selectedStatus === 'critical' ? null : 'critical')}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Critical</div>
          <div className="text-xl font-bold text-critical">{critical}</div>
        </div>
      </div>

      {/* Breakdown Section with Pie/Bar Switcher */}
      <StatusBreakdownSection
        title="Asset Health & Status Breakdown"
        icon={Wrench}
        score={healthRate}
        scoreLabel="Health Score"
        total={total}
        items={[
          { name: 'Operational', value: operational, color: '#00C853' },
          { name: 'Breakdown', value: maintenance, color: '#FF9100' },
          { name: 'Critical', value: critical, color: '#EF4444' },
        ]}
      />

      {/* Category Filter Pills */}
      {categoriesList.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border bg-card/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Filter by Category:</span>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-2xs text-primary hover:underline font-semibold"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'text-2xs px-2.5 py-1 rounded-full border transition-all',
                !selectedCategory ? 'bg-healthy text-white border-healthy font-semibold shadow-sm' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              All Categories ({portfolioData?.summary?.total ?? total})
            </button>
            {categoriesList.map((cat: any) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  'text-2xs px-2.5 py-1 rounded-full border transition-all truncate max-w-[240px]',
                  selectedCategory === cat.name ? 'bg-healthy text-white border-healthy font-semibold shadow-sm' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                )}
                title={cat.name}
              >
                {cat.name} ({cat.total})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Input & List Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Asset List ({filteredRecords.length})
        </h4>
        <div className="relative w-48 sm:w-60">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="h-8 pl-8 text-xs bg-muted/40"
          />
        </div>
      </div>

      {/* Asset Cards List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {filteredRecords.map((b: any, E: number) => (
          <div key={E} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-mono font-bold text-muted-foreground">{b.asset_number || '—'}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-2xs px-1 py-0',
                    b.status === 'operational' && 'border-healthy text-healthy',
                    b.status === 'maintenance' && 'border-warning text-warning',
                    b.status === 'critical' && 'border-critical text-critical',
                    b.status === 'offline' && 'border-muted-foreground text-muted-foreground'
                  )}
                >
                  {b.status === 'maintenance' ? 'Breakdown' : b.status}
                </Badge>
              </div>
              <div className="text-xs font-medium truncate text-foreground">{b.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {b.location} · {b.category} · {b.site_name || '—'}
              </div>
            </div>
          </div>
        ))}
        {!filteredRecords.length && (
          <p className="text-sm text-muted-foreground text-center py-8">No assets match the selected filter</p>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. SERVICE DESK & SLA DRILL-DOWN (AUTHENTIC API)
// ==========================================
export function TicketDrillPanel() {
  const { filters, slideOver } = useDashboard();
  const r = slideOver.data as any;

  const initCategory = r?.category || (r?.type === 'category' ? r.value : null);
  const initStatus = r?.status || (r?.type === 'status' ? r.value : null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(initCategory);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(initStatus);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (r?.category || (r?.type === 'category' && r.value)) {
      setSelectedCategory(r?.category || r.value);
    }
    if (r?.status || (r?.type === 'status' && r.value)) {
      setSelectedStatus(r?.status || r.value);
    }
  }, [r]);

  const { data, isPending, dataUpdatedAt, refetch, isFetching } = useServiceDesk(filters);
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const allTickets = data?.priority_tickets ?? [];
  const filteredTickets = useMemo(() => {
    return allTickets.filter((t: any) => {
      if (selectedCategory && selectedCategory !== 'all') {
        if ((t.category || '').toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }
      if (selectedStatus && selectedStatus !== 'all') {
        const st = (t.status || '').toLowerCase();
        if (selectedStatus === 'open' && !['open', 'reopened'].includes(st)) return false;
        if (selectedStatus === 'in_progress' && st !== 'in_progress') return false;
        if (selectedStatus === 'closed' && !['closed', 'resolved'].includes(st)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (t.ticket_number || '').toLowerCase().includes(q) ||
          (t.heading || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q) ||
          (t.site_name || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allTickets, selectedCategory, selectedStatus, searchQuery]);

  const handleExport = () => {
    if (!filteredTickets.length) return;
    const ticketsData = filteredTickets.map((t: any, idx: number) => ({
      'S.No': idx + 1,
      'Ticket Number': t.ticket_number,
      'Issue Description': t.heading,
      'Category': t.category || 'General',
      'Priority': t.priority,
      'SLA Status': t.sla_status,
      'Resolution Status': t.status,
      'Site Name': t.site_name || '—',
      'Created Timestamp': t.created_at,
    }));
    exportToXLSX({
      summary: {
        'Report Name': 'Service Desk SLA Health Telemetry',
        'Total Requests': filteredTickets.length,
        'Filter Context': selectedCategory || selectedStatus || 'All',
        'Exported At': new Date().toLocaleString(),
      },
      sheets: [{ name: 'Tickets', data: ticketsData }],
      filename: `tickets_${(selectedCategory || selectedStatus || 'drill').replace(/[^a-zA-Z0-9]/g, '_')}`,
    });
  };

  if (isPending) return <Skeleton className="h-64" />;
  if (!data) return <p className="text-sm text-muted-foreground p-6">No service desk data</p>;

  const withinSla = filteredTickets.filter((t: any) => (t.sla_status || '').toLowerCase().includes('within')).length;
  const atRisk = filteredTickets.filter((t: any) => (t.sla_status || '').toLowerCase().includes('risk')).length;
  const breached = filteredTickets.filter((t: any) => (t.sla_status || '').toLowerCase().includes('breach')).length;
  const total = filteredTickets.length;
  const slaRate = total > 0 ? (withinSla / total) * 100 : (data.sla_status?.sla_percentage ?? 0);

  const titleText = selectedCategory
    ? `Service Desk — Category: ${selectedCategory}`
    : selectedStatus
    ? `Service Desk — Status: ${selectedStatus.toUpperCase()}`
    : 'Service Desk SLA & TAT Telemetry';

  const categoriesList = data.by_category || [];

  return (
    <div>
      <PanelHeader
        title={titleText}
        icon={Ticket}
        lastUpdated={lastUpdated}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExport={handleExport}
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-muted/40 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-0.5">Total Requests</div>
          <div className="text-xl font-bold">{total}</div>
        </div>
        <div className="bg-healthy/10 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-0.5">Within SLA</div>
          <div className="text-xl font-bold text-healthy">{withinSla}</div>
        </div>
        <div className="bg-warning/10 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-0.5">At Risk</div>
          <div className="text-xl font-bold text-warning">{atRisk}</div>
        </div>
        <div className="bg-critical/10 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-0.5">Breached</div>
          <div className="text-xl font-bold text-critical">{breached}</div>
        </div>
      </div>

      {/* Breakdown Section with Pie/Bar Switcher */}
      <StatusBreakdownSection
        title="Service Desk SLA & Status Breakdown"
        icon={Ticket}
        score={slaRate}
        scoreLabel="SLA Met"
        total={total}
        items={[
          { name: 'Within SLA', value: withinSla, color: '#00C853' },
          { name: 'At Risk', value: atRisk, color: '#F59E0B' },
          { name: 'Breached', value: breached, color: '#EF4444' },
        ]}
      />

      {/* Category Filter Pills */}
      {categoriesList.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border bg-card/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Filter by Category:</span>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-2xs text-primary hover:underline font-semibold"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'text-2xs px-2.5 py-1 rounded-full border transition-all',
                !selectedCategory ? 'bg-healthy text-white border-healthy font-semibold shadow-sm' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              All Categories ({data.summary.total})
            </button>
            {categoriesList.map((cat: any) => (
              <button
                key={cat.category}
                type="button"
                onClick={() => setSelectedCategory(cat.category)}
                className={cn(
                  'text-2xs px-2.5 py-1 rounded-full border transition-all truncate max-w-[240px]',
                  selectedCategory === cat.category ? 'bg-healthy text-white border-healthy font-semibold shadow-sm' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                )}
                title={cat.category}
              >
                {cat.category} ({cat.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Input & List Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Ticket Request List ({filteredTickets.length})
        </h4>
        <div className="relative w-48 sm:w-60">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets..."
            className="h-8 pl-8 text-xs bg-muted/40"
          />
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {filteredTickets.map((t: any, idx: number) => (
          <div key={idx} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-mono font-bold text-primary">#{t.ticket_number}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-2xs px-1 py-0',
                    t.priority === 'P1' && 'border-critical text-critical',
                    t.priority === 'P2' && 'border-warning text-warning',
                    t.priority === 'P3' && 'border-info text-info'
                  )}
                >
                  {t.priority}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-2xs px-1 py-0',
                    (t.sla_status || '').toLowerCase().includes('within') && 'border-healthy text-healthy',
                    (t.sla_status || '').toLowerCase().includes('risk') && 'border-warning text-warning',
                    (t.sla_status || '').toLowerCase().includes('breach') && 'border-critical text-critical'
                  )}
                >
                  {t.sla_status}
                </Badge>
                <span className="text-2xs text-muted-foreground ml-auto">{t.status}</span>
              </div>
              <div className="text-xs font-medium truncate text-foreground">{t.heading}</div>
              <div className="text-2xs text-muted-foreground mt-0.5">
                {t.created_at ? new Date(t.created_at).toLocaleString() : '—'} · {t.category || 'General'} · {t.site_name || '—'}
              </div>
            </div>
          </div>
        ))}
        {!filteredTickets.length && (
          <p className="text-sm text-muted-foreground text-center py-8">No tickets match the selected filter</p>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. PPM & SOFT SERVICES DRILL-DOWN (AUTHENTIC API)
// ==========================================
export function PPMDrillPanel() {
  const { filters, slideOver } = useDashboard();
  const r = slideOver.data as any;

  const { data: ppmOps } = usePPMOperations(filters);
  const categoriesList = useMemo(() => (ppmOps?.ppm?.by_category || []).map((c: any) => c.category), [ppmOps]);

  const initCategory = r?.category || (r?.type === 'category' ? r.value : null) || categoriesList[0] || null;
  const initStatus = r?.status || (r?.type === 'status' ? r.value : null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(initCategory);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(initStatus);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (r?.category || (r?.type === 'category' && r.value)) {
      setSelectedCategory(r?.category || r.value);
    } else if (!selectedCategory && categoriesList.length > 0) {
      setSelectedCategory(categoriesList[0]);
    }
    if (r?.status || (r?.type === 'status' && r.value)) {
      setSelectedStatus(r?.status || r.value);
    }
  }, [r, categoriesList]);

  const { data: i, isPending: a, dataUpdatedAt: o, refetch: s, isFetching: l } = usePPMDrill(filters, selectedCategory);
  const u = o ? new Date(o) : null;

  const allRecords = i?.records ?? [];
  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec: any) => {
      if (selectedStatus) {
        const st = (rec.status || 'pending').toLowerCase();
        if (selectedStatus === 'completed' && st !== 'completed') return false;
        if (selectedStatus === 'pending' && st !== 'pending') return false;
        if (selectedStatus === 'overdue' && !['overdue', 'missed'].includes(st)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (rec.asset_name || '').toLowerCase().includes(q) ||
          (rec.asset_number || '').toLowerCase().includes(q) ||
          (rec.category || '').toLowerCase().includes(q) ||
          (rec.location || '').toLowerCase().includes(q) ||
          (rec.site_name || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allRecords, selectedStatus, searchQuery]);

  const handleExport = () => {
    if (!allRecords.length) return;
    const p = allRecords.map((v: any) => ({
      'Asset Number': v.asset_number || '—',
      'Asset Name': v.asset_name || '—',
      'Category': v.category || selectedCategory || '—',
      'Location': v.location || '—',
      'Status': (v.status || 'pending').toUpperCase(),
      'Start Time': v.start_time ? new Date(v.start_time).toLocaleString() : '—',
      'End Time': v.end_time ? new Date(v.end_time).toLocaleString() : '—',
      'Site Name': v.site_name || '—',
    }));
    exportToXLSX({
      summary: { total: i?.total ?? allRecords.length, completed: i?.completed ?? 0, category: selectedCategory || 'drill' },
      sheets: [{ name: 'PPM Tasks', data: p }],
      filename: `ppm_${(selectedCategory || 'drill').replace(/[^a-zA-Z0-9]/g, '_')}`,
    });
  };

  if (a) return <Skeleton className="h-64" />;

  const total = i?.total ?? allRecords.length;
  const completed = i?.completed ?? allRecords.filter((rec: any) => rec.status === 'completed').length;
  const pending = Math.max(0, total - completed);
  const overdue = allRecords.filter((rec: any) => rec.status === 'overdue' || rec.status === 'missed').length;
  const compliancePct = total > 0 ? (completed / total) * 100 : 0;

  const d = selectedCategory ? `PPM Drill-down — ${selectedCategory}` : 'PPM Compliance & Operations Telemetry';

  return (
    <div>
      <PanelHeader
        title={d}
        icon={ClipboardCheck}
        lastUpdated={u}
        onRefresh={() => s()}
        isRefreshing={l}
        onExport={handleExport}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div
          className={cn('p-3 rounded-lg border transition-all cursor-pointer', !selectedStatus ? 'bg-muted/70 ring-1 ring-primary' : 'bg-muted/40 hover:bg-muted/60')}
          onClick={() => setSelectedStatus(null)}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Total Tasks</div>
          <div className="text-xl font-bold">{total}</div>
        </div>
        <div
          className={cn('p-3 rounded-lg border transition-all cursor-pointer', selectedStatus === 'completed' ? 'bg-healthy/20 ring-1 ring-healthy' : 'bg-healthy/10 hover:bg-healthy/15')}
          onClick={() => setSelectedStatus(selectedStatus === 'completed' ? null : 'completed')}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Completed</div>
          <div className="text-xl font-bold text-healthy">{completed}</div>
        </div>
        <div
          className={cn('p-3 rounded-lg border transition-all cursor-pointer', selectedStatus === 'pending' ? 'bg-warning/20 ring-1 ring-warning' : 'bg-warning/10 hover:bg-warning/15')}
          onClick={() => setSelectedStatus(selectedStatus === 'pending' ? null : 'pending')}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Pending</div>
          <div className="text-xl font-bold text-warning">{pending}</div>
        </div>
        <div
          className={cn('p-3 rounded-lg border transition-all cursor-pointer', selectedStatus === 'overdue' ? 'bg-critical/20 ring-1 ring-critical' : 'bg-critical/10 hover:bg-critical/15')}
          onClick={() => setSelectedStatus(selectedStatus === 'overdue' ? null : 'overdue')}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Overdue</div>
          <div className="text-xl font-bold text-critical">{overdue}</div>
        </div>
      </div>

      {/* Breakdown Section with Pie/Bar Switcher */}
      <StatusBreakdownSection
        title="PPM Adherence & Task Status Breakdown"
        icon={ClipboardCheck}
        score={compliancePct}
        scoreLabel="Compliance"
        total={total}
        items={[
          { name: 'Completed', value: completed, color: '#00C853' },
          { name: 'Pending', value: pending, color: '#F59E0B' },
          { name: 'Overdue', value: overdue, color: '#EF4444' },
        ]}
      />

      {/* Category Filter Pills */}
      {categoriesList.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border bg-card/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Select PPM Category:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
            {categoriesList.map((cat: string) => {
              const catStat = (ppmOps?.ppm?.by_category || []).find((c: any) => c.category === cat);
              const countText = catStat ? ` (${catStat.total})` : '';
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'text-2xs px-2.5 py-1 rounded-full border transition-all truncate max-w-[280px]',
                    selectedCategory === cat
                      ? 'bg-healthy text-white border-healthy font-semibold shadow-sm'
                      : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                  )}
                  title={cat}
                >
                  {cat.trim()}{countText}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Input & List Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          PPM Task Checklist ({filteredRecords.length})
        </h4>
        <div className="relative w-48 sm:w-60">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="h-8 pl-8 text-xs bg-muted/40"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {filteredRecords.map((p: any, v: number) => (
          <div key={v} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  {p.asset_number ?? p.asset_name ?? '—'}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-2xs px-1 py-0',
                    p.status === 'completed' && 'border-healthy text-healthy',
                    p.status === 'missed' && 'border-critical text-critical',
                    p.status === 'overdue' && 'border-critical text-critical',
                    (p.status === 'pending' || !p.status) && 'border-warning text-warning'
                  )}
                >
                  {p.status || 'pending'}
                </Badge>
              </div>
              <div className="text-xs font-medium truncate text-foreground">{p.asset_name ?? p.category ?? '—'}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {p.location} · {p.category} · {p.site_name || '—'}
              </div>
              <div className="text-2xs text-muted-foreground mt-0.5">
                {p.start_time ? new Date(p.start_time).toLocaleString() : '—'}
              </div>
            </div>
          </div>
        ))}
        {!filteredRecords.length && (
          <p className="text-sm text-muted-foreground text-center py-8">No PPM tasks found for this selection</p>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. WORKFORCE TRACKING DRILL-DOWN (AUTHENTIC API)
// ==========================================
export function WorkforceDrillPanel() {
  const { filters, slideOver } = useDashboard();
  const r = slideOver.data as any;

  const initVendor = r?.vendor || (r?.type === 'vendor' ? r.value : null);
  const initWorkType = r?.work_type || (r?.type === 'work_type' ? r.value : null);
  const initAttendance = r?.attendance || (r?.type === 'attendance' ? r.value : null);

  const [selectedVendor, setSelectedVendor] = useState<string | null>(initVendor);
  const [selectedWorkType, setSelectedWorkType] = useState<string | null>(initWorkType);
  const [selectedAttendance, setSelectedAttendance] = useState<'present' | 'absent' | null>(initAttendance);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (r?.vendor || (r?.type === 'vendor' && r.value)) {
      setSelectedVendor(r?.vendor || r.value);
    }
    if (r?.work_type || (r?.type === 'work_type' && r.value)) {
      setSelectedWorkType(r?.work_type || r.value);
    }
    if (r?.attendance || (r?.type === 'attendance' && r.value)) {
      setSelectedAttendance(r?.attendance || r.value);
    }
  }, [r]);

  const { data: workforceData } = useWorkforce(filters);
  const { data: o, isPending: s, dataUpdatedAt: l, refetch: u, isFetching: f } = useWorkforceDrill(filters, {
    vendor: selectedVendor || undefined,
    work_type: selectedWorkType || undefined,
    attendance: selectedAttendance || undefined,
  });
  const d = l ? new Date(l) : null;

  const allRecords = o?.records ?? [];
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return allRecords;
    const q = searchQuery.toLowerCase();
    return allRecords.filter(
      (g: any) =>
        (g.name || '').toLowerCase().includes(q) ||
        (g.employee_no || '').toLowerCase().includes(q) ||
        (g.work_type || '').toLowerCase().includes(q) ||
        (g.vendor || '').toLowerCase().includes(q) ||
        (g.site_name || '').toLowerCase().includes(q)
    );
  }, [allRecords, searchQuery]);

  const handleExport = () => {
    if (!allRecords.length) return;
    const m = allRecords.map((g: any) => ({
      name: g.name,
      employee_no: g.employee_no,
      work_type: g.work_type,
      vendor: g.vendor,
      present_today: g.present_today ? 'Yes' : 'No',
      site_name: g.site_name,
    }));
    exportToXLSX({
      summary: { total: o?.total ?? allRecords.length, present: o?.present ?? 0, absent: o?.absent ?? 0 },
      sheets: [{ name: 'Staff', data: m }],
      filename: `workforce_${(selectedWorkType || selectedVendor || selectedAttendance || 'drill').replace(/[^a-zA-Z0-9]/g, '_')}`,
    });
  };

  if (s) return <Skeleton className="h-64" />;

  const total = o?.total ?? allRecords.length;
  const present = o?.present ?? allRecords.filter((g: any) => g.present_today).length;
  const absent = o?.absent ?? allRecords.filter((g: any) => !g.present_today).length;
  const availabilityPct = total > 0 ? (present / total) * 100 : 0;

  const titleText = selectedWorkType
    ? `Workforce — Work Type: ${selectedWorkType}`
    : selectedVendor
    ? `Workforce — Vendor: ${selectedVendor}`
    : selectedAttendance
    ? `Workforce — ${selectedAttendance === 'present' ? 'Present Today' : 'Absent'}`
    : 'Workforce Availability Telemetry';

  const workTypesList = workforceData?.by_work_type || [];
  const vendorsList = workforceData?.by_vendor || [];

  return (
    <div>
      <PanelHeader
        title={titleText}
        icon={Users}
        lastUpdated={d}
        onRefresh={() => u()}
        isRefreshing={f}
        onExport={handleExport}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div
          className={cn('p-3 rounded-lg border transition-all cursor-pointer', !selectedAttendance ? 'bg-muted/70 ring-1 ring-primary' : 'bg-muted/40 hover:bg-muted/60')}
          onClick={() => setSelectedAttendance(null)}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Total Staff</div>
          <div className="text-xl font-bold">{total}</div>
        </div>
        <div
          className={cn('p-3 rounded-lg border transition-all cursor-pointer', selectedAttendance === 'present' ? 'bg-healthy/20 ring-1 ring-healthy' : 'bg-healthy/10 hover:bg-healthy/15')}
          onClick={() => setSelectedAttendance(selectedAttendance === 'present' ? null : 'present')}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Present Today</div>
          <div className="text-xl font-bold text-healthy">{present}</div>
        </div>
        <div
          className={cn('p-3 rounded-lg border transition-all cursor-pointer', selectedAttendance === 'absent' ? 'bg-critical/20 ring-1 ring-critical' : 'bg-critical/10 hover:bg-critical/15')}
          onClick={() => setSelectedAttendance(selectedAttendance === 'absent' ? null : 'absent')}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Absent</div>
          <div className="text-xl font-bold text-critical">{absent}</div>
        </div>
        <div className="bg-muted/40 rounded-lg p-3 border">
          <div className="text-xs text-muted-foreground mb-0.5">Availability</div>
          <div className={cn('text-xl font-bold', availabilityPct >= 80 ? 'text-healthy' : availabilityPct >= 50 ? 'text-warning' : 'text-critical')}>
            {availabilityPct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Breakdown Section with Pie/Bar Switcher */}
      <StatusBreakdownSection
        title="Workforce Attendance & Status Breakdown"
        icon={Users}
        score={availabilityPct}
        scoreLabel="Availability"
        total={total}
        items={[
          { name: 'Present', value: present, color: '#00C853' },
          { name: 'Absent', value: absent, color: '#EF4444' },
        ]}
      />

      {/* Role / Work Type Filter Pills */}
      {workTypesList.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border bg-card/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Filter by Role / Work Type:</span>
            {selectedWorkType && (
              <button
                type="button"
                onClick={() => setSelectedWorkType(null)}
                className="text-2xs text-primary hover:underline font-semibold"
              >
                Clear Role Filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedWorkType(null)}
              className={cn(
                'text-2xs px-2.5 py-1 rounded-full border transition-all',
                !selectedWorkType ? 'bg-healthy text-white border-healthy font-semibold shadow-sm' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              All Roles ({workforceData?.summary?.total ?? total})
            </button>
            {workTypesList.map((wt: any) => (
              <button
                key={wt.work_type}
                type="button"
                onClick={() => setSelectedWorkType(wt.work_type)}
                className={cn(
                  'text-2xs px-2.5 py-1 rounded-full border transition-all truncate max-w-[240px]',
                  selectedWorkType === wt.work_type ? 'bg-healthy text-white border-healthy font-semibold shadow-sm' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                )}
                title={wt.work_type}
              >
                {wt.work_type.trim()} ({wt.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Input & List Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Staff Attendance List ({filteredRecords.length})
        </h4>
        <div className="relative w-48 sm:w-60">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name or ID..."
            className="h-8 pl-8 text-xs bg-muted/40"
          />
        </div>
      </div>

      {/* Staff Attendance List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {filteredRecords.map((g: any, idx: number) => (
          <div key={idx} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-mono font-bold text-muted-foreground">{g.employee_no || '—'}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-2xs px-1 py-0',
                    g.present_today ? 'border-healthy text-healthy' : 'border-critical text-critical'
                  )}
                >
                  {g.present_today ? 'Present' : 'Absent'}
                </Badge>
              </div>
              <div className="text-xs font-medium truncate text-foreground">{g.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {g.work_type} · {g.vendor} · {g.site_name || '—'}
              </div>
            </div>
          </div>
        ))}
        {!filteredRecords.length && (
          <p className="text-sm text-muted-foreground text-center py-8">No staff records match the selected filter</p>
        )}
      </div>
    </div>
  );
}

// 5. VISITORS DRILL-DOWN (Preserved)
// ==========================================
export function VisitorDrillPanel() {
  const { filters, slideOver, openSlideOver } = useDashboard();
  const data = slideOver.data as { category?: string } | null;
  const category = data?.category;

  type VisitorChartType = 'Pie' | 'Vertical Bar' | 'Horizontal Bar';
  const [visitorChartType, setVisitorChartType] = useState<VisitorChartType>('Pie');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(category);

  const { data: drillData, isPending, dataUpdatedAt, refetch, isFetching } = useVisitorsDrill(filters, { category: selectedCategory });
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const records = drillData?.records ?? [];
  const today = drillData?.today ?? { checked_in: 0, checked_out: 0, currently_inside: 0 };

  const displayedRecords = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return records;
    return records.filter((r) => (r.category || r.visit_type)?.toLowerCase() === selectedCategory.toLowerCase());
  }, [records, selectedCategory]);

  const VISITOR_PALETTE = ['#00C853', '#3B82F6', '#FF5B22', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#6366F1'];
  const visitorChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of records) {
      const cat = r.category || r.visit_type || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat, count], idx) => ({
        name: cat,
        shortName: cat.length > 12 ? `${cat.substring(0, 11)}…` : cat,
        key: cat,
        count,
        fill: VISITOR_PALETTE[idx % VISITOR_PALETTE.length],
      }));
  }, [records]);

  const handleExport = () => {
    if (!displayedRecords?.length) return;
    const rows = displayedRecords.map((r) => ({
      visitor_name: r.visitor_name,
      contact_no: r.contact_no,
      category: r.category,
      visit_type: r.visit_type,
      purpose: r.purpose,
      check_in: r.check_in ? new Date(r.check_in).toLocaleString() : '—',
      check_out: r.check_out ? new Date(r.check_out).toLocaleString() : '—',
      created_by: r.created_by ?? '—',
      host_name: r.host_name ?? '—',
      approved: r.approved ?? '—',
      site_name: r.site_name ?? '—',
      status: r.status,
    }));
    exportToXLSX({
      summary: { total: drillData?.total ?? records.length, ...today, filter_category: selectedCategory || 'all' },
      sheets: [{ name: 'Visitors', data: rows }],
      filename: `visitors_${selectedCategory || 'all'}`,
    });
  };

  const title = selectedCategory ? `Visitors — Category: ${selectedCategory}` : 'Visitors — All visits';

  return (
    <div className="min-w-0 overflow-hidden">
      <PanelHeader
        title={title}
        icon={UserCheck}
        lastUpdated={lastUpdated}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExport={handleExport}
      />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div
          onClick={() => setSelectedCategory(undefined)}
          className={cn(
            'rounded-lg p-3 cursor-pointer transition-all border',
            !selectedCategory ? 'bg-primary/10 border-primary' : 'bg-muted/40 border-transparent hover:bg-muted/60'
          )}
        >
          <div className="text-xs text-muted-foreground mb-0.5">Total (period)</div>
          <div className="text-xl font-bold">{drillData?.total ?? records.length}</div>
        </div>
        <div className="bg-healthy/10 rounded-lg p-3 border border-transparent">
          <div className="text-xs text-muted-foreground mb-0.5">Checked in today</div>
          <div className="text-xl font-bold text-healthy">{today.checked_in}</div>
        </div>
        <div className="bg-critical/10 rounded-lg p-3 border border-transparent">
          <div className="text-xs text-muted-foreground mb-0.5">Inside now</div>
          <div className="text-xl font-bold text-warning">{today.currently_inside}</div>
        </div>
      </div>

      {/* Visitor Category & Check-In Breakdown Box */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-4 shadow-sm mb-4">
        {/* Header with Title, Chart Switcher Pills, and Badge */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground tracking-wide uppercase">
              Visitor Category Distribution
            </h4>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Chart Switcher: Pie / Donut, Vertical Bar, Horizontal Bar */}
            <div className="flex items-center gap-0.5 bg-muted/80 p-0.5 rounded-lg border border-border">
              {(['Pie', 'Vertical Bar', 'Horizontal Bar'] as VisitorChartType[]).map((type) => {
                const isSelected = visitorChartType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVisitorChartType(type)}
                    className={cn(
                      'px-2.5 py-1 text-2xs font-bold rounded-md transition-all cursor-pointer',
                      isSelected
                        ? 'bg-background text-foreground shadow-xs border border-border'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    )}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            <span className="text-2xs font-bold px-2.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">
              Inside Now: {today.currently_inside}
            </span>
            <span className="text-2xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
              Categories: {visitorChartData.length}
            </span>
          </div>
        </div>

        {/* Dynamic Charts for Visitor Breakdown */}
        <div style={{ height: '200px', width: '100%', position: 'relative' }}>
          {visitorChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No visitor category records found
            </div>
          ) : visitorChartType === 'Pie' ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ThemeChartTooltip />} />
                <Pie
                  data={visitorChartData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={2}
                  cursor="pointer"
                  onClick={(d) => {
                    if (d?.key) setSelectedCategory(selectedCategory === d.key ? undefined : d.key);
                  }}
                >
                  {visitorChartData.map((entry, index) => (
                    <Cell
                      key={`visitor-pie-${index}`}
                      fill={entry.fill}
                      stroke={selectedCategory === entry.key ? 'var(--text-primary)' : 'transparent'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : visitorChartType === 'Vertical Bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitorChartData} margin={{ top: 10, right: 15, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="shortName" fontSize={10} stroke="var(--text-muted)" angle={-20} textAnchor="end" interval={0} />
                <YAxis fontSize={11} stroke="var(--text-muted)" allowDecimals={false} />
                <Tooltip content={<ThemeChartTooltip />} />
                <Bar
                  dataKey="count"
                  name="Visitors"
                  radius={[5, 5, 0, 0]}
                  barSize={28}
                  cursor="pointer"
                  onClick={(d: any) => {
                    if (d?.key) setSelectedCategory(selectedCategory === d.key ? undefined : d.key);
                  }}
                >
                  {visitorChartData.map((entry, index) => (
                    <Cell
                      key={`visitor-vbar-${index}`}
                      fill={entry.fill}
                      stroke={selectedCategory === entry.key ? 'var(--text-primary)' : 'transparent'}
                      strokeWidth={2}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitorChartData} layout="vertical" margin={{ top: 10, right: 25, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" fontSize={11} stroke="var(--text-muted)" allowDecimals={false} />
                <YAxis type="category" dataKey="shortName" fontSize={10} stroke="var(--text-muted)" width={85} />
                <Tooltip content={<ThemeChartTooltip />} />
                <Bar
                  dataKey="count"
                  name="Visitors"
                  radius={[0, 5, 5, 0]}
                  barSize={18}
                  cursor="pointer"
                  onClick={(d: any) => {
                    if (d?.key) setSelectedCategory(selectedCategory === d.key ? undefined : d.key);
                  }}
                >
                  {visitorChartData.map((entry, index) => (
                    <Cell
                      key={`visitor-hbar-${index}`}
                      fill={entry.fill}
                      stroke={selectedCategory === entry.key ? 'var(--text-primary)' : 'transparent'}
                      strokeWidth={2}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Central Donut Value */}
          {visitorChartType === 'Pie' && visitorChartData.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {today.currently_inside}
              </div>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '3px' }}>
                Inside Now
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Visit details ({displayedRecords.length})
        </h4>
        {selectedCategory && (
          <button
            type="button"
            onClick={() => setSelectedCategory(undefined)}
            className="text-xs text-primary hover:underline"
          >
            Clear Filter ({selectedCategory})
          </button>
        )}
      </div>
      <div className="border rounded-lg overflow-hidden max-h-[400px] flex flex-col min-h-0">
        {isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : displayedRecords.length > 0 ? (
          <div className="overflow-auto min-h-0 flex-1">
            <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium" style={{ width: '12%' }}>Visitor</th>
                  <th className="text-left p-2 font-medium" style={{ width: '10%' }}>Category</th>
                  <th className="text-left p-2 font-medium" style={{ width: '14%' }}>Check-in</th>
                  <th className="text-left p-2 font-medium" style={{ width: '14%' }}>Check-out</th>
                  <th className="text-left p-2 font-medium" style={{ width: '10%' }}>Purpose</th>
                  <th className="text-left p-2 font-medium" style={{ width: '12%' }}>Created by</th>
                  <th className="text-left p-2 font-medium" style={{ width: '10%' }}>Host</th>
                  <th className="text-center p-2 font-medium" style={{ width: '10%' }}>Approved</th>
                  <th className="text-left p-2 font-medium" style={{ width: '8%' }}>Site</th>
                  <th className="text-center p-2 pr-4 font-medium" style={{ width: '%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedRecords.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-muted/20">
                    <td className="p-2 font-medium overflow-hidden" title={r.visitor_name ?? ''}>
                      <span className="block truncate">{r.visitor_name ?? '—'}</span>
                    </td>
                    <td className="p-2 overflow-hidden" title={r.category ?? r.visit_type ?? ''}>
                      <span className="block truncate">{r.category ?? r.visit_type ?? '—'}</span>
                    </td>
                    <td className="p-2 text-muted-foreground overflow-hidden">
                      <span className="block truncate">
                        {r.check_in ? new Date(r.check_in).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </span>
                    </td>
                    <td className="p-2 text-muted-foreground overflow-hidden">
                      <span className="block truncate">
                        {r.check_out ? new Date(r.check_out).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </span>
                    </td>
                    <td className="p-2 overflow-hidden" title={r.purpose ?? ''}>
                      <span className="block truncate">{r.purpose ?? '—'}</span>
                    </td>
                    <td className="p-2 text-muted-foreground overflow-hidden" title={r.created_by ?? ''}>
                      <span className="block truncate">{r.created_by ?? '—'}</span>
                    </td>
                    <td className="p-2 text-muted-foreground overflow-hidden" title={r.host_name ?? ''}>
                      <span className="block truncate">{r.host_name ?? '—'}</span>
                    </td>
                    <td className="p-2 text-center overflow-hidden">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-2xs px-1 py-0 inline-block max-w-full truncate',
                          r.approved === 'approved' && 'border-healthy text-healthy',
                          r.approved === 'rejected' && 'border-critical text-critical',
                          (r.approved === 'pending' || !r.approved) && 'border-warning text-warning'
                        )}
                        title={r.approved ?? ''}
                      >
                        {r.approved ?? '—'}
                      </Badge>
                    </td>
                    <td className="p-2 overflow-hidden" title={r.site_name ?? ''}>
                      {r.site_id && r.site_name ? (
                        <button
                          type="button"
                          className="text-left text-muted-foreground hover:text-primary hover:underline block w-full min-w-0 truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSlideOver('drill_site', { id: r.site_id, name: r.site_name });
                          }}
                          title={`View site: ${r.site_name}`}
                        >
                          {r.site_name}
                        </button>
                      ) : (
                        <span className="text-muted-foreground block truncate">{r.site_name ?? '—'}</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-2xs px-1 py-0',
                          r.status === 'inside' ? 'border-healthy text-healthy' : 'border-muted text-muted-foreground'
                        )}
                      >
                        {r.status === 'inside' ? 'Inside' : 'Out'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8 p-4">No visits in this period</p>
        )}
      </div>
    </div>
  );
}

export { PPMDrillPanel as SoftServicesDrillPanel };
