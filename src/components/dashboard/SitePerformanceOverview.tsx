import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useSitePerformance } from '@/hooks/useGroupedDashboard';
import {
  Building2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  SlidersHorizontal,
  EyeOff,
  BarChart2,
  Table as TableIcon,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
} from 'recharts';
import { ThemeChartTooltip } from './DrillDownPanels';

type MetricMode = 'health' | 'tat' | 'ppm' | 'workforce';
type ViewMode = 'table' | 'chart' | 'heatmap';
type ChartType = 'Horizontal Bar' | 'Vertical Bar' | 'Pie' | 'Donut' | 'Line' | 'Area' | 'Radar';

const METRIC_TABS: { id: MetricMode; label: string; color: string }[] = [
  { id: 'health', label: 'Overall Health', color: '#00C853' },
  { id: 'tat', label: 'SLA Adherence (TAT)', color: '#FF5B22' },
  { id: 'ppm', label: 'PPM Adherence', color: '#00E676' },
  { id: 'workforce', label: 'Workforce Attendance', color: '#00B0FF' },
];

const CHART_TYPES: ChartType[] = [
  'Horizontal Bar',
  'Vertical Bar',
  'Line',
  'Area',
  'Radar',
  'Pie',
  'Donut',
];

const SITE_PALETTE = [
  '#00C853', '#3B82F6', '#FF5B22', '#8B5CF6', '#F59E0B',
  '#06B6D4', '#EC4899', '#10B981', '#6366F1', '#EAB308',
  '#14B8A6', '#F97316', '#A855F7', '#EF4444', '#22C55E',
  '#0EA5E9', '#D946EF', '#84CC16', '#F43F5E', '#64748B', '#FB923C',
];

interface TableColumnDef {
  id: string;
  label: string;
  checkZero?: (sites: any[]) => boolean;
}

const TABLE_COLUMNS: TableColumnDef[] = [
  { id: 'rank', label: 'Rank' },
  { id: 'name', label: 'Site / Park Name' },
  { id: 'group', label: 'Region / Group' },
  {
    id: 'health',
    label: 'Overall Health',
    checkZero: (sites) => sites.length > 0 && sites.every((s) => Number(s.health || 0) === 0),
  },
  {
    id: 'tat',
    label: 'SLA Adherence',
    checkZero: (sites) => sites.length > 0 && sites.every((s) => Number(s.tat || 0) === 0),
  },
  {
    id: 'ppm',
    label: 'PPM Adherence',
    checkZero: (sites) => sites.length > 0 && sites.every((s) => Number(s.ppm || 0) === 0),
  },
  {
    id: 'workforce',
    label: 'Workforce Attendance',
    checkZero: (sites) => sites.length > 0 && sites.every((s) => Number(s.workforce || 0) === 0),
  },
  {
    id: 'assets',
    label: 'Active Assets',
    checkZero: (sites) => sites.length > 0 && sites.every((s) => Number(s.assets || 0) === 0),
  },
  {
    id: 'tickets',
    label: 'Tickets (Open/Closed)',
    checkZero: (sites) => sites.length > 0 && sites.every((s) => Number(s.tickets || 0) === 0 && Number(s.closed || 0) === 0),
  },
  { id: 'status', label: 'Status' },
  { id: 'action', label: 'Action' },
];

