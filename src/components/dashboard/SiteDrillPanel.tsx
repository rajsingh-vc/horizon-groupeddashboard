import { useState, useMemo } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useSiteDrill, useWorkforceDrill, useAssetDrill, usePPMDrill } from '@/hooks/useGroupedDashboard';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { exportToXLSX } from '@/utils/exportData';
import { Download, RefreshCw, MapPin, AlertTriangle, X, ChevronRight, ChevronLeft, User, Check, XCircle, Wrench, ClipboardList, Activity } from 'lucide-react';
import { ThemeChartTooltip } from './DrillDownPanels';

const COLORS = {
  operational: '#22c55e',
  maintenance: '#f59e0b',
  critical: '#ef4444',
  offline: '#6b7280',
  healthy: '#22c55e',
  warning: '#f59e0b',
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
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-white" style={{ background: 'linear-gradient(90deg, #8f53a1 0%, #f47920 100%)', }} onClick={onExport}>
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

function StatCard({ label, value, color, onClick, active }: { label: string; value: string | number; color?: string; onClick?: () => void; active?: boolean }) {
  return (
    <div
      className={cn(
        'bg-muted/80 rounded-lg p-3 transition-all',
        onClick && 'cursor-pointer hover:bg-muted/60 hover:ring-2 hover:ring-primary/30',
        active && 'ring-2 ring-primary bg-primary/10'
      )}
      onClick={onClick}
    >
      <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
        {label}
        {onClick && <ChevronRight className="h-3 w-3" />}
      </div>
      <div className={cn('text-xl font-bold', color)}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{children}</h4>;
}

function FilterHeader({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3 p-2 bg-primary/10 rounded-md">
      <span className="text-sm font-medium text-primary">Showing: {label}</span>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClear}>
        <X className="h-3 w-3 mr-1" /> Clear
      </Button>
    </div>
  );
}

type TicketFilter = 'all' | 'pending' | 'breached' | 'within_sla';
type AssetFilter = 'all' | 'operational' | 'maintenance' | 'critical' | 'offline';
type WorkforceFilter = { type: 'vendor' | 'work_type'; value: string } | null;

const RECORDS_PER_PAGE = 10;

export function SiteDrillPanel() {
  const { filters, slideOver } = useDashboard();
  const siteData = slideOver.data as { id: number; name?: string } | null;
  const siteId = siteData?.id ?? null;

  const { data, isPending, dataUpdatedAt, refetch, isFetching } = useSiteDrill(filters, siteId);
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // Filter states for drill-down
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('all');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [ppmFilter, setPpmFilter] = useState<string | null>(null);
  const [workforceFilter, setWorkforceFilter] = useState<WorkforceFilter>(null);
  const [workforcePage, setWorkforcePage] = useState(1);
  type SiteChartType = 'Pie' | 'Vertical Bar' | 'Horizontal Bar';
  const [siteChartType, setSiteChartType] = useState<SiteChartType>('Pie');
  const [assetChartType, setAssetChartType] = useState<SiteChartType>('Pie');

  // Create modified filters with the current site_id for workforce drill
  const siteFilters = useMemo(() => ({
    ...filters,
    site_id: siteId?.toString() ?? null,
  }), [filters, siteId]);

  // Workforce drill data when filter is selected
  const workforceDrillParams = useMemo(() => {
    if (!workforceFilter) return {};
    return workforceFilter.type === 'vendor'
      ? { vendor: workforceFilter.value }
      : { work_type: workforceFilter.value };
  }, [workforceFilter]);

  const { data: workforceDrillData, isPending: isWorkforceDrillPending } = useWorkforceDrill(
    siteFilters,
    workforceDrillParams
  );

  // Paginated workforce records
  const paginatedWorkforceRecords = useMemo(() => {
    if (!workforceDrillData?.records) return [];
    const start = (workforcePage - 1) * RECORDS_PER_PAGE;
    return workforceDrillData.records.slice(start, start + RECORDS_PER_PAGE);
  }, [workforceDrillData?.records, workforcePage]);

  const totalWorkforcePages = useMemo(() => {
    if (!workforceDrillData?.records) return 0;
    return Math.ceil(workforceDrillData.records.length / RECORDS_PER_PAGE);
  }, [workforceDrillData?.records]);

  // Reset page when filter changes
  const handleWorkforceFilterChange = (filter: WorkforceFilter) => {
    setWorkforceFilter(filter);
    setWorkforcePage(1);
  };

  // Asset drill state and data
  const [assetPage, setAssetPage] = useState(1);

  const assetDrillParams = useMemo(() => {
    if (assetFilter === 'all') return {};
    return { status: assetFilter };
  }, [assetFilter]);

  const { data: assetDrillData, isPending: isAssetDrillPending } = useAssetDrill(
    siteFilters,
    assetDrillParams
  );

  // Paginated asset records
  const paginatedAssetRecords = useMemo(() => {
    if (!assetDrillData?.records) return [];
    const start = (assetPage - 1) * RECORDS_PER_PAGE;
    return assetDrillData.records.slice(start, start + RECORDS_PER_PAGE);
  }, [assetDrillData?.records, assetPage]);

  const totalAssetPages = useMemo(() => {
    if (!assetDrillData?.records) return 0;
    return Math.ceil(assetDrillData.records.length / RECORDS_PER_PAGE);
  }, [assetDrillData?.records]);

  // Reset page when asset filter changes
  const handleAssetFilterChange = (filter: AssetFilter) => {
    setAssetFilter(filter);
    setAssetPage(1);
  };

  // PPM drill state and data
  const [ppmPage, setPpmPage] = useState(1);
  const [ppmStatusFilter, setPpmStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const { data: ppmDrillData, isPending: isPPMDrillPending } = usePPMDrill(
    siteFilters,
    ppmFilter
  );

  // Get category data for fallback
  const selectedPPMCategory = useMemo(() => {
    if (!ppmFilter) return null;
    return data?.ppm.by_category.find(c => c.category === ppmFilter) ?? null;
  }, [ppmFilter, data?.ppm.by_category]);

  // Filtered PPM records by status (case-insensitive, treat various statuses as pending/completed)
  // Note: Backend uses "complete" (without 'd'), so we check for both
  const filteredPPMRecords = useMemo(() => {
    if (!ppmDrillData?.records) return [];
    if (ppmStatusFilter === 'all') return ppmDrillData.records;

    return ppmDrillData.records.filter(r => {
      const status = r.status?.toLowerCase() ?? '';
      if (ppmStatusFilter === 'completed') {
        // Backend uses "complete", frontend displays "completed"
        return status === 'complete' || status === 'completed' || status === 'done' || status === 'finished';
      }
      // Pending includes: pending, incomplete, in_progress, overdue, etc. (anything not completed)
      return status !== 'complete' && status !== 'completed' && status !== 'done' && status !== 'finished';
    });
  }, [ppmDrillData?.records, ppmStatusFilter]);

  // Paginated PPM records
  const paginatedPPMRecords = useMemo(() => {
    if (!filteredPPMRecords.length) return [];
    const start = (ppmPage - 1) * RECORDS_PER_PAGE;
    return filteredPPMRecords.slice(start, start + RECORDS_PER_PAGE);
  }, [filteredPPMRecords, ppmPage]);

  const totalPPMPages = useMemo(() => {
    if (!filteredPPMRecords.length) return 0;
    return Math.ceil(filteredPPMRecords.length / RECORDS_PER_PAGE);
  }, [filteredPPMRecords]);

  // Reset page when PPM filter changes
  const handlePPMFilterChange = (category: string | null) => {
    setPpmFilter(category);
    setPpmPage(1);
    setPpmStatusFilter('all');
  };

  // Reset page when PPM status filter changes
  const handlePPMStatusFilterChange = (status: 'all' | 'pending' | 'completed') => {
    setPpmStatusFilter(status);
    setPpmPage(1);
  };

  const handleExport = () => {
    if (!data) return;
    const base = `site_${(data.site.name || 'site').replace(/\s+/g, '_')}`;
    const arr = (x: unknown) => (Array.isArray(x) && x.length > 0 ? x : []) as Record<string, unknown>[];
    const summary = {
      site: data.site?.name,
      region: data.site?.region,
      health_score: data.summary?.health_score,
      sla_percentage: data.summary?.sla_percentage,
      ppm_percentage: data.summary?.ppm_percentage,
      workforce_percentage: data.summary?.workforce_percentage,
      open_tickets: data.summary?.open_tickets,
      pending_tickets: data.summary?.pending_tickets,
      breached_tickets: data.summary?.breached_tickets,
      total_assets: data.summary?.total_assets,
      total_staff: data.summary?.total_staff,
    };
    const sheets = [
      { name: 'Blocks', data: arr(data.blocks) },
      { name: 'Tickets', data: arr(data.tickets?.recent) },
      { name: 'Critical Assets', data: arr(data.assets?.critical_assets) },
      { name: 'Assets by Category', data: arr(data.assets?.by_category) },
      { name: 'PPM by Category', data: arr(data.ppm?.by_category) },
      { name: 'Workforce by Vendor', data: arr(data.workforce?.by_vendor) },
      { name: 'Workforce by Type', data: arr(data.workforce?.by_work_type) },
      { name: 'Vendors', data: arr(data.vendors) },
      { name: 'Asset Breakdown', data: arr(data.assets?.breakdown) },
    ];
    exportToXLSX({ summary, sheets, filename: base });
  };

  const assetBreakdownData = data?.assets.breakdown.map((b, i) => ({
    name: b.status.charAt(0).toUpperCase() + b.status.slice(1),
    value: b.count,
    fill: COLORS[b.status as keyof typeof COLORS] || '#6b7280',
  })) ?? [];

  const ppmCategoryData = data?.ppm.by_category ?? [];
  const workforceVendorData = data?.workforce.by_vendor ?? [];
  const workforceTypeData = data?.workforce.by_work_type ?? [];

  if (!siteId) return <p className="text-sm text-muted-foreground">No site selected</p>;
  if (isPending) return <Skeleton className="h-96" />;
  if (!data) return <p className="text-sm text-muted-foreground">Failed to load site data</p>;

  const getStatus = (pct: number) => (pct >= 85 ? 'healthy' : pct >= 70 ? 'warning' : 'critical');

  return (
    <div>
      <PanelHeader
        title={data.site.name}
        icon={MapPin}
        lastUpdated={lastUpdated}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExport={handleExport}
      />

      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <MapPin className="h-3.5 w-3.5" />
        <span>{data.site.region}</span>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full mb-4 text-white" style={{ background: 'linear-gradient(90deg, #8f53a1 0%, #f47920 100%)', }}>
          <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
          <TabsTrigger value="tickets" className="flex-1 text-xs">Tickets</TabsTrigger>
          <TabsTrigger value="assets" className="flex-1 text-xs">Assets</TabsTrigger>
          <TabsTrigger value="ppm" className="flex-1 text-xs">PPM</TabsTrigger>
          <TabsTrigger value="workforce" className="flex-1 text-xs">Workforce</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <SectionTitle>Key Metrics</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Health Score" value={`${data.summary.health_score}%`} color={getStatus(data.summary.health_score) === 'healthy' ? 'text-healthy' : getStatus(data.summary.health_score) === 'warning' ? 'text-warning' : 'text-critical'} />
            <StatCard label="SLA %" value={`${data.summary.sla_percentage}%`} color={getStatus(data.summary.sla_percentage) === 'healthy' ? 'text-healthy' : getStatus(data.summary.sla_percentage) === 'warning' ? 'text-warning' : 'text-critical'} />
            <StatCard label="PPM %" value={`${data.summary.ppm_percentage}%`} color={getStatus(data.summary.ppm_percentage) === 'healthy' ? 'text-healthy' : getStatus(data.summary.ppm_percentage) === 'warning' ? 'text-warning' : 'text-critical'} />
            <StatCard label="Workforce %" value={`${data.summary.workforce_percentage}%`} color={getStatus(data.summary.workforce_percentage) === 'healthy' ? 'text-healthy' : getStatus(data.summary.workforce_percentage) === 'warning' ? 'text-warning' : 'text-critical'} />
            <StatCard label="Pending Tickets" value={data.summary.pending_tickets} />
            <StatCard label="Breached" value={data.summary.breached_tickets} color="text-critical" />
            <StatCard label="Total Assets" value={data.summary.total_assets} />
            <StatCard label="Total Staff" value={data.summary.total_staff} />
          </div>

          {/* Site Operational Health & Adherence Breakdown Box */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground tracking-wide uppercase">
                  Site Operations & Adherence Breakdown
                </h4>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <div className="flex items-center gap-0.5 bg-muted/80 p-0.5 rounded-lg border border-border">
                  {(['Pie', 'Vertical Bar', 'Horizontal Bar'] as SiteChartType[]).map((type) => {
                    const isSelected = siteChartType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSiteChartType(type)}
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
                <span className="text-2xs font-bold px-2.5 py-0.5 rounded-full bg-healthy/10 text-healthy border border-healthy/30">
                  Health: {data.summary.health_score}%
                </span>
              </div>
            </div>

            <div style={{ height: '200px', width: '100%', position: 'relative' }}>
              {siteChartType === 'Pie' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ThemeChartTooltip />} />
                    <Pie
                      data={[
                        { name: 'Health Score', shortName: 'Health', count: data.summary.health_score, fill: '#00C853' },
                        { name: 'SLA Adherence', shortName: 'SLA', count: data.summary.sla_percentage, fill: '#FF5B22' },
                        { name: 'PPM Compliance', shortName: 'PPM', count: data.summary.ppm_percentage, fill: '#3B82F6' },
                        { name: 'Workforce Availability', shortName: 'Workforce', count: data.summary.workforce_percentage, fill: '#8B5CF6' },
                      ]}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {[
                        { fill: '#00C853' },
                        { fill: '#FF5B22' },
                        { fill: '#3B82F6' },
                        { fill: '#8B5CF6' },
                      ].map((entry, index) => (
                        <Cell key={`site-pie-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : siteChartType === 'Vertical Bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Health Score', shortName: 'Health', count: data.summary.health_score, fill: '#00C853' },
                      { name: 'SLA Adherence', shortName: 'SLA', count: data.summary.sla_percentage, fill: '#FF5B22' },
                      { name: 'PPM Compliance', shortName: 'PPM', count: data.summary.ppm_percentage, fill: '#3B82F6' },
                      { name: 'Workforce Availability', shortName: 'Workforce', count: data.summary.workforce_percentage, fill: '#8B5CF6' },
                    ]}
                    margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="shortName" fontSize={11} stroke="var(--text-muted)" />
                    <YAxis fontSize={11} stroke="var(--text-muted)" domain={[0, 100]} />
                    <Tooltip content={<ThemeChartTooltip />} />
                    <Bar dataKey="count" name="Score %" radius={[5, 5, 0, 0]} barSize={36}>
                      {[
                        { fill: '#00C853' },
                        { fill: '#FF5B22' },
                        { fill: '#3B82F6' },
                        { fill: '#8B5CF6' },
                      ].map((entry, index) => (
                        <Cell key={`site-vbar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Health Score', shortName: 'Health', count: data.summary.health_score, fill: '#00C853' },
                      { name: 'SLA Adherence', shortName: 'SLA', count: data.summary.sla_percentage, fill: '#FF5B22' },
                      { name: 'PPM Compliance', shortName: 'PPM', count: data.summary.ppm_percentage, fill: '#3B82F6' },
                      { name: 'Workforce Availability', shortName: 'Workforce', count: data.summary.workforce_percentage, fill: '#8B5CF6' },
                    ]}
                    layout="vertical"
                    margin={{ top: 10, right: 25, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                    <XAxis type="number" fontSize={11} stroke="var(--text-muted)" domain={[0, 100]} />
                    <YAxis type="category" dataKey="shortName" fontSize={11} stroke="var(--text-muted)" width={75} />
                    <Tooltip content={<ThemeChartTooltip />} />
                    <Bar dataKey="count" name="Score %" radius={[0, 5, 5, 0]} barSize={20}>
                      {[
                        { fill: '#00C853' },
                        { fill: '#FF5B22' },
                        { fill: '#3B82F6' },
                        { fill: '#8B5CF6' },
                      ].map((entry, index) => (
                        <Cell key={`site-hbar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {siteChartType === 'Pie' && (
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
                    {data.summary.health_score}%
                  </div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '3px' }}>
                    Overall Health
                  </div>
                </div>
              )}
            </div>
          </div>

          <SectionTitle>Blocks</SectionTitle>
          {data.blocks.length > 0 ? (
            <div className="space-y-2">
              {data.blocks.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                  <div>
                    <div className="text-sm font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.floor_count} levels · {b.units_count} units</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No blocks</p>
          )}

          {data.vendors.length > 0 && (
            <>
              <SectionTitle>Vendors ({data.vendors.length})</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {data.vendors.slice(0, 10).map((v) => (
                  <Badge key={v.id} variant="outline" className="text-xs">
                    {v.name}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <StatCard
              label="Total"
              value={data.tickets.summary.total}
              onClick={() => setTicketFilter('all')}
              active={ticketFilter === 'all'}
            />
            <StatCard
              label="Pending"
              value={data.tickets.summary.pending}
              color="text-warning"
              onClick={() => setTicketFilter(ticketFilter === 'pending' ? 'all' : 'pending')}
              active={ticketFilter === 'pending'}
            />
            <StatCard
              label="Breached"
              value={data.tickets.summary.breached}
              color="text-critical"
              onClick={() => setTicketFilter(ticketFilter === 'breached' ? 'all' : 'breached')}
              active={ticketFilter === 'breached'}
            />
            <StatCard
              label="SLA %"
              value={`${data.tickets.summary.sla_percentage}%`}
              onClick={() => setTicketFilter(ticketFilter === 'within_sla' ? 'all' : 'within_sla')}
              active={ticketFilter === 'within_sla'}
            />
          </div>

          {ticketFilter !== 'all' && (
            <FilterHeader
              label={ticketFilter === 'pending' ? 'Pending Tickets' : ticketFilter === 'breached' ? 'Breached Tickets' : 'Within SLA'}
              onClear={() => setTicketFilter('all')}
            />
          )}

          <SectionTitle>
            {ticketFilter === 'all' ? 'Recent Tickets' : `${ticketFilter === 'pending' ? 'Pending' : ticketFilter === 'breached' ? 'Breached' : 'Within SLA'} Tickets`}
          </SectionTitle>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {data.tickets.recent
              .filter((t) => {
                if (ticketFilter === 'all') return true;
                if (ticketFilter === 'pending') return t.status === 'Pending' || t.sla_status === 'At Risk';
                if (ticketFilter === 'breached') return t.sla_status === 'Breached';
                if (ticketFilter === 'within_sla') return t.sla_status === 'Within SLA';
                return true;
              })
              .map((t) => (
                <div key={t.id} className="flex items-start justify-between p-2 border rounded-md hover:bg-muted/30 cursor-pointer transition-colors">
                  <div>
                    <div className="text-xs font-mono text-muted-foreground">{t.ticket_number}</div>
                    <div className="text-sm font-medium truncate">{t.heading}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.category ?? '—'} · {new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <Badge variant="outline" className={cn('text-2xs shrink-0',
                    t.sla_status === 'Breached' && 'border-critical text-critical',
                    t.sla_status === 'At Risk' && 'border-warning text-warning',
                    t.sla_status === 'Within SLA' && 'border-healthy text-healthy',
                  )}>
                    {t.sla_status}
                  </Badge>
                </div>
              ))}
            {data.tickets.recent.filter((t) => {
              if (ticketFilter === 'all') return true;
              if (ticketFilter === 'pending') return t.status === 'Pending' || t.sla_status === 'At Risk';
              if (ticketFilter === 'breached') return t.sla_status === 'Breached';
              if (ticketFilter === 'within_sla') return t.sla_status === 'Within SLA';
              return true;
            }).length === 0 && <p className="text-xs text-muted-foreground">No tickets found</p>}
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Total"
              value={data.assets.summary.total}
              onClick={() => handleAssetFilterChange('all')}
              active={assetFilter === 'all'}
            />
            <StatCard
              label="Health %"
              value={`${data.assets.summary.health_percentage}%`}
            />
            <StatCard
              label="Operational"
              value={data.assets.summary.operational}
              color="text-healthy"
              onClick={() => handleAssetFilterChange(assetFilter === 'operational' ? 'all' : 'operational')}
              active={assetFilter === 'operational'}
            />
            <StatCard
              label="Breakdown"
              value={data.assets.summary.maintenance}
              color="text-warning"
              onClick={() => handleAssetFilterChange(assetFilter === 'maintenance' ? 'all' : 'maintenance')}
              active={assetFilter === 'maintenance'}
            />
            <StatCard
              label="Critical"
              value={data.assets.summary.critical}
              color="text-critical"
              onClick={() => handleAssetFilterChange(assetFilter === 'critical' ? 'all' : 'critical')}
              active={assetFilter === 'critical'}
            />
            <StatCard
              label="Offline"
              value={data.assets.summary.offline}
              onClick={() => handleAssetFilterChange(assetFilter === 'offline' ? 'all' : 'offline')}
              active={assetFilter === 'offline'}
            />
          </div>

          {assetFilter !== 'all' && (
            <FilterHeader
              label={`${assetFilter === 'maintenance' ? 'Breakdown' : (assetFilter.charAt(0).toUpperCase() + assetFilter.slice(1))} Assets`}
              onClear={() => handleAssetFilterChange('all')}
            />
          )}

          {assetFilter !== 'all' ? (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-xl font-bold">{assetDrillData?.total ?? data.assets.breakdown.find(b => b.status === assetFilter)?.count ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Total {assetFilter === 'maintenance' ? 'Breakdown' : assetFilter}</div>
                </div>
                <div className="text-center">
                  <div className={cn('text-xl font-bold',
                    assetFilter === 'operational' ? 'text-healthy' :
                      assetFilter === 'maintenance' ? 'text-warning' :
                        assetFilter === 'critical' ? 'text-critical' : 'text-muted-foreground'
                  )}>
                    {assetFilter === 'maintenance' ? 'Breakdown' : (assetFilter.charAt(0).toUpperCase() + assetFilter.slice(1))}
                  </div>
                  <div className="text-xs text-muted-foreground">Status</div>
                </div>
              </div>

              {/* Records list */}
              <SectionTitle>
                Asset Details ({assetDrillData?.records?.length ?? 0} records)
              </SectionTitle>

              {isAssetDrillPending ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                  ))}
                </div>
              ) : paginatedAssetRecords.length > 0 ? (
                <div className="space-y-2">
                  {paginatedAssetRecords.map((record) => (
                    <div
                      key={record.id}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-md hover:bg-muted/30 transition-colors",
                        record.critical && "border-critical/30 bg-critical/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          assetFilter === 'operational' ? 'bg-healthy/20' :
                            assetFilter === 'maintenance' ? 'bg-warning/20' :
                              assetFilter === 'critical' ? 'bg-critical/20' : 'bg-muted'
                        )}>
                          <Wrench className={cn('h-4 w-4',
                            assetFilter === 'operational' ? 'text-healthy' :
                              assetFilter === 'maintenance' ? 'text-warning' :
                                assetFilter === 'critical' ? 'text-critical' : 'text-muted-foreground'
                          )} />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{record.name}</div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-mono">{record.asset_number}</span>
                            {record.category && <span> · {record.category}</span>}
                          </div>
                          {record.location && (
                            <div className="text-xs text-muted-foreground">{record.location}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-2xs',
                            assetFilter === 'operational' ? 'border-healthy text-healthy' :
                              assetFilter === 'maintenance' ? 'border-warning text-warning' :
                                assetFilter === 'critical' ? 'border-critical text-critical' :
                                  'border-muted-foreground text-muted-foreground'
                          )}
                        >
                          {record.status}
                        </Badge>
                        {record.critical && <AlertTriangle className="h-4 w-4 text-critical" />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No {assetFilter} assets found</p>
              )}

              {/* Pagination */}
              {totalAssetPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    Page {assetPage} of {totalAssetPages}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setAssetPage(p => Math.max(1, p - 1))}
                      disabled={assetPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalAssetPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalAssetPages <= 5) {
                          pageNum = i + 1;
                        } else if (assetPage <= 3) {
                          pageNum = i + 1;
                        } else if (assetPage >= totalAssetPages - 2) {
                          pageNum = totalAssetPages - 4 + i;
                        } else {
                          pageNum = assetPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={assetPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 w-7 p-0 text-xs"
                            onClick={() => setAssetPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setAssetPage(p => Math.min(totalAssetPages, p + 1))}
                      disabled={assetPage === totalAssetPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {assetBreakdownData.filter((d) => d.value > 0).length > 0 && (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <SectionTitle>Status Distribution</SectionTitle>
                    <div className="flex items-center gap-0.5 bg-muted/80 p-0.5 rounded-lg border border-border">
                      {(['Pie', 'Vertical Bar', 'Horizontal Bar'] as SiteChartType[]).map((type) => {
                        const isSelected = assetChartType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setAssetChartType(type)}
                            className={cn(
                              'px-2 py-0.5 text-2xs font-bold rounded-md transition-all cursor-pointer',
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
                  </div>
                  <div style={{ height: '170px', width: '100%', position: 'relative' }}>
                    {assetChartType === 'Pie' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<ThemeChartTooltip />} />
                          <Pie
                            data={assetBreakdownData.filter((d) => d.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={68}
                            paddingAngle={2}
                          >
                            {assetBreakdownData.filter((d) => d.value > 0).map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : assetChartType === 'Vertical Bar' ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={assetBreakdownData.filter((d) => d.value > 0)} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                          <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                          <Tooltip content={<ThemeChartTooltip />} />
                          <Bar dataKey="value" name="Assets" radius={[4, 4, 0, 0]} barSize={32}>
                            {assetBreakdownData.filter((d) => d.value > 0).map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={assetBreakdownData.filter((d) => d.value > 0)} layout="vertical" margin={{ top: 5, right: 25, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                          <XAxis type="number" fontSize={10} stroke="var(--text-muted)" />
                          <YAxis type="category" dataKey="name" fontSize={10} stroke="var(--text-muted)" width={85} />
                          <Tooltip content={<ThemeChartTooltip />} />
                          <Bar dataKey="value" name="Assets" radius={[0, 4, 4, 0]} barSize={18}>
                            {assetBreakdownData.filter((d) => d.value > 0).map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </>
              )}
              {data.assets.by_category.length > 0 && (
                <>
                  <SectionTitle>By Category</SectionTitle>
                  <div className="space-y-1.5">
                    {data.assets.by_category.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{c.category}</span>
                        <span className="font-medium">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {data.assets.critical_assets.length > 0 && (
                <>
                  <SectionTitle>Critical Assets</SectionTitle>
                  <div className="space-y-2">
                    {data.assets.critical_assets.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-2 bg-critical/10 rounded-md cursor-pointer hover:bg-critical/20 transition-colors">
                        <div>
                          <div className="text-xs font-mono">{a.asset_number}</div>
                          <div className="text-sm font-medium">{a.name}</div>
                          <div className="text-xs text-muted-foreground">{a.location} · {a.category ?? '—'}</div>
                        </div>
                        <AlertTriangle className="h-4 w-4 text-critical shrink-0" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="ppm" className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              label="Total"
              value={data.ppm.total}
              onClick={() => handlePPMFilterChange(null)}
              active={ppmFilter === null}
            />
            <StatCard
              label="Completed"
              value={data.ppm.completed}
              color="text-healthy"
            />
            <StatCard
              label="Completion %"
              value={`${data.ppm.percentage}%`}
            />
          </div>

          {ppmFilter && (
            <FilterHeader
              label={`${ppmFilter} PPM Tasks`}
              onClear={() => handlePPMFilterChange(null)}
            />
          )}

          {ppmCategoryData.length > 0 && (
            <>
              <SectionTitle>PPM by Category {!ppmFilter && '(Click to drill down)'}</SectionTitle>
              {ppmFilter ? (
                <div className="space-y-4">
                  {/* Summary stats with clickable pending/completed */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    {(() => {
                      const category = ppmCategoryData.find(c => c.category === ppmFilter);
                      // Use API data if available, otherwise fall back to category data
                      const total = (ppmDrillData?.total && ppmDrillData.total > 0) ? ppmDrillData.total : category?.total ?? 0;
                      const completed = (ppmDrillData?.completed !== undefined && ppmDrillData.total && ppmDrillData.total > 0) ? ppmDrillData.completed : category?.completed ?? 0;
                      const pending = total - completed;
                      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                      // Check if API returned records
                      const hasRecords = (ppmDrillData?.records?.length ?? 0) > 0;
                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-4 gap-2">
                            <div
                              className={cn(
                                "text-center p-2 rounded-md transition-all cursor-pointer hover:bg-muted/50",
                                ppmStatusFilter === 'all' && "ring-2 ring-primary bg-primary/10"
                              )}
                              onClick={() => handlePPMStatusFilterChange('all')}
                            >
                              <div className="text-xl font-bold">{total}</div>
                              <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                            <div
                              className={cn(
                                "text-center p-2 rounded-md transition-all cursor-pointer hover:bg-muted/50",
                                ppmStatusFilter === 'completed' && "ring-2 ring-healthy bg-healthy/10"
                              )}
                              onClick={() => handlePPMStatusFilterChange('completed')}
                            >
                              <div className="text-xl font-bold text-healthy">{completed}</div>
                              <div className="text-xs text-muted-foreground">Completed</div>
                            </div>
                            <div
                              className={cn(
                                "text-center p-2 rounded-md transition-all cursor-pointer hover:bg-muted/50",
                                ppmStatusFilter === 'pending' && "ring-2 ring-warning bg-warning/10"
                              )}
                              onClick={() => handlePPMStatusFilterChange('pending')}
                            >
                              <div className="text-xl font-bold text-warning">{pending}</div>
                              <div className="text-xs text-muted-foreground">Pending</div>
                            </div>
                            <div className="text-center p-2">
                              <div className={cn('text-xl font-bold', percentage >= 85 ? 'text-healthy' : percentage >= 70 ? 'text-warning' : 'text-critical')}>
                                {percentage}%
                              </div>
                              <div className="text-xs text-muted-foreground">Rate</div>
                            </div>
                          </div>
                          {!hasRecords && total > 0 && (
                            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                              Task details not available from API. Showing summary from category data.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Status filter indicator */}
                  {ppmStatusFilter !== 'all' && (
                    <div className="flex items-center justify-between p-2 bg-primary/5 rounded-md">
                      <span className="text-sm font-medium">
                        Showing: <span className={ppmStatusFilter === 'completed' ? 'text-healthy' : 'text-warning'}>{ppmStatusFilter.charAt(0).toUpperCase() + ppmStatusFilter.slice(1)}</span> Tasks ({filteredPPMRecords.length})
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => handlePPMStatusFilterChange('all')}>
                        <X className="h-3 w-3 mr-1" /> Show All
                      </Button>
                    </div>
                  )}

                  {/* Records list */}
                  <SectionTitle>
                    Task Details ({filteredPPMRecords.length} records)
                  </SectionTitle>

                  {isPPMDrillPending ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-md" />
                      ))}
                    </div>
                  ) : paginatedPPMRecords.length > 0 ? (
                    <div className="space-y-2">
                      {paginatedPPMRecords.map((record) => (
                        <div
                          key={record.id}
                          className={cn(
                            "p-3 border rounded-md hover:bg-muted/30 transition-colors",
                            (record.status === 'complete' || record.status === 'completed') && "border-healthy/30 bg-healthy/5",
                            record.status === 'pending' && "border-warning/30 bg-warning/5",
                            record.status === 'overdue' && "border-critical/30 bg-critical/5"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center',
                                (record.status === 'complete' || record.status === 'completed') ? 'bg-healthy/20' :
                                  record.status === 'pending' ? 'bg-warning/20' :
                                    record.status === 'overdue' ? 'bg-critical/20' : 'bg-muted'
                              )}>
                                <ClipboardList className={cn('h-4 w-4',
                                  (record.status === 'complete' || record.status === 'completed') ? 'text-healthy' :
                                    record.status === 'pending' ? 'text-warning' :
                                      record.status === 'overdue' ? 'text-critical' : 'text-muted-foreground'
                                )} />
                              </div>
                              <div>
                                <div className="text-sm font-medium">{record.asset_name ?? `Asset #${record.asset_id}`}</div>
                                <div className="text-xs text-muted-foreground">
                                  {record.asset_number && <span className="font-mono">{record.asset_number} · </span>}
                                  {record.category}
                                </div>
                                <div className="text-xs text-muted-foreground">{record.location}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-2xs',
                                  (record.status === 'complete' || record.status === 'completed') ? 'border-healthy text-healthy' :
                                    record.status === 'pending' ? 'border-warning text-warning' :
                                      record.status === 'overdue' ? 'border-critical text-critical' :
                                        'border-muted-foreground text-muted-foreground'
                                )}
                              >
                                {record.status === 'complete' ? 'completed' : record.status}
                              </Badge>
                              {record.start_time && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {new Date(record.start_time).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    (() => {
                      // Show fallback message when API has no records but category has count
                      const categoryTotal = selectedPPMCategory?.total ?? 0;
                      if (categoryTotal > 0 && (ppmDrillData?.records?.length ?? 0) === 0) {
                        const categoryCompleted = selectedPPMCategory?.completed ?? 0;
                        const categoryPending = categoryTotal - categoryCompleted;
                        return (
                          <div className="p-4 bg-muted/30 rounded-lg text-center space-y-3">
                            <div className="text-sm text-muted-foreground">
                              Task records not available via API.
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">{categoryTotal} total tasks</span> in this category:
                            </div>
                            <div className="flex justify-center gap-6">
                              <div>
                                <span className="text-healthy font-bold">{categoryCompleted}</span>
                                <span className="text-xs text-muted-foreground ml-1">completed</span>
                              </div>
                              <div>
                                <span className="text-warning font-bold">{categoryPending}</span>
                                <span className="text-xs text-muted-foreground ml-1">pending</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return <p className="text-xs text-muted-foreground text-center py-4">No tasks found in this category</p>;
                    })()
                  )}

                  {/* Pagination */}
                  {totalPPMPages > 1 && (
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        Page {ppmPage} of {totalPPMPages}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setPpmPage(p => Math.max(1, p - 1))}
                          disabled={ppmPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPPMPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPPMPages <= 5) {
                              pageNum = i + 1;
                            } else if (ppmPage <= 3) {
                              pageNum = i + 1;
                            } else if (ppmPage >= totalPPMPages - 2) {
                              pageNum = totalPPMPages - 4 + i;
                            } else {
                              pageNum = ppmPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={ppmPage === pageNum ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 w-7 p-0 text-xs"
                                onClick={() => setPpmPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setPpmPage(p => Math.min(totalPPMPages, p + 1))}
                          disabled={ppmPage === totalPPMPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {ppmCategoryData.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handlePPMFilterChange(c.category)}
                    >
                      <span className="text-sm">{c.category}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-medium', c.percentage >= 85 ? 'text-healthy' : c.percentage >= 70 ? 'text-warning' : 'text-critical')}>
                          {c.percentage}%
                        </span>
                        <span className="text-xs text-muted-foreground">({c.completed}/{c.total})</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="workforce" className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              label="Total"
              value={data.workforce.total}
              onClick={() => setWorkforceFilter(null)}
              active={workforceFilter === null}
            />
            <StatCard
              label="Present Today"
              value={data.workforce.present}
              color="text-healthy"
            />
            <StatCard
              label="Availability %"
              value={`${data.workforce.percentage}%`}
            />
          </div>

          {workforceFilter && (
            <FilterHeader
              label={`${workforceFilter.type === 'vendor' ? 'Vendor' : 'Work Type'}: ${workforceFilter.value}`}
              onClear={() => handleWorkforceFilterChange(null)}
            />
          )}

          {workforceFilter ? (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-xl font-bold">{workforceDrillData?.total ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-healthy">{workforceDrillData?.present ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-critical">{workforceDrillData?.absent ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Absent</div>
                </div>
              </div>

              {/* Records list */}
              <SectionTitle>
                Staff Details ({workforceDrillData?.records?.length ?? 0} records)
              </SectionTitle>

              {isWorkforceDrillPending ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                  ))}
                </div>
              ) : paginatedWorkforceRecords.length > 0 ? (
                <div className="space-y-2">
                  {paginatedWorkforceRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          record.present_today ? 'bg-healthy/20' : 'bg-muted'
                        )}>
                          <User className={cn('h-4 w-4', record.present_today ? 'text-healthy' : 'text-muted-foreground')} />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{record.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {record.employee_no && <span className="font-mono">{record.employee_no} · </span>}
                            {record.work_type}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-2xs',
                            record.present_today
                              ? 'border-healthy text-healthy'
                              : 'border-muted-foreground text-muted-foreground'
                          )}
                        >
                          {record.present_today ? (
                            <><Check className="h-3 w-3 mr-1" /> Present</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Absent</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No records found</p>
              )}

              {/* Pagination */}
              {totalWorkforcePages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    Page {workforcePage} of {totalWorkforcePages}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setWorkforcePage(p => Math.max(1, p - 1))}
                      disabled={workforcePage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalWorkforcePages) }, (_, i) => {
                        let pageNum: number;
                        if (totalWorkforcePages <= 5) {
                          pageNum = i + 1;
                        } else if (workforcePage <= 3) {
                          pageNum = i + 1;
                        } else if (workforcePage >= totalWorkforcePages - 2) {
                          pageNum = totalWorkforcePages - 4 + i;
                        } else {
                          pageNum = workforcePage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={workforcePage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 w-7 p-0 text-xs"
                            onClick={() => setWorkforcePage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setWorkforcePage(p => Math.min(totalWorkforcePages, p + 1))}
                      disabled={workforcePage === totalWorkforcePages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {workforceVendorData.length > 0 && (
                <>
                  <SectionTitle>By Vendor (Click to drill down)</SectionTitle>
                  <div className="space-y-1.5">
                    {workforceVendorData.map((v, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleWorkforceFilterChange({ type: 'vendor', value: v.vendor })}
                      >
                        <span className="text-sm">{v.vendor}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{v.count}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {workforceTypeData.length > 0 && (
                <>
                  <SectionTitle>By Work Type (Click to drill down)</SectionTitle>
                  <div className="space-y-1.5">
                    {workforceTypeData.map((w, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleWorkforceFilterChange({ type: 'work_type', value: w.work_type })}
                      >
                        <span className="text-sm">{w.work_type}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{w.count}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}