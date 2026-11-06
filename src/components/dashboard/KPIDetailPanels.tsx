import { useState, useMemo } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import {
  useServiceDesk,
  useAssetPortfolio,
  usePPMOperations,
  useWorkforce,
  useVisitorsDetail,
  useCompliance,
  useDashboardKPIs,
} from '@/hooks/useGroupedDashboard';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, CartesianGrid,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { exportToCSV, exportToXLSX } from '@/utils/exportData';
import {
  Download, RefreshCw, ChevronRight, ChevronDown, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle2, Clock, Users, Wrench, ClipboardCheck,
  Building2, UserCheck, Ticket,
} from 'lucide-react';

const COLORS = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  info: '#3b82f6',
  neutral: '#6b7280',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
};

const PIE_PALETTE = [COLORS.healthy, COLORS.warning, COLORS.critical, COLORS.info, COLORS.purple, COLORS.cyan, COLORS.neutral];

function PanelHeader({
  title,
  icon: Icon,
  lastUpdated,
  onRefresh,
  isRefreshing,
  onExport,
  exportLabel = 'Export CSV',
}: {
  title: string;
  icon: React.ElementType;
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onExport?: () => void;
  exportLabel?: string;
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
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {onExport && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onExport}>
            <Download className="h-3 w-3" />
            {exportLabel}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className={cn('text-xl font-bold', color)}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function TrendBadge({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const isGood = inverse ? value <= 0 : value >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', isGood ? 'text-healthy' : 'text-critical')}>
      {value > 0 ? <TrendingUp className="h-3 w-3" /> : value < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{children}</h4>;
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="wave-dots-container">
        <span className="wave-dot" style={{ width: '10px', height: '10px' }} />
        <span className="wave-dot" style={{ width: '10px', height: '10px' }} />
        <span className="wave-dot" style={{ width: '10px', height: '10px' }} />
      </div>
      <span className="text-xs text-muted-foreground font-medium">Loading details...</span>
    </div>
  );
}

// ─── TICKET SLA HEALTH PANEL ────────────────────────────────────────────────

export function TicketSLAPanel() {
  const { filters } = useDashboard();
  const { data, isPending, dataUpdatedAt, refetch, isFetching } = useServiceDesk(filters);
  const [drillRow, setDrillRow] = useState<Record<string, unknown> | null>(null);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const handleExport = () => {
    if (!data) return;
    const tickets = data.priority_tickets.map((t, idx) => ({
      'S.No': idx + 1,
      'Ticket Number': t.ticket_number,
      'Issue Description': t.heading,
      'Category': t.category || 'General',
      'Priority': t.priority,
      'SLA Status': t.sla_status,
      'Resolution Status': t.status,
      'Created Timestamp': t.created_at,
    }));
    exportToXLSX({
      summary: {
        'Report Name': 'Service Desk SLA Health Telemetry',
        'Total Requests': data.summary.total,
        'Within SLA': data.sla_status.within_sla,
        'At Risk': data.sla_status.at_risk,
        'Breached': data.sla_status.breached,
        'SLA Percentage': `${data.sla_status.sla_percentage}%`,
        'Open Requests': data.summary.open,
        'Resolved Requests': data.summary.resolved,
        'Exported At': new Date().toLocaleString(),
      },
      sheets: [{ name: 'Service Requests', data: tickets }],
      filename: 'service_requests_sla_health',
    });
  };

  const statusData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Open', value: data.summary.open, color: COLORS.critical },
      { name: 'In Progress', value: data.summary.in_progress, color: COLORS.info },
      { name: 'Pending', value: data.summary.pending, color: COLORS.warning },
      { name: 'Resolved', value: data.summary.resolved, color: COLORS.healthy },
      { name: 'Closed', value: data.summary.closed, color: COLORS.neutral },
    ].filter(d => d.value > 0);
  }, [data]);

  const slaData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Within SLA', value: data.sla_status.within_sla, color: COLORS.healthy },
      { name: 'At Risk', value: data.sla_status.at_risk, color: COLORS.warning },
      { name: 'Breached', value: data.sla_status.breached, color: COLORS.critical },
    ].filter(d => d.value > 0);
  }, [data]);

  const categoryData = useMemo(() => data?.tickets_by_category ?? [], [data]);

  if (isPending) return <LoadingState />;

  return (
    <div>
      <PanelHeader
        title="Ticket TAT Health"
        icon={Ticket}
        lastUpdated={lastUpdated}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExport={handleExport}
      />

      {drillRow ? (
        <DrillDownTicket ticket={drillRow} onBack={() => setDrillRow(null)} />
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="w-full mb-4 text-white" style={{ background: 'linear-gradient(90deg, #8f53a1 0%, #f47920 100%)', }}>
            <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="sla" className="flex-1 text-xs">TAT Breakdown</TabsTrigger>
            <TabsTrigger value="category" className="flex-1 text-xs">By Category</TabsTrigger>
            <TabsTrigger value="tickets" className="flex-1 text-xs">Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Total Tickets" value={data!.summary.total} />
              <StatCard label="TAT %" value={`${data!.sla_status.sla_percentage}%`} color={data!.sla_status.sla_percentage >= 85 ? 'text-healthy' : 'text-critical'} />
              <StatCard label="Avg Resolution" value={`${data!.avg_resolution_time_hours}h`} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Open" value={data!.summary.open} color="text-critical" />
              <StatCard label="In Progress" value={data!.summary.in_progress} color="text-info" />
              <StatCard label="Resolved" value={data!.summary.resolved} color="text-healthy" />
            </div>

            <SectionTitle>Status Distribution</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="sla" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Within SLA" value={data!.sla_status.within_sla} color="text-healthy" />
              <StatCard label="At Risk" value={data!.sla_status.at_risk} color="text-warning" />
              <StatCard label="Breached" value={data!.sla_status.breached} color="text-critical" />
            </div>

            <SectionTitle>SLA Status Distribution</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={slaData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {slaData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <SectionTitle>SLA Trend vs Last Period</SectionTitle>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <div className="text-2xl font-bold">{data!.sla_status.sla_percentage}%</div>
              <div className="text-xs text-muted-foreground mt-1">Current SLA Compliance</div>
            </div>
          </TabsContent>

          <TabsContent value="category" className="space-y-4">
            <SectionTitle>Tickets by Category</SectionTitle>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(categoryData.length * 36, 150)}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.info} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No category data</p>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="text-white" style={{ background: 'linear-gradient(90deg, #8f53a1 0%, #f47920 100%)', }}>
                  <tr>
                    <th className="text-left p-2 font-medium">Category</th>
                    <th className="text-center p-2 font-medium">Count</th>
                    <th className="text-right p-2 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((row, i) => (
                    <tr key={i} className="border-t hover:bg-muted/20">
                      <td className="p-2">{row.category}</td>
                      <td className="p-2 text-center font-medium">{row.count}</td>
                      <td className="p-2 text-right text-muted-foreground">
                        {data!.summary.total > 0 ? ((row.count / data!.summary.total) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <SectionTitle>Priority Tickets</SectionTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleExport}>
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>
            <div className="space-y-2">
              {data!.priority_tickets.map((t, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setDrillRow(t as unknown as Record<string, unknown>)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                      <Badge variant="outline" className={cn('text-2xs px-1 py-0',
                        t.priority === 'critical' && 'border-critical text-critical',
                        t.priority === 'high' && 'border-warning text-warning',
                      )}>
                        {t.priority}
                      </Badge>
                    </div>
                    <div className="text-xs font-medium truncate">{t.heading}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.status} · {new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <Badge className={cn('text-2xs',
                      t.sla_status === 'Breached' && 'bg-critical/10 text-critical border border-critical/30',
                      t.sla_status === 'At Risk' && 'bg-warning/10 text-warning border border-warning/30',
                      t.sla_status === 'Within SLA' && 'bg-healthy/10 text-healthy border border-healthy/30',
                    )}>
                      {t.sla_status}
                    </Badge>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              ))}
              {data!.priority_tickets.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No priority tickets</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function DrillDownTicket({ ticket, onBack }: { ticket: Record<string, unknown>; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ChevronDown className="h-3 w-3 rotate-90" /> Back to list
      </button>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-mono text-muted-foreground">{String(ticket.ticket_number ?? '')}</div>
            <div className="text-sm font-semibold mt-0.5">{String(ticket.heading ?? '')}</div>
          </div>
          <Badge className={cn('text-xs',
            ticket.sla_status === 'Breached' && 'bg-critical text-white',
            ticket.sla_status === 'At Risk' && 'bg-warning text-white',
            ticket.sla_status === 'Within SLA' && 'bg-healthy text-white',
          )}>
            {String(ticket.sla_status ?? '')}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Priority" value={String(ticket.priority ?? 'N/A')} />
          <StatCard label="Status" value={String(ticket.status ?? 'N/A')} />
          <StatCard label="Created" value={ticket.created_at ? new Date(String(ticket.created_at)).toLocaleDateString() : 'N/A'} />
        </div>
      </div>
    </div>
  );
}

// ─── PPM COMPLIANCE PANEL ────────────────────────────────────────────────────

export function PPMCompliancePanel() {
  const { filters } = useDashboard();
  const { data, isPending, dataUpdatedAt, refetch, isFetching } = usePPMOperations(filters);
  const [drillCategory, setDrillCategory] = useState<Record<string, unknown> | null>(null);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const handleExport = () => {
    if (!data) return;
    exportToCSV(
      data.ppm.by_category.map(r => ({
        category: r.category,
        total: r.total,
        completed: r.completed,
        completion_pct: r.completion_percentage,
      })),
      'ppm_compliance'
    );
  };

  const statusData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Completed', value: data.ppm.completed, color: COLORS.healthy },
      { name: 'Pending', value: data.ppm.pending, color: COLORS.info },
      { name: 'Overdue', value: data.ppm.overdue, color: COLORS.critical },
      { name: 'Missed', value: data.ppm.missed, color: COLORS.warning },
    ].filter(d => d.value > 0);
  }, [data]);

  if (isPending) return <LoadingState />;

  return (
    <div>
      <PanelHeader
        title="PPM Compliance"
        icon={ClipboardCheck}
        lastUpdated={lastUpdated}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExport={handleExport}
      />

      {drillCategory ? (
        <DrillDownCategory category={drillCategory} onBack={() => setDrillCategory(null)} type="PPM" />
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="w-full mb-4 text-white" style={{ background: 'linear-gradient(90deg, #8f53a1 0%, #f47920 100%)', }}>
            <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="category" className="flex-1 text-xs">By Category</TabsTrigger>
            <TabsTrigger value="soft" className="flex-1 text-xs">Soft Services</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Total Scheduled" value={data!.ppm.total} />
              <StatCard label="Completion %" value={`${data!.ppm.completion_percentage}%`} color={data!.ppm.completion_percentage >= 85 ? 'text-healthy' : 'text-critical'} />
              <StatCard label="Completed" value={data!.ppm.completed} color="text-healthy" />
              <StatCard label="Overdue" value={data!.ppm.overdue} color="text-critical" />
              {/* <StatCard label="Missed" value={data!.ppm.missed} color="text-warning" /> */}
              <StatCard label="Pending" value={data!.ppm.pending} color="text-info" />
            </div>

            <SectionTitle>PPM Status Distribution</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="category" className="space-y-4">
            <SectionTitle>Completion by Category</SectionTitle>
            {data!.ppm.by_category.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(data!.ppm.by_category.length * 40, 150)}>
                <BarChart data={data!.ppm.by_category} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="completed" name="Completed" fill={COLORS.healthy} stackId="a" />
                  <Bar dataKey="total" name="Total" fill={COLORS.info} radius={[0, 3, 3, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No category data</p>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="text-white" style={{ background: 'linear-gradient(90deg, #8f53a1 0%, #f47920 100%)', }}>
                  <tr>
                    <th className="text-left p-2 font-medium">Category</th>
                    <th className="text-right p-2 font-medium">Total</th>
                    <th className="text-right p-2 font-medium">Done</th>
                    <th className="text-right p-2 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.ppm.by_category.map((row, i) => (
                    <tr
                      key={i}
                      className="border-t hover:bg-muted/20 cursor-pointer"
                      onClick={() => setDrillCategory(row as unknown as Record<string, unknown>)}
                    >
                      <td className="p-2">{row.category}</td>
                      <td className="p-2 text-right">{row.total}</td>
                      <td className="p-2 text-right text-healthy">{row.completed}</td>
                      <td className="p-2 text-right">
                        <span className={cn('font-medium', row.completion_percentage >= 85 ? 'text-healthy' : 'text-critical')}>
                          {row.completion_percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="soft" className="space-y-4">
            <SectionTitle>Soft Services Summary</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Total" value={data!.soft_services.total} />
              <StatCard label="Completion %" value={`${data!.soft_services.completion_percentage}%`} color={data!.soft_services.completion_percentage >= 85 ? 'text-healthy' : 'text-critical'} />
              <StatCard label="Completed" value={data!.soft_services.completed} color="text-healthy" />
              <StatCard label="Overdue" value={data!.soft_services.overdue} color="text-critical" />
              <StatCard label="Pending" value={data!.soft_services.pending} color="text-warning" />
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-bold">{data!.soft_services.completion_percentage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={cn('h-2 rounded-full transition-all', data!.soft_services.completion_percentage >= 85 ? 'bg-healthy' : 'bg-critical')}
                  style={{ width: `${data!.soft_services.completion_percentage}%` }}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function DrillDownCategory({ category, onBack, type }: { category: Record<string, unknown>; onBack: () => void; type: string }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ChevronDown className="h-3 w-3 rotate-90" /> Back
      </button>
      <div className="space-y-3">
        <div className="text-sm font-semibold">{type} — {String(category.category ?? '')}</div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total" value={String(category.total ?? 0)} />
          <StatCard label="Completed" value={String(category.completed ?? 0)} color="text-healthy" />
          <StatCard label="Completion %" value={`${category.completion_percentage ?? 0}%`} color={Number(category.completion_percentage ?? 0) >= 85 ? 'text-healthy' : 'text-critical'} />
          {category.operational !== undefined && <StatCard label="Operational" value={String(category.operational)} color="text-healthy" />}
          {category.health_percentage !== undefined && <StatCard label="Health %" value={`${category.health_percentage}%`} color={Number(category.health_percentage) >= 85 ? 'text-healthy' : 'text-critical'} />}
        </div>
      </div>
    </div>
  );
}

// ─── ASSET HEALTH PANEL ──────────────────────────────────────────────────────

export function AssetHealthPanel() {
  const { filters } = useDashboard();
  const { data, isPending, dataUpdatedAt, refetch, isFetching } = useAssetPortfolio(filters);
  const [drillAsset, setDrillAsset] = useState<Record<string, unknown> | null>(null);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const handleExport = () => {
    if (!data) return;
    const criticalRows = (data.critical_assets || []).map((a, idx) => ({
      'S.No': idx + 1,
      'Asset ID': a.id,
      'Asset Name': a.name,
      'Asset Number': a.asset_number || `AST-${a.id}`,
      'Location': a.location,
      'Category': a.category,
      'Condition': a.breakdown ? 'Breakdown' : 'Operational',
    }));
    exportToXLSX({
      summary: {
        'Report Name': 'Asset Health Telemetry',
        'Total Assets': data.summary.total,
        'Operational Units': data.summary.operational,
        'Breakdown Units': data.summary.maintenance,
        'Critical Units': data.summary.critical,
        'Health Rate': `${data.summary.health_percentage}%`,
        'Exported At': new Date().toLocaleString(),
      },
      sheets: [{ name: 'Critical Assets', data: criticalRows }],
      filename: 'asset_health_telemetry',
    });
  };

  const statusData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Operational', value: data.summary.operational, color: COLORS.healthy },
      { name: 'Breakdown', value: data.summary.maintenance, color: COLORS.warning },
      { name: 'Critical', value: data.summary.critical, color: COLORS.critical },
      { name: 'Offline', value: data.summary.offline, color: COLORS.neutral },
    ].filter(d => d.value > 0);
  }, [data]);

  if (isPending) return <LoadingState />;

  return (
    <div>
      <PanelHeader
        title="Asset Health"
        icon={Wrench}
        lastUpdated={lastUpdated}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExport={handleExport}
        exportLabel="Export Critical"
      />

      {drillAsset ? (
        <DrillDownAsset asset={drillAsset} onBack={() => setDrillAsset(null)} />
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="w-full mb-4 text-white" style={{ background: 'linear-gradient(90deg, #8f53a1 0%, #f47920 100%)', }}>
            <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="categories" className="flex-1 text-xs">Categories</TabsTrigger>
            <TabsTrigger value="critical" className="flex-1 text-xs">Critical</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Total Assets" value={data!.summary.total} />
              <StatCard label="Health %" value={`${data!.summary.health_percentage}%`} color={data!.summary.health_percentage >= 85 ? 'text-healthy' : 'text-critical'} />
              <StatCard label="Operational" value={data!.summary.operational} color="text-healthy" />
              <StatCard label="Breakdown" value={data!.summary.maintenance} color="text-warning" />
              <StatCard label="Critical" value={data!.summary.critical} color="text-critical" />
              {/* <StatCard label="Offline" value={data!.summary.offline} color="text-neutral" /> */}
            </div>

            <SectionTitle>Asset Status Distribution</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <SectionTitle>Asset Health by Category</SectionTitle>
            {data!.category_breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(data!.category_breakdown.length * 36, 150)}>
                <BarChart data={data!.category_breakdown} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="health_percentage" name="Health %" fill={COLORS.info} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No category data</p>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="text-white" style={{ background: 'linear-gradient(90deg, #8f53a1 0%, #f47920 100%)', }}>
                  <tr>
                    <th className="text-left p-2 font-medium">Category</th>
                    <th className="text-right p-2 font-medium">Total</th>
                    <th className="text-right p-2 font-medium">Operational</th>
                    <th className="text-right p-2 font-medium">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.category_breakdown.map((row, i) => (
                    <tr
                      key={i}
                      className="border-t hover:bg-muted/20 cursor-pointer"
                      onClick={() => setDrillAsset(row as unknown as Record<string, unknown>)}
                    >
                      <td className="p-2">{row.category}</td>
                      <td className="p-2 text-right">{row.total}</td>
                      <td className="p-2 text-right text-healthy">{row.operational}</td>
                      <td className="p-2 text-right">
                        <span className={cn('font-medium', row.health_percentage >= 85 ? 'text-healthy' : 'text-critical')}>
                          {row.health_percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="critical" className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <SectionTitle>Critical Assets ({data!.critical_assets.length})</SectionTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleExport}>
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>
            {data!.critical_assets.length > 0 ? (
              <div className="space-y-2">
                {data!.critical_assets.map((asset, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setDrillAsset(asset as unknown as Record<string, unknown>)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-mono text-muted-foreground">{asset.asset_number}</span>
                        {asset.breakdown && (
                          <Badge variant="outline" className="text-2xs px-1 py-0 border-critical text-critical">Breakdown</Badge>
                        )}
                      </div>
                      <div className="text-xs font-medium truncate">{asset.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{asset.location} · {asset.category}</div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground ml-2 mt-0.5 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-healthy/10 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-healthy" />
                <span className="text-sm text-healthy">No critical assets</span>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function DrillDownAsset({ asset, onBack }: { asset: Record<string, unknown>; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ChevronDown className="h-3 w-3 rotate-90" /> Back
      </button>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-mono text-muted-foreground">{String(asset.asset_number ?? '')}</div>
            <div className="text-sm font-semibold mt-0.5">{String(asset.name ?? '')}</div>
          </div>
          {asset.breakdown && <Badge variant="outline" className="border-critical text-critical text-xs">Breakdown</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Category" value={String(asset.category ?? 'N/A')} />
          <StatCard label="Location" value={String(asset.location ?? 'N/A')} />
          {asset.total !== undefined && <StatCard label="Total in Category" value={String(asset.total)} />}
          {asset.operational !== undefined && <StatCard label="Operational" value={String(asset.operational)} color="text-healthy" />}
          {asset.health_percentage !== undefined && <StatCard label="Health %" value={`${asset.health_percentage}%`} color={Number(asset.health_percentage) >= 85 ? 'text-healthy' : 'text-critical'} />}
        </div>
      </div>
    </div>
  );
}

// ─── WORKFORCE AVAILABILITY PANEL ────────────────────────────────────────────

export function WorkforcePanel() {
  const { filters, openSlideOver } = useDashboard();
  const { data, isPending, dataUpdatedAt, refetch, isFetching } = useWorkforce(filters);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const handleExport = () => {
    if (!data?.by_vendor?.length) return;
    exportToCSV(
      data.by_vendor.map(v => ({
        vendor: v.vendor ?? '—',
        total: v.total ?? 0,
        present: v.present ?? 0,
        absent: v.absent ?? 0,
        availability_pct: (v.total ?? 0) > 0 ? (((v.present ?? 0) / (v.total ?? 1)) * 100).toFixed(1) : 0,
      })),
      'workforce_availability'
    );
  };

  if (isPending) return <LoadingState />;
  if (!data) return <p className="text-sm text-muted-foreground">Failed to load workforce data</p>;

  const summary = data.summary ?? { total: 0, present: 0, absent: 0, availability_percentage: 0 };
  const byVendor = data.by_vendor ?? [];
  const byWorkType = data.by_work_type ?? [];
  const workTypeData = byWorkType.map((w, i) => ({ ...w, fill: PIE_PALETTE[i % PIE_PALETTE.length] }));

  return (
    <div>
      <PanelHeader
        title="Workforce Availability"
        icon={Users}
        lastUpdated={lastUpdated}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExport={handleExport}
      />

      <Tabs defaultValue="overview">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
          <TabsTrigger value="vendor" className="flex-1 text-xs">By Vendor</TabsTrigger>
          <TabsTrigger value="worktype" className="flex-1 text-xs">Work Type</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total Staff" value={summary.total ?? 0} />
            <StatCard label="Availability %" value={`${summary.availability_percentage ?? 0}%`} color={(summary.availability_percentage ?? 0) >= 85 ? 'text-healthy' : 'text-critical'} />
            <StatCard label="Present Today" value={summary.present ?? 0} color="text-healthy" />
            <StatCard label="Absent" value={summary.absent ?? 0} color="text-critical" />
          </div>

          <SectionTitle>Present vs Absent</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Present', value: summary.present ?? 0, color: COLORS.healthy },
                  { name: 'Absent', value: summary.absent ?? 0, color: COLORS.critical },
                ].filter(d => (d.value ?? 0) > 0)}
                cx="50%" cy="50%" outerRadius={65} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                <Cell fill={COLORS.healthy} />
                <Cell fill={COLORS.critical} />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="vendor" className="space-y-4">
          <SectionTitle>Attendance by Vendor</SectionTitle>
          {byVendor.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(byVendor.length * 40, 150)}>
              <BarChart data={byVendor} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="vendor" type="category" width={80} tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="present" name="Present" fill={COLORS.healthy} stackId="a" />
                <Bar dataKey="absent" name="Absent" fill={COLORS.critical} stackId="a" radius={[0, 3, 3, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No vendor data</p>
          )}

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Vendor</th>
                  <th className="text-right p-2 font-medium">Total</th>
                  <th className="text-right p-2 font-medium">Present</th>
                  <th className="text-right p-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {byVendor.map((row, i) => {
                  const total = row.total ?? 0;
                  const present = row.present ?? 0;
                  return (
                    <tr
                      key={i}
                      className="border-t hover:bg-muted/20 cursor-pointer"
                      onClick={() => openSlideOver('drill_workforce', { type: 'vendor', value: row.vendor ?? '' })}
                    >
                      <td className="p-2">{row.vendor ?? '—'}</td>
                      <td className="p-2 text-right">{total}</td>
                      <td className="p-2 text-right text-healthy">{present}</td>
                      <td className="p-2 text-right">
                        <span className={cn('font-medium', total > 0 && (present / total) >= 0.85 ? 'text-healthy' : 'text-critical')}>
                          {total > 0 ? ((present / total) * 100).toFixed(0) : 0}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="worktype" className="space-y-4">
          <SectionTitle>Staff by Work Type (click to see staff details)</SectionTitle>
          {workTypeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={workTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    dataKey="count"
                    nameKey="work_type"
                    label={({ work_type, percent }) => `${work_type} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    onClick={(d: { work_type?: string }) => d?.work_type && openSlideOver('drill_workforce', { type: 'work_type', value: d.work_type })}
                    style={{ cursor: 'pointer' }}
                  >
                    {workTypeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Work Type</th>
                      <th className="text-right p-2 font-medium">Count</th>
                      <th className="text-right p-2 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {workTypeData.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t hover:bg-muted/20 cursor-pointer"
                        onClick={() => openSlideOver('drill_workforce', { type: 'work_type', value: row.work_type ?? 'Unspecified' })}
                      >
                        <td className="p-2">{row.work_type ?? 'Unspecified'}</td>
                        <td className="p-2 text-right">{row.count ?? 0}</td>
                        <td className="p-2 text-right"><ChevronRight className="h-3 w-3 text-muted-foreground inline" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No work type data</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DrillDownVendorStaff({ vendor, onBack }: { vendor: Record<string, unknown>; onBack: () => void }) {
  const pct = Number(vendor.total) > 0 ? ((Number(vendor.present) / Number(vendor.total)) * 100).toFixed(1) : '0';
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ChevronDown className="h-3 w-3 rotate-90" /> Back
      </button>
      <div className="space-y-3">
        <div className="text-sm font-semibold">{String(vendor.vendor ?? '')}</div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Staff" value={String(vendor.total ?? 0)} />
          <StatCard label="Present" value={String(vendor.present ?? 0)} color="text-healthy" />
          <StatCard label="Absent" value={String(vendor.absent ?? 0)} color="text-critical" />
          <StatCard label="Availability" value={`${pct}%`} color={Number(pct) >= 85 ? 'text-healthy' : 'text-critical'} />
        </div>
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Attendance Rate</span>
            <span className="text-sm font-bold">{pct}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn('h-2 rounded-full', Number(pct) >= 85 ? 'bg-healthy' : 'bg-critical')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VENDOR SLA PANEL ────────────────────────────────────────────────────────

export function VendorSLAPanel() {
  const { filters } = useDashboard();
  const { data, isPending, dataUpdatedAt, refetch, isFetching } = useDashboardKPIs(filters);
  const [drillVendor, setDrillVendor] = useState<Record<string, unknown> | null>(null);
  const [vendorChartType, setVendorChartType] = useState<'Pie' | 'Vertical Bar' | 'Horizontal Bar'>('Pie');

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const vendorData = data?.vendor_sla;

  const handleExport = () => {
    if (!vendorData) return;
    exportToCSV([
      { status: 'Compliant', count: vendorData.summary.compliant },
      { status: 'At Risk', count: vendorData.summary.at_risk },
      { status: 'Non-Compliant', count: vendorData.summary.non_compliant },
    ], 'vendor_sla');
  };

  const pieData = useMemo(() => {
    if (!vendorData) return [];
    return [
      { name: 'Compliant', value: vendorData.summary.compliant, color: COLORS.healthy },
      { name: 'At Risk', value: vendorData.summary.at_risk, color: COLORS.warning },
      { name: 'Non-Compliant', value: vendorData.summary.non_compliant, color: COLORS.critical },
    ].filter(d => d.value > 0);
  }, [vendorData]);

  const vendorRecords: Array<{ id: number; name: string; expiry_date: string | null; status: string; site_id: number }> = useMemo(() => {
    const raw = (vendorData as unknown as { records?: { compliant?: unknown[]; at_risk?: unknown[]; non_compliant?: unknown[] } })?.records;
    if (!raw) return [];
    const mapStatus = (arr: unknown[], status: string) =>
      (arr ?? []).map((v: unknown) => {
        const vendor = v as Record<string, unknown>;
        return {
          id: Number(vendor.id),
          name: String(vendor.vendor_name ?? ''),
          expiry_date: vendor.aggremenet_end_date ? String(vendor.aggremenet_end_date) : null,
          status,
          site_id: Number(vendor.site_id ?? 0),
        };
      });
    return [
      ...mapStatus(raw.compliant ?? [], 'Compliant'),
      ...mapStatus(raw.at_risk ?? [], 'At Risk'),
      ...mapStatus(raw.non_compliant ?? [], 'Non-Compliant'),
    ];
  }, [vendorData]);

  if (isPending) return <LoadingState />;

  return (
    <div>
      <PanelHeader
        title="Vendor SLA"
        icon={Building2}
        lastUpdated={lastUpdated}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExport={handleExport}
      />

      {drillVendor ? (
        <DrillDownVendorSLA vendor={drillVendor} onBack={() => setDrillVendor(null)} />
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="vendors" className="flex-1 text-xs">Vendor List</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Compliant" value={vendorData!.summary.compliant} color="text-healthy" />
              <StatCard label="At Risk" value={vendorData!.summary.at_risk} color="text-warning" />
              <StatCard label="Non-Compliant" value={vendorData!.summary.non_compliant} color="text-critical" />
            </div>
            <StatCard label="Compliance %" value={`${vendorData!.summary.percentage}%`} color={vendorData!.summary.percentage >= 85 ? 'text-healthy' : 'text-critical'} />

            <div className="flex items-center justify-between pb-2 border-b border-border">
              <SectionTitle>Vendor SLA Status</SectionTitle>
              <div className="flex items-center gap-0.5 bg-muted/80 p-0.5 rounded-lg border border-border">
                {(['Pie', 'Vertical Bar', 'Horizontal Bar'] as const).map((type) => {
                  const isSelected = vendorChartType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setVendorChartType(type)}
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
            </div>

            {pieData.length > 0 ? (
              <div style={{ height: '200px', width: '100%', position: 'relative' }}>
                {vendorChartType === 'Pie' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} />
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : vendorChartType === 'Vertical Bar' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pieData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Vendors" radius={[5, 5, 0, 0]} barSize={36}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pieData} layout="vertical" margin={{ top: 10, right: 25, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={95} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Vendors" radius={[0, 5, 5, 0]} barSize={22}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {vendorChartType === 'Pie' && (
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
                      {vendorData!.summary.percentage}%
                    </div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '3px' }}>
                      Compliance
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No vendor data</p>
            )}
          </TabsContent>

          <TabsContent value="vendors" className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <SectionTitle>All Vendors ({vendorData!.summary.total})</SectionTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleExport}>
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>

            {vendorRecords.length > 0 ? (
              <div className="space-y-2">
                {vendorRecords.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setDrillVendor(v as unknown as Record<string, unknown>)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{v.name || `Vendor #${v.id}`}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {v.expiry_date ? `Expiry: ${new Date(v.expiry_date).toLocaleDateString()}` : 'No expiry date'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <Badge className={cn('text-2xs',
                        v.status === 'Compliant' && 'bg-healthy/10 text-healthy border border-healthy/30',
                        v.status === 'At Risk' && 'bg-warning/10 text-warning border border-warning/30',
                        v.status === 'Non-Compliant' && 'bg-critical/10 text-critical border border-critical/30',
                      )}>
                        {v.status}
                      </Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-right p-2 font-medium">Count</th>
                      <th className="text-right p-2 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { status: 'Compliant', count: vendorData!.summary.compliant, color: 'text-healthy' },
                      { status: 'At Risk', count: vendorData!.summary.at_risk, color: 'text-warning' },
                      { status: 'Non-Compliant', count: vendorData!.summary.non_compliant, color: 'text-critical' },
                    ].map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className={cn('p-2', row.color)}>{row.status}</td>
                        <td className="p-2 text-right font-medium">{row.count}</td>
                        <td className="p-2 text-right text-muted-foreground">
                          {vendorData!.summary.total > 0 ? ((row.count / vendorData!.summary.total) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function DrillDownVendorSLA({ vendor, onBack }: { vendor: Record<string, unknown>; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ChevronDown className="h-3 w-3 rotate-90" /> Back
      </button>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="text-sm font-semibold">{String(vendor.name ?? `Vendor #${vendor.id}`)}</div>
          <Badge className={cn('text-xs',
            vendor.status === 'Compliant' && 'bg-healthy text-white',
            vendor.status === 'At Risk' && 'bg-warning text-white',
            vendor.status === 'Non-Compliant' && 'bg-critical text-white',
          )}>
            {String(vendor.status ?? '')}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="SLA Status" value={String(vendor.status ?? 'N/A')} />
          <StatCard
            label="Agreement Expiry"
            value={vendor.expiry_date ? new Date(String(vendor.expiry_date)).toLocaleDateString() : 'N/A'}
          />
        </div>
        {vendor.status === 'At Risk' && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs text-warning">Agreement expiring within 30 days. Please renew to maintain compliance.</p>
          </div>
        )}
        {vendor.status === 'Non-Compliant' && (
          <div className="flex items-center gap-2 p-3 bg-critical/10 rounded-lg border border-critical/20">
            <AlertTriangle className="h-4 w-4 text-critical shrink-0" />
            <p className="text-xs text-critical">Agreement has expired. Immediate renewal required.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VISITORS TODAY PANEL ────────────────────────────────────────────────────

const VISITOR_CATEGORY_PALETTE = [
  '#00C853', // Emerald green
  '#00B0FF', // Sky blue
  '#FF9100', // Amber/Orange
  '#7C4DFF', // Purple
  '#FF5252', // Red
  '#00E5FF', // Cyan
  '#FFD600', // Yellow
  '#FF4081', // Pink
  '#64DD17', // Lime
  '#536DFE', // Indigo
  '#FF6E40', // Deep orange
  '#78909C', // Slate gray
];

const VisitorChartTooltip = ({ active, payload, label }: any) => {
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
          const name = entry.name || entry.dataKey || entry.payload?.category || label;
          const value = entry.value;
          const pct = entry.payload?.percentage;
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
                {value} {pct != null ? `(${pct}%)` : ''}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export function VisitorsTodayPanel() {
  const { filters, openSlideOver } = useDashboard();
  const { data, isPending, dataUpdatedAt, refetch, isFetching } = useVisitorsDetail(filters);
  const [visitorChartType, setVisitorChartType] = useState<'Donut' | 'Horizontal Bar' | 'Vertical Bar'>('Donut');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  const handleExport = () => {
    if (!data?.period?.by_category?.length) return;
    exportToCSV(
      data.period.by_category.map((c: { category: string; count: number }) => ({
        category: c.category,
        count: c.count,
      })),
      'visitors_today'
    );
  };

  const categoryData = useMemo(() => data?.period.by_category ?? [], [data]);
  const totalVisitors = useMemo(
    () => data?.period?.total || categoryData.reduce((sum, c) => sum + (c.count || 0), 0),
    [data?.period?.total, categoryData]
  );
  const pieData = useMemo(() => {
    return categoryData.map((c, i) => {
      const pct = totalVisitors > 0 ? ((c.count / totalVisitors) * 100) : 0;
      return {
        ...c,
        percentage: Number(pct.toFixed(1)),
        fill: VISITOR_CATEGORY_PALETTE[i % VISITOR_CATEGORY_PALETTE.length],
      };
    });
  }, [categoryData, totalVisitors]);

  if (isPending) return <LoadingState />;
  if (!data) return <p className="text-sm text-muted-foreground">Failed to load visitors data</p>;

  const today = data.today ?? { checked_in: 0, checked_out: 0, currently_inside: 0 };
  const period = data.period ?? { total: 0, avg_duration_minutes: 0, by_category: [] };

  return (
    <div>
      <PanelHeader
        title="Visitors Today"
        icon={UserCheck}
        lastUpdated={lastUpdated}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        onExport={handleExport}
      />

      <Button
        variant="outline"
        size="sm"
        className="w-full mb-4 text-xs"
        onClick={() => openSlideOver('drill_visitors', {})}
      >
        View all visit details (category, check-in, host, approved, purpose)
      </Button>

      <Tabs defaultValue="today">
        <TabsList className="w-full mb-4 text-white" style={{ background: 'linear-gradient(90deg, #8f53a1 0%, #f47920 100%)', }}>
          <TabsTrigger value="today" className="flex-1 text-xs">Today</TabsTrigger>
          <TabsTrigger value="period" className="flex-1 text-xs">Period</TabsTrigger>
          <TabsTrigger value="category" className="flex-1 text-xs">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Checked In" value={today.checked_in} color="text-healthy" />
            <StatCard label="Checked Out" value={today.checked_out} color="text-info" />
            <StatCard label="Inside Now" value={today.currently_inside} color="text-warning" />
          </div>

          <SectionTitle>Today's Traffic</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={[
              { name: 'Checked In', value: today.checked_in, fill: COLORS.healthy },
              { name: 'Checked Out', value: today.checked_out, fill: COLORS.info },
              { name: 'Currently Inside', value: today.currently_inside, fill: COLORS.warning },
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {[COLORS.healthy, COLORS.info, COLORS.warning].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="period" className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Period Total" value={period.total} />
            <StatCard
              label="Avg Duration"
              value={`${period.avg_duration_minutes}m`}
              sub="per visit"
            />
          </div>

          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Avg visit duration</span>
              <span className="font-medium">{period.avg_duration_minutes} minutes</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total visits this period</span>
              <span className="font-medium">{period.total}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-border">
            <SectionTitle>Visitors by Category</SectionTitle>

            {/* View Switcher Pills */}
            <div className="flex items-center gap-0.5 bg-muted/80 p-0.5 rounded-lg border border-border">
              {(['Donut', 'Horizontal Bar', 'Vertical Bar'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setVisitorChartType(type)}
                  className={cn(
                    'px-2.5 py-1 text-2xs font-bold rounded-md transition-all cursor-pointer',
                    visitorChartType === type
                      ? 'bg-background text-foreground shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {categoryData.length > 0 ? (
            <>
              {/* Dynamic Chart Container */}
              <div
                style={{
                  height: visitorChartType === 'Horizontal Bar' ? `${Math.max(220, categoryData.length * 28)}px` : '220px',
                  width: '100%',
                  position: 'relative',
                }}
              >
                {visitorChartType === 'Donut' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<VisitorChartTooltip />} />
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="category"
                        cursor="pointer"
                        onClick={(d) => openSlideOver('drill_visitors', { category: d?.category })}
                      >
                        {pieData.map((entry, i) => (
                          <Cell
                            key={`visitor-cell-${i}`}
                            fill={entry.fill}
                            stroke={hoveredCategory === entry.category ? 'var(--text-primary)' : 'transparent'}
                            strokeWidth={2}
                            opacity={hoveredCategory && hoveredCategory !== entry.category ? 0.45 : 1}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : visitorChartType === 'Horizontal Bar' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pieData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                      <XAxis type="number" fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="category"
                        fontSize={10}
                        stroke="var(--text-muted)"
                        width={95}
                        tickFormatter={(val) => (val?.length > 13 ? `${val.substring(0, 12)}…` : val)}
                      />
                      <Tooltip content={<VisitorChartTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Visitors"
                        radius={[0, 4, 4, 0]}
                        barSize={16}
                        cursor="pointer"
                        onClick={(d: any) => openSlideOver('drill_visitors', { category: d?.category })}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={`vhbar-${i}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pieData.slice(0, 8)} margin={{ top: 10, right: 15, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis
                        dataKey="category"
                        fontSize={9}
                        stroke="var(--text-muted)"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        tickFormatter={(val) => (val?.length > 10 ? `${val.substring(0, 9)}…` : val)}
                      />
                      <YAxis fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
                      <Tooltip content={<VisitorChartTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Visitors"
                        radius={[4, 4, 0, 0]}
                        barSize={22}
                        cursor="pointer"
                        onClick={(d: any) => openSlideOver('drill_visitors', { category: d?.category })}
                      >
                        {pieData.slice(0, 8).map((entry, i) => (
                          <Cell key={`vvbar-${i}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {/* Central Donut Total Overlay */}
                {visitorChartType === 'Donut' && (
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
                      {totalVisitors.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '3px' }}>
                      Total Visits
                    </div>
                  </div>
                )}
              </div>

              {/* High-Contrast Interactive Category Grid / Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 rounded-lg bg-card border border-border shadow-xs">
                {pieData.map((entry) => (
                  <div
                    key={entry.category}
                    onMouseEnter={() => setHoveredCategory(entry.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => openSlideOver('drill_visitors', { category: entry.category })}
                    className={cn(
                      'flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md border text-xs cursor-pointer transition-all',
                      hoveredCategory === entry.category
                        ? 'bg-muted border-primary shadow-xs'
                        : 'bg-card/70 border-border/70 hover:bg-muted/40'
                    )}
                    title={`Click to inspect ${entry.category} visits`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        style={{ backgroundColor: entry.fill }}
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                      />
                      <span className="truncate font-semibold text-foreground text-2xs">{entry.category}</span>
                    </div>
                    <span className="font-mono font-bold text-foreground text-2xs shrink-0">
                      {entry.count} ({entry.percentage}%)
                    </span>
                  </div>
                ))}
              </div>

              {/* Data Table */}
              <div className="border border-border rounded-lg overflow-hidden shadow-xs">
                <table className="w-full text-xs">
                  <thead className="bg-muted text-foreground border-b border-border">
                    <tr>
                      <th className="text-left p-2.5 font-extrabold tracking-wide">Category</th>
                      <th className="text-right p-2.5 font-extrabold tracking-wide">Count</th>
                      <th className="text-right p-2.5 font-extrabold tracking-wide">%</th>
                      <th className="text-right p-2.5 font-extrabold tracking-wide w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pieData.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-border hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => openSlideOver('drill_visitors', { category: row.category })}
                      >
                        <td className="p-2.5 font-semibold text-foreground flex items-center gap-2">
                          <span style={{ backgroundColor: row.fill }} className="w-2 h-2 rounded-full shrink-0" />
                          <span>{row.category}</span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-foreground font-mono">{row.count.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-semibold text-muted-foreground font-mono">
                          {row.percentage}%
                        </td>
                        <td className="p-2.5 text-right">
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-2xs text-muted-foreground mt-1">
                Tip: Click any slice, card, or table row to drill down into full visitor logs (check-in, host, purpose, approvals).
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No category data for this period</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── AVG RESOLUTION TIME PANEL ───────────────────────────────────────────────

export function AvgResolutionPanel() {
  const { filters } = useDashboard();
  const { data: kpiData, isPending: kpiPending, dataUpdatedAt: kpiUpdatedAt, refetch: kpiRefetch, isFetching: kpiIsFetching } = useDashboardKPIs(filters);
  const { data: sdData, isPending: sdPending } = useServiceDesk(filters);

  const lastUpdated = kpiUpdatedAt ? new Date(kpiUpdatedAt) : null;
  const isPending = kpiPending || sdPending;

  const handleExport = () => {
    if (!sdData) return;
    exportToCSV(
      sdData.priority_tickets.map(t => ({
        ticket_number: t.ticket_number,
        heading: t.heading,
        priority: t.priority,
        status: t.status,
        sla_status: t.sla_status,
        created_at: t.created_at,
      })),
      'avg_resolution_time'
    );
  };

  const resolutionData = useMemo(() => {
    if (!sdData) return [];
    return sdData.tickets_by_category.map(c => ({
      category: c.category.length > 10 ? c.category.slice(0, 10) + '…' : c.category,
      fullCategory: c.category,
      count: c.count,
    }));
  }, [sdData]);

  if (isPending) return <LoadingState />;

  const avgHrs = kpiData?.avg_resolution_time?.summary?.hours ?? 0;
  const vsLastPeriod = kpiData?.avg_resolution_time?.summary?.vs_last_period ?? 0;
  const prevHrs = kpiData?.avg_resolution_time?.summary?.prev_hours ?? 0;

  return (
    <div>
      <PanelHeader
        title="Avg Resolution Time"
        icon={Clock}
        lastUpdated={lastUpdated}
        onRefresh={() => kpiRefetch()}
        isRefreshing={kpiIsFetching}
        onExport={handleExport}
      />

      <Tabs defaultValue="overview">
        <TabsList className="w-full mb-4 text-white" style={{ background: 'linear-gradient(90deg, #8f53a1 0%, #f47920 100%)', }}>
          <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
          <TabsTrigger value="tickets" className="flex-1 text-xs">Resolved Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Avg Resolution"
              value={`${avgHrs}h`}
              color={avgHrs <= 24 ? 'text-healthy' : avgHrs <= 48 ? 'text-warning' : 'text-critical'}
            />
            <StatCard label="Previous Period" value={`${prevHrs}h`} />
          </div>

          <div className="p-4 bg-muted/30 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Trend vs Last Period</div>
              <div className="text-lg font-bold mt-0.5">
                <TrendBadge value={vsLastPeriod} inverse />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total Tickets</div>
              <div className="text-lg font-bold">{sdData?.summary.total ?? 0}</div>
            </div>
          </div>

          <SectionTitle>Tickets by Category (Volume)</SectionTitle>
          {resolutionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(resolutionData.length * 36, 150)}>
              <BarChart data={resolutionData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 9 }} />
                <Tooltip labelFormatter={(l, pl) => pl?.[0]?.payload?.fullCategory ?? l} />
                <Bar dataKey="count" name="Tickets" fill={COLORS.info} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No category data</p>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <SectionTitle>Recent Resolved / Priority</SectionTitle>
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleExport}>
              <Download className="h-3 w-3" /> CSV
            </Button>
          </div>
          <div className="space-y-2">
            {(sdData?.priority_tickets ?? []).map((t, i) => (
              <div key={i} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                    <Badge variant="outline" className={cn('text-2xs px-1 py-0',
                      t.priority === 'critical' && 'border-critical text-critical',
                      t.priority === 'high' && 'border-warning text-warning',
                    )}>
                      {t.priority}
                    </Badge>
                  </div>
                  <div className="text-xs font-medium truncate">{t.heading}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleDateString()}</div>
                </div>
                <Badge className={cn('text-2xs ml-2 shrink-0',
                  t.sla_status === 'Breached' && 'bg-critical/10 text-critical border border-critical/30',
                  t.sla_status === 'At Risk' && 'bg-warning/10 text-warning border border-warning/30',
                  t.sla_status === 'Within SLA' && 'bg-healthy/10 text-healthy border border-healthy/30',
                )}>
                  {t.sla_status}
                </Badge>
              </div>
            ))}
            {!sdData?.priority_tickets?.length && (
              <p className="text-sm text-muted-foreground text-center py-8">No tickets found</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Re-export TrendBadge for potential use elsewhere
export { TrendBadge };