export function SitePerformanceOverview() {
  const { filters, openSlideOver } = useDashboard();
  const { data: rawSiteData, isPending } = useSitePerformance(filters);

  const [search, setSearch] = useState('');
  const [metricMode, setMetricMode] = useState<MetricMode>('health');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [chartType, setChartType] = useState<ChartType>('Horizontal Bar');
  const [topN, setTopN] = useState<'Top 5' | 'Top 10' | 'All'>('All');
  const [sortField, setSortField] = useState<'name' | 'health' | 'tat' | 'ppm' | 'workforce' | 'assets'>('health');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [userToggledColumns, setUserToggledColumns] = useState<Record<string, boolean>>({});
  const [isHideColOpen, setIsHideColOpen] = useState(false);
  const hideColRef = useRef<HTMLDivElement>(null);

  // Close Hide Column dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (hideColRef.current && !hideColRef.current.contains(e.target as Node)) {
        setIsHideColOpen(false);
      }
    };
    if (isHideColOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isHideColOpen]);

  // Normalize site data
  const sites = useMemo(() => {
    const list = rawSiteData?.sites || [];
    return list.map((s, idx) => {
      const id = s.id || idx + 1;
      const name = s.name || `Park #${id}`;
      const group = s.group || '—';
      const health = Number(s.health_score ?? 0);
      const tat = Number(s.sla_percentage ?? 0);
      const ppm = Number(s.ppm_percentage ?? 0);
      const workforce = Number(s.workforce_percentage ?? 0);
      const assets = Number(s.total_assets ?? 0);
      const tickets = Number((s.open_tickets || 0) + (s.pending_tickets || 0));
      const closed = Number(s.open_tickets ? Math.max(0, tickets - s.open_tickets) : 0);
      const status = health >= 85 ? 'Operational' : 'Attention';

      return {
        id,
        name,
        group,
        health,
        tat,
        ppm,
        workforce,
        assets,
        tickets,
        closed,
        status,
        raw: s,
      };
    });
  }, [rawSiteData]);

  // Determine if a column is currently hidden (user toggle overrides default; default hides all-zero columns)
  const isColumnHidden = (colId: string) => {
    if (userToggledColumns[colId] !== undefined) {
      return userToggledColumns[colId];
    }
    const colDef = TABLE_COLUMNS.find((c) => c.id === colId);
    if (colDef?.checkZero) {
      return colDef.checkZero(sites);
    }
    return false;
  };

  const handleToggleColumn = (colId: string, shouldHide: boolean) => {
    setUserToggledColumns((prev) => ({
      ...prev,
      [colId]: shouldHide,
    }));
  };

  const hiddenCount = useMemo(() => {
    return TABLE_COLUMNS.filter((col) => isColumnHidden(col.id)).length;
  }, [sites, userToggledColumns]);

  // Filtered & sorted sites
  const filteredSites = useMemo(() => {
    let result = sites;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.group.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return result;
  }, [sites, search, sortField, sortAsc]);

  // Top N sliced for chart
  const chartData = useMemo(() => {
    if (topN === 'Top 5') return filteredSites.slice(0, 5);
    if (topN === 'Top 10') return filteredSites.slice(0, 10);
    return filteredSites;
  }, [filteredSites, topN]);

  // Paginated for table
  const totalPages = Math.max(1, Math.ceil(filteredSites.length / pageSize));
  const paginatedSites = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSites.slice(start, start + pageSize);
  }, [filteredSites, currentPage, pageSize]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleSiteClick = (site: typeof sites[0]) => {
    openSlideOver('drill_site', {
      siteId: site.id,
      id: site.id,
      name: site.name,
      site_name: site.name,
      group: site.group,
      region: site.group,
      health: site.health,
      health_score: site.health,
      tat: site.tat,
      sla_percentage: site.tat,
      ppm: site.ppm,
      ppm_percentage: site.ppm,
      total_assets: site.assets,
      activeAssets: site.assets,
      pending_tickets: site.tickets,
      status: site.status,
    });
  };

  const activeMetricColor = METRIC_TABS.find((m) => m.id === metricMode)?.color || '#00C853';
  const activeMetricLabel = METRIC_TABS.find((m) => m.id === metricMode)?.label || 'Score';

  const visualizerData = useMemo(() => {
    const mapped = filteredSites.map((site) => {
      const val =
        metricMode === 'health'
          ? site.health
          : metricMode === 'tat'
          ? site.tat
          : metricMode === 'ppm'
          ? site.ppm
          : site.workforce;
      const color = val >= 85 ? '#00C853' : val >= 60 ? '#FF9100' : '#EF4444';
      return {
        ...site,
        shortName: site.name.length > 14 ? `${site.name.slice(0, 13)}…` : site.name,
        value: Number(val.toFixed(1)),
        color,
      };
    });

    const sorted = [...mapped].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    const sliced = topN === 'Top 5' ? sorted.slice(0, 5) : topN === 'Top 10' ? sorted.slice(0, 10) : sorted;

    return sliced.map((item, idx) => ({
      ...item,
      sliceColor: SITE_PALETTE[idx % SITE_PALETTE.length],
    }));
  }, [filteredSites, metricMode, topN]);

  const nonZeroPieData = useMemo(() => visualizerData.filter((d) => d.value > 0), [visualizerData]);

  const avgMetricValue = useMemo(() => {
    if (visualizerData.length === 0) return 0;
    return visualizerData.reduce((acc, d) => acc + d.value, 0) / visualizerData.length;
  }, [visualizerData]);

  return (
    <section style={{ marginBottom: '32px' }} className="animate-fade-in stagger-2">
      <div
        className="glass-card"
        style={{
          borderRadius: '20px',
          padding: '24px 28px',
          border: '1px solid var(--glass-border)',
          backgroundColor: 'var(--glass-bg)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--glass-border)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="#00C853" />
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Site Performance at a Glance
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#00C853',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(0, 200, 83, 0.12)',
                  border: '1px solid rgba(0, 200, 83, 0.3)',
                }}
              >
                {filteredSites.length} Parks Monitored
              </span>
            </div>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                margin: '4px 0 0 0',
              }}
            >
              Automated operational telemetry snapshot across all active Grade-A Horizon Industrial Parks.
            </p>
          </div>

          {/* Controls: Search, View Mode, Top N */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Filter parks..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '6px 12px 6px 30px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  minWidth: '160px',
                }}
              />
            </div>

            {/* View Mode Toggle: Table / Chart / Heatmap */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '0.6875rem',
                  fontWeight: viewMode === 'table' ? 700 : 500,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: viewMode === 'table' ? '#00C853' : 'transparent',
                  color: viewMode === 'table' ? '#0B0F19' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <TableIcon size={12} />
                <span>Table Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('chart')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '0.6875rem',
                  fontWeight: viewMode === 'chart' ? 700 : 500,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: viewMode === 'chart' ? '#00C853' : 'transparent',
                  color: viewMode === 'chart' ? '#0B0F19' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <BarChart2 size={12} />
                <span>Visualizer</span>
              </button>
            </div>

            {/* Metric Mode pills */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexWrap: 'wrap',
              }}
            >
              {METRIC_TABS.map((m) => {
                const isSelected = metricMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetricMode(m.id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.6875rem',
                      fontWeight: isSelected ? 700 : 500,
                      borderRadius: '6px',
                      border: isSelected ? `1px solid ${m.color}` : '1px solid var(--glass-border)',
                      backgroundColor: isSelected ? `${m.color}22` : 'transparent',
                      color: isSelected ? m.color : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}

              {/* Hide Column Dropdown (Placed immediately after Workforce Attendance) */}
              <div ref={hideColRef} style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  onClick={() => setIsHideColOpen((prev) => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    fontSize: '0.6875rem',
                    fontWeight: isHideColOpen || hiddenCount > 0 ? 700 : 500,
                    borderRadius: '6px',
                    border: isHideColOpen
                      ? '1px solid #00C853'
                      : hiddenCount > 0
                      ? '1px solid rgba(0, 200, 83, 0.4)'
                      : '1px solid var(--glass-border)',
                    backgroundColor: isHideColOpen
                      ? 'rgba(0, 200, 83, 0.15)'
                      : hiddenCount > 0
                      ? 'rgba(0, 200, 83, 0.08)'
                      : 'transparent',
                    color: isHideColOpen || hiddenCount > 0 ? '#00E676' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Hide or show table columns (Ticked = Hidden)"
                >
                  <EyeOff size={12} />
                  <span>Hide Column</span>
                  {hiddenCount > 0 && (
                    <span
                      style={{
                        padding: '1px 5px',
                        borderRadius: '999px',
                        backgroundColor: '#00C853',
                        color: '#0B0F19',
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      {hiddenCount}
                    </span>
                  )}
                  <ChevronDown
                    size={11}
                    style={{
                      transform: isHideColOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                </button>

                {isHideColOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      width: '260px',
                      maxHeight: '380px',
                      overflowY: 'auto',
                      backgroundColor: 'var(--card, #ffffff)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '10px',
                      padding: '10px',
                      boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)',
                      zIndex: 70,
                      backdropFilter: 'blur(12px)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        paddingBottom: '6px',
                        borderBottom: '1px solid var(--glass-border)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          Hide Columns
                        </div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                          Tick to hide · Untick to show
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const showAll: Record<string, boolean> = {};
                            TABLE_COLUMNS.forEach((c) => {
                              showAll[c.id] = false;
                            });
                            setUserToggledColumns(showAll);
                          }}
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            color: '#00C853',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 4px',
                          }}
                        >
                          Show All
                        </button>
                        <span style={{ color: 'var(--border-color)', fontSize: '0.625rem' }}>·</span>
                        <button
                          type="button"
                          onClick={() => setUserToggledColumns({})}
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 4px',
                          }}
                          title="Restore default hiding (all-zero columns hidden)"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {TABLE_COLUMNS.map((col) => {
                        const isZero = col.checkZero ? col.checkZero(sites) : false;
                        const hidden = isColumnHidden(col.id);

                        return (
                          <label
                            key={col.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              color: hidden ? 'var(--text-muted)' : 'var(--text-main)',
                              backgroundColor: hidden ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                              transition: 'background-color 0.12s ease',
                            }}
                            className="hover:bg-muted/40"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={hidden}
                                onChange={(e) => handleToggleColumn(col.id, e.target.checked)}
                                style={{
                                  cursor: 'pointer',
                                  accentColor: '#00C853',
                                  width: '13px',
                                  height: '13px',
                                }}
                              />
                              <span style={{ fontWeight: hidden ? 500 : 600 }}>{col.label}</span>
                            </div>
                            {isZero && (
                              <span
                                style={{
                                  fontSize: '0.5625rem',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                  color: '#EF4444',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                }}
                                title="All sites currently have 0 for this metric — hidden by default"
                              >
                                All 0%
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chart View (Visualizer) */}
        {viewMode === 'chart' && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Chart Type:
                </span>
                {CHART_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setChartType(t)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.6875rem',
                      fontWeight: chartType === t ? 700 : 500,
                      borderRadius: '6px',
                      border: chartType === t ? '1px solid #00C853' : '1px solid var(--glass-border)',
                      backgroundColor: chartType === t ? 'rgba(0, 200, 83, 0.15)' : 'transparent',
                      color: chartType === t ? '#00E676' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Show:
                </span>
                {(['Top 5', 'Top 10', 'All'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTopN(opt)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.6875rem',
                      fontWeight: topN === opt ? 700 : 500,
                      borderRadius: '6px',
                      border: topN === opt ? '1px solid #00C853' : '1px solid var(--glass-border)',
                      backgroundColor: topN === opt ? 'rgba(0, 200, 83, 0.15)' : 'transparent',
                      color: topN === opt ? '#00E676' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Visualizer Charts */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>
                Showing <strong style={{ color: 'var(--text-main)' }}>{visualizerData.length}</strong> of{' '}
                <strong style={{ color: 'var(--text-main)' }}>{filteredSites.length}</strong> Parks · Sorted by{' '}
                <strong style={{ color: activeMetricColor }}>{activeMetricLabel}</strong>
              </span>
              <span>Click any bar, slice, or park to inspect drill-down</span>
            </div>

            <div style={{ width: '100%', minHeight: '360px' }}>
              {visualizerData.length === 0 ? (
                <div style={{ height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No sites match your filter criteria
                </div>
              ) : chartType === 'Horizontal Bar' ? (
                <div style={{ maxHeight: '460px', overflowY: 'auto', paddingRight: '6px' }}>
                  <div style={{ height: Math.max(280, visualizerData.length * 38), width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        key={`hbar-${metricMode}-${topN}-${visualizerData.length}`}
                        data={visualizerData}
                        layout="vertical"
                        margin={{ top: 8, right: 32, left: 12, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                        <XAxis type="number" domain={[0, 100]} unit="%" fontSize={11} stroke="var(--text-muted)" />
                        <YAxis type="category" dataKey="shortName" fontSize={11} stroke="var(--text-muted)" width={140} />
                        <Tooltip content={<ThemeChartTooltip />} />
                        <Bar
                          dataKey="value"
                          name={activeMetricLabel}
                          radius={[0, 5, 5, 0]}
                          barSize={20}
                          isAnimationActive={false}
                          cursor="pointer"
                          onClick={(d: any) => {
                            const s = d?.payload || d;
                            if (s?.id) handleSiteClick(s);
                          }}
                        >
                          {visualizerData.map((entry, idx) => (
                            <Cell key={`site-hbar-${idx}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : chartType === 'Vertical Bar' ? (
                <div style={{ height: '380px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      key={`vbar-${metricMode}-${topN}-${visualizerData.length}`}
                      data={visualizerData}
                      margin={{ top: 12, right: 16, left: -10, bottom: 55 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="shortName" fontSize={10} stroke="var(--text-muted)" angle={-32} textAnchor="end" interval={0} height={68} />
                      <YAxis domain={[0, 100]} unit="%" fontSize={11} stroke="var(--text-muted)" />
                      <Tooltip content={<ThemeChartTooltip />} />
                      <Bar
                        dataKey="value"
                        name={activeMetricLabel}
                        radius={[5, 5, 0, 0]}
                        barSize={topN === 'Top 5' ? 38 : topN === 'Top 10' ? 28 : 20}
                        isAnimationActive={false}
                        cursor="pointer"
                        onClick={(d: any) => {
                          const s = d?.payload || d;
                          if (s?.id) handleSiteClick(s);
                        }}
                      >
                        {visualizerData.map((entry, idx) => (
                          <Cell key={`site-vbar-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : chartType === 'Line' ? (
                <div style={{ height: '380px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      key={`line-${metricMode}-${topN}-${visualizerData.length}`}
                      data={visualizerData}
                      margin={{ top: 12, right: 20, left: -10, bottom: 55 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="shortName" fontSize={10} stroke="var(--text-muted)" angle={-32} textAnchor="end" interval={0} height={68} />
                      <YAxis domain={[0, 100]} unit="%" fontSize={11} stroke="var(--text-muted)" />
                      <Tooltip content={<ThemeChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={activeMetricLabel}
                        stroke={activeMetricColor}
                        strokeWidth={2.5}
                        isAnimationActive={false}
                        dot={{ r: 4, fill: activeMetricColor, strokeWidth: 1.5 }}
                        activeDot={{
                          r: 6,
                          cursor: 'pointer',
                          onClick: (_e: any, payload: any) => {
                            const s = payload?.payload;
                            if (s?.id) handleSiteClick(s);
                          },
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : chartType === 'Area' ? (
                <div style={{ height: '380px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      key={`area-${metricMode}-${topN}-${visualizerData.length}`}
                      data={visualizerData}
                      margin={{ top: 12, right: 20, left: -10, bottom: 55 }}
                    >
                      <defs>
                        <linearGradient id="siteMetricAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeMetricColor} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={activeMetricColor} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="shortName" fontSize={10} stroke="var(--text-muted)" angle={-32} textAnchor="end" interval={0} height={68} />
                      <YAxis domain={[0, 100]} unit="%" fontSize={11} stroke="var(--text-muted)" />
                      <Tooltip content={<ThemeChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name={activeMetricLabel}
                        stroke={activeMetricColor}
                        strokeWidth={2.5}
                        fill="url(#siteMetricAreaGrad)"
                        isAnimationActive={false}
                        activeDot={{
                          r: 6,
                          cursor: 'pointer',
                          onClick: (_e: any, payload: any) => {
                            const s = payload?.payload;
                            if (s?.id) handleSiteClick(s);
                          },
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : chartType === 'Pie' || chartType === 'Donut' ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    alignItems: 'center',
                    minHeight: '360px',
                  }}
                >
                  {/* Pie / Donut Chart with Slice Labels */}
                  <div style={{ height: '360px', width: '100%', position: 'relative' }}>
                    {nonZeroPieData.length === 0 ? (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                        <div style={{ width: '130px', height: '130px', borderRadius: '50%', border: '8px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          0%
                        </div>
                        <span style={{ fontSize: '0.8125rem' }}>
                          All {visualizerData.length} displayed parks have 0% {activeMetricLabel}
                        </span>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart key={`${chartType}-${metricMode}-${topN}-${nonZeroPieData.length}`}>
                            <Tooltip content={<ThemeChartTooltip />} />
                            <Pie
                              data={nonZeroPieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={chartType === 'Donut' ? 68 : 0}
                              outerRadius={112}
                              paddingAngle={2}
                              isAnimationActive={false}
                              cursor="pointer"
                              labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
                              label={({ cx, cy, midAngle, outerRadius, shortName, value }) => {
                                const RADIAN = Math.PI / 180;
                                const radius = outerRadius + 16;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                return (
                                  <text
                                    x={x}
                                    y={y}
                                    fill="var(--text-main)"
                                    textAnchor={x > cx ? 'start' : 'end'}
                                    dominantBaseline="central"
                                    fontSize={10}
                                    fontWeight={700}
                                  >
                                    {nonZeroPieData.length <= 10 ? `${shortName} (${value}%)` : `${value}%`}
                                  </text>
                                );
                              }}
                              onClick={(d: any) => {
                                const s = d?.payload || d;
                                if (s?.id) handleSiteClick(s);
                              }}
                            >
                              {nonZeroPieData.map((entry, idx) => (
                                <Cell key={`site-pie-${idx}`} fill={entry.sliceColor} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        {chartType === 'Donut' && (
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
                            <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>
                              {avgMetricValue.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
                              Avg ({visualizerData.length} Parks)
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Interactive Park Legend (shows ALL Top 5 / Top 10 / All parks with exact % & colors) */}
                  <div
                    style={{
                      maxHeight: '340px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--table-even-bg)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {topN} Breakdown ({visualizerData.length} Parks)
                    </div>
                    {visualizerData.map((site, idx) => (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => handleSiteClick(site)}
                        className="clickable-row"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--glass-border)',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700, width: '20px' }}>
                            #{idx + 1}
                          </span>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: site.value > 0 ? site.sliceColor : 'var(--border-color)',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {site.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            color: site.color,
                            flexShrink: 0,
                          }}
                        >
                          {site.value}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ height: '400px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      key={`radar-${metricMode}-${topN}-${visualizerData.length}`}
                      data={visualizerData}
                      cx="50%"
                      cy="50%"
                      outerRadius={visualizerData.length > 10 ? 118 : 135}
                    >
                      <PolarGrid stroke="var(--border-color)" />
                      <PolarAngleAxis
                        dataKey="shortName"
                        fontSize={visualizerData.length > 10 ? 9 : 11}
                        stroke="var(--text-muted)"
                      />
                      <PolarRadiusAxis domain={[0, 100]} fontSize={9} stroke="var(--text-muted)" />
                      <Radar
                        name={activeMetricLabel}
                        dataKey="value"
                        stroke={activeMetricColor}
                        fill={activeMetricColor}
                        fillOpacity={0.35}
                        isAnimationActive={false}
                      />
                      <Tooltip content={<ThemeChartTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table Grid View */}
        {viewMode === 'table' && (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.8125rem',
                color: 'var(--text-main)',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--glass-border)',
                    textAlign: 'left',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {!isColumnHidden('rank') && (
                    <th style={{ padding: '10px 12px', width: '60px' }}>Rank</th>
                  )}
                  {!isColumnHidden('name') && (
                    <th
                      style={{ padding: '10px 12px', cursor: 'pointer' }}
                      onClick={() => handleSort('name')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Site / Park Name</span>
                        {sortField === 'name' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                  )}
                  {!isColumnHidden('group') && (
                    <th style={{ padding: '10px 12px' }}>Region / Group</th>
                  )}
                  {!isColumnHidden('health') && (
                    <th
                      style={{ padding: '10px 12px', cursor: 'pointer' }}
                      onClick={() => handleSort('health')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Overall Health</span>
                        {sortField === 'health' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                  )}
                  {!isColumnHidden('tat') && (
                    <th
                      style={{ padding: '10px 12px', cursor: 'pointer' }}
                      onClick={() => handleSort('tat')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>SLA Adherence</span>
                        {sortField === 'tat' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                  )}
                  {!isColumnHidden('ppm') && (
                    <th
                      style={{ padding: '10px 12px', cursor: 'pointer' }}
                      onClick={() => handleSort('ppm')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>PPM Adherence</span>
                        {sortField === 'ppm' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                  )}
                  {!isColumnHidden('workforce') && (
                    <th
                      style={{ padding: '10px 12px', cursor: 'pointer' }}
                      onClick={() => handleSort('workforce')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Workforce Attendance</span>
                        {sortField === 'workforce' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                  )}
                  {!isColumnHidden('assets') && (
                    <th
                      style={{ padding: '10px 12px', cursor: 'pointer' }}
                      onClick={() => handleSort('assets')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Active Assets</span>
                        {sortField === 'assets' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                  )}
                  {!isColumnHidden('tickets') && (
                    <th style={{ padding: '10px 12px' }}>Tickets (Open/Closed)</th>
                  )}
                  {!isColumnHidden('status') && (
                    <th style={{ padding: '10px 12px' }}>Status</th>
                  )}
                  {!isColumnHidden('action') && (
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedSites.map((site, index) => {
                  const rank = (currentPage - 1) * pageSize + index + 1;
                  const isHealthy = site.health >= 85;
                  const isWarning = site.health >= 60 && site.health < 85;

                  return (
                    <tr
                      key={site.id}
                      onClick={() => handleSiteClick(site)}
                      className="clickable-row"
                      style={{
                        borderBottom: '1px solid var(--glass-border)',
                        backgroundColor: index % 2 === 0 ? 'var(--table-even-bg)' : 'var(--table-odd-bg)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {!isColumnHidden('rank') && (
                        <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                          #{rank}
                        </td>
                      )}
                      {!isColumnHidden('name') && (
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {site.name}
                          </div>
                        </td>
                      )}
                      {!isColumnHidden('group') && (
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                          {site.group}
                        </td>
                      )}
                      {!isColumnHidden('health') && (
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                color: isHealthy ? '#00C853' : isWarning ? '#FF9100' : '#EF4444',
                                minWidth: '42px',
                              }}
                            >
                              {site.health}%
                            </span>
                            <div
                              style={{
                                width: '60px',
                                height: '6px',
                                borderRadius: '999px',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, site.health)}%`,
                                  height: '100%',
                                  backgroundColor: isHealthy ? '#00C853' : isWarning ? '#FF9100' : '#EF4444',
                                  borderRadius: '999px',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      )}
                      {!isColumnHidden('tat') && (
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: site.tat >= 95 ? 'rgba(0, 200, 83, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: site.tat >= 95 ? '#00E676' : '#EF4444',
                              border: `1px solid ${site.tat >= 95 ? 'rgba(0, 200, 83, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            }}
                          >
                            {site.tat}%
                          </span>
                        </td>
                      )}
                      {!isColumnHidden('ppm') && (
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: site.ppm >= 90 ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 145, 0, 0.15)',
                              color: site.ppm >= 90 ? '#00E676' : '#FF9100',
                              border: `1px solid ${site.ppm >= 90 ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 145, 0, 0.3)'}`,
                            }}
                          >
                            {site.ppm}%
                          </span>
                        </td>
                      )}
                      {!isColumnHidden('workforce') && (
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: site.workforce >= 85 ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 145, 0, 0.15)',
                              color: site.workforce >= 85 ? '#00E676' : '#FF9100',
                              border: `1px solid ${site.workforce >= 85 ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 145, 0, 0.3)'}`,
                            }}
                          >
                            {site.workforce}%
                          </span>
                        </td>
                      )}
                      {!isColumnHidden('assets') && (
                        <td style={{ padding: '12px', fontWeight: 600 }}>
                          {site.assets.toLocaleString()}
                        </td>
                      )}
                      {!isColumnHidden('tickets') && (
                        <td style={{ padding: '12px' }}>
                          <span style={{ color: site.tickets > 0 ? '#FF7A45' : 'var(--text-muted)', fontWeight: 600 }}>
                            {site.tickets} open
                          </span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                          <span style={{ color: '#00C853', fontWeight: 600 }}>
                            {site.closed} closed
                          </span>
                        </td>
                      )}
                      {!isColumnHidden('status') && (
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: isHealthy ? 'rgba(0, 200, 83, 0.12)' : 'rgba(255, 91, 34, 0.12)',
                              color: isHealthy ? '#00E676' : '#FF7A45',
                              border: `1px solid ${isHealthy ? 'rgba(0, 200, 83, 0.35)' : 'rgba(255, 91, 34, 0.35)'}`,
                            }}
                          >
                            <span
                              className="pulse-dot"
                              style={{
                                width: '5px',
                                height: '5px',
                                backgroundColor: isHealthy ? '#00E676' : '#FF5B22',
                              }}
                            />
                            <span>{site.status}</span>
                          </span>
                        </td>
                      )}
                      {!isColumnHidden('action') && (
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSiteClick(site);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(0, 200, 83, 0.12)',
                              color: '#00E676',
                              border: '1px solid rgba(0, 200, 83, 0.3)',
                              cursor: 'pointer',
                            }}
                          >
                            <span>Inspect</span>
                            <ExternalLink size={11} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '16px',
                marginTop: '8px',
                borderTop: '1px solid var(--glass-border)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  Showing {filteredSites.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredSites.length)} of {filteredSites.length} parks
                </div>

                {/* Rows per page selector: multiples of 5 starting from 5 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    Rows per page:
                  </span>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(148, 163, 184, 0.12)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    {[5, 10, 15, 20, 25].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.6875rem',
                          fontWeight: pageSize === size ? 700 : 500,
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: pageSize === size ? '#00C853' : 'transparent',
                          color: pageSize === size ? '#0B0F19' : 'var(--text-muted)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--glass-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    color: currentPage <= 1 ? 'var(--text-muted)' : 'var(--text-main)',
                    opacity: currentPage <= 1 ? 0.45 : 1,
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--glass-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    color: currentPage >= totalPages ? 'var(--text-muted)' : 'var(--text-main)',
                    opacity: currentPage >= totalPages ? 0.45 : 1,
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
export default SitePerformanceOverview;