import { useState, useRef, useEffect, useMemo } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useServiceDesk } from '@/hooks/useGroupedDashboard';
import {
  Ticket,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useDashboardFilterOptions } from '@/hooks/useDashboardFilterOptions';

type ChartType =
  | 'Vertical Bar'
  | 'Horizontal Bar'
  | 'Line'
  | 'Area'
  | 'Donut'
  | 'Pie'
  | 'Radar';

const CHART_TYPES: ChartType[] = [
  'Vertical Bar',
  'Horizontal Bar',
  'Line',
  'Area',
  'Donut',
  'Pie',
  'Radar',
];

const TOP_N_OPTIONS = ['Top 5', 'Top 10', 'All'] as const;
type TopNOption = (typeof TOP_N_OPTIONS)[number];

const CATEGORY_COLORS = [
  '#FF5B22',
  '#F97316',
  '#FB923C',
  '#F59E0B',
  '#EAB308',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F43F5E',
];

// Custom high-contrast chart tooltip for dark dashboard
const ServiceDeskChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: '#0F172A',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.8), 0 0 15px rgba(0, 0, 0, 0.5)',
          color: '#FFFFFF',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        {label && (
          <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
            {label}
          </div>
        )}
        {payload.map((entry: any, index: number) => {
          const color = entry.color || entry.fill || entry.payload?.fill || '#FF5B22';
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
                color: '#FFFFFF',
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
                <span style={{ color: '#CBD5E1' }}>{name}</span>
              </div>
              <span style={{ fontWeight: 800, color: '#FFFFFF', fontFamily: 'monospace' }}>
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

export function ServiceDeskSLA() {
  const { openSlideOver, filters, updateFilter } = useDashboard();
  const { data, isPending: isLoading } = useServiceDesk(filters);
  const { sites } = useDashboardFilterOptions(filters);

  const [chartType, setChartType] = useState<ChartType>('Vertical Bar');
  const [topN, setTopN] = useState<TopNOption>('Top 5');
  const [chartTypeDropdownOpen, setChartTypeDropdownOpen] = useState(false);
  const [topNDropdownOpen, setTopNDropdownOpen] = useState(false);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);

  const chartDropdownRef = useRef<HTMLDivElement>(null);
  const topNDropdownRef = useRef<HTMLDivElement>(null);
  const siteDropdownRef = useRef<HTMLDivElement>(null);

  const handleCategoryDrill = (d: any) => {
    const cat = d?.category || d?.payload?.category || d?.name || d?.payload?.name;
    openSlideOver('drill_ticket', { type: 'category', value: cat, category: cat } as never);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (chartDropdownRef.current && !chartDropdownRef.current.contains(e.target as Node)) {
        setChartTypeDropdownOpen(false);
      }
      if (topNDropdownRef.current && !topNDropdownRef.current.contains(e.target as Node)) {
        setTopNDropdownOpen(false);
      }
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(e.target as Node)) {
        setSiteDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const summary = data?.summary;
  const slaStatus = data?.sla_status;
  const total = summary?.total ?? 0;
  const open = summary?.open ?? 0;
  const inProgress = summary?.in_progress ?? 0;
  const closed = summary?.closed ?? 0;

  const withinTat = slaStatus?.within_sla ?? 0;
  const outsideTat = slaStatus?.breached ?? 0;
  const tatCompliance = Number(slaStatus?.sla_percentage ?? (total > 0 ? (withinTat / total) * 100 : 100));
  const avgResolution = data?.avg_resolution_time_hours ? `${data.avg_resolution_time_hours}h` : '0h';

  const rawCategories = useMemo(() => {
    return (data?.tickets_by_category ?? [])
      .map((c, index) => ({
        category: c.category,
        count: Number(c.count || 0),
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [data?.tickets_by_category]);

  const displayedCategories = useMemo(() => {
    if (topN === 'Top 5') return rawCategories.slice(0, 5);
    if (topN === 'Top 10') return rawCategories.slice(0, 10);
    return rawCategories;
  }, [rawCategories, topN]);

  const priorityTickets = data?.priority_tickets ?? [];

  const selectedSiteObj = sites.find((s) => s.id === filters.site_id);
  const selectedSiteName = selectedSiteObj?.name || 'All Sites';

  return (
    <section id="servicedesk-section" style={{ marginBottom: '32px' }} className="animate-fade-in stagger-4">
      {/* Section Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 91, 34, 0.15)',
              border: '1px solid rgba(255, 91, 34, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF7A45',
            }}
          >
            <Ticket size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Service Desk & SLA Intelligence
            </h3>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                margin: '2px 0 0 0',
              }}
            >
              {total.toLocaleString()} total service tickets processed across {selectedSiteName}
            </p>
          </div>
        </div>

        {/* Site Pill Dropdown */}
        <div ref={siteDropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              backgroundColor: 'var(--glass-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{selectedSiteName}</span>
            <ChevronDown
              size={14}
              style={{
                color: 'var(--text-muted)',
                transform: siteDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>
          {siteDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                width: '200px',
                maxHeight: '260px',
                overflowY: 'auto',
                backgroundColor: 'var(--dropdown-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-elevation)',
                zIndex: 60,
                padding: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  updateFilter('site_id', null);
                  setSiteDropdownOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: !filters.site_id ? 'rgba(255, 91, 34, 0.15)' : 'transparent',
                  color: !filters.site_id ? '#FF7A45' : 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: !filters.site_id ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                All Sites
              </button>
              {sites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    updateFilter('site_id', site.id);
                    setSiteDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: filters.site_id === site.id ? 'rgba(255, 91, 34, 0.15)' : 'transparent',
                    color: filters.site_id === site.id ? '#FF7A45' : 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: filters.site_id === site.id ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {site.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top 4 Metric KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        {/* Total Tickets */}
        <div
          onClick={() => openSlideOver('drill_ticket', { type: 'status', value: 'all' } as never)}
          className="glass-card glass-card-lift"
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(255, 91, 34, 0.9) 0%, rgba(194, 65, 12, 0.95) 100%)',
            border: '1px solid rgba(255, 91, 34, 0.4)',
            boxShadow: '0 8px 24px rgba(255, 91, 34, 0.25)',
            color: '#FFFFFF',
            cursor: 'pointer',
            borderRadius: '12px',
          }}
          title="Click to inspect all tickets"
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
            Total Tickets
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, margin: '6px 0 2px 0' }}>
            {total.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>All logged requests • Click to drill</span>
        </div>

        {/* Open */}
        <div
          onClick={() => openSlideOver('drill_ticket', { type: 'status', value: 'open' } as never)}
          className="glass-card glass-card-lift"
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.85) 0%, rgba(76, 29, 149, 0.95) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
            color: '#FFFFFF',
            cursor: 'pointer',
            borderRadius: '12px',
          }}
          title="Click to inspect open tickets"
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
            Open
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, margin: '6px 0 2px 0' }}>
            {open.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>Awaiting assignment • Click to drill</span>
        </div>

        {/* In Progress */}
        <div
          onClick={() => openSlideOver('drill_ticket', { type: 'status', value: 'in_progress' } as never)}
          className="glass-card glass-card-lift"
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.85) 0%, rgba(180, 83, 9, 0.95) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 8px 24px rgba(217, 119, 6, 0.25)',
            color: '#FFFFFF',
            cursor: 'pointer',
            borderRadius: '12px',
          }}
          title="Click to inspect in-progress tickets"
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
            In Progress
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, margin: '6px 0 2px 0' }}>
            {inProgress.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>Active work underway • Click to drill</span>
        </div>

        {/* Closed */}
        <div
          onClick={() => openSlideOver('drill_ticket', { type: 'status', value: 'closed' } as never)}
          className="glass-card glass-card-lift"
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(0, 200, 83, 0.85) 0%, rgba(4, 120, 87, 0.95) 100%)',
            border: '1px solid rgba(0, 200, 83, 0.4)',
            boxShadow: '0 8px 24px rgba(0, 200, 83, 0.25)',
            color: '#FFFFFF',
            cursor: 'pointer',
            borderRadius: '12px',
          }}
          title="Click to inspect closed tickets"
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
            Closed
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, margin: '6px 0 2px 0' }}>
            {closed.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>Resolved & verified • Click to drill</span>
        </div>
      </div>

      {/* 3 Large Analytical Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: SLA Status & Compliance */}
        <div
          onClick={() => openSlideOver('kpi_ticket_sla')}
          className="glass-card glass-card-lift"
          style={{
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            minHeight: '340px',
          }}
          title="Click to view detailed SLA drill-down"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  SLA Status & Compliance
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Tracks ticket resolution performance against SLA targets.
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  backgroundColor: tatCompliance >= 90 ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 91, 34, 0.15)',
                  color: tatCompliance >= 90 ? '#00E676' : '#FF5B22',
                  border: `1px solid ${tatCompliance >= 90 ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 91, 34, 0.3)'}`,
                }}
              >
                {tatCompliance.toFixed(1)}% Compliance
              </span>
            </div>

            {/* Within TAT box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '12px',
                backgroundColor: 'rgba(0, 200, 83, 0.1)',
                border: '1px solid rgba(0, 200, 83, 0.3)',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#00E676" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#00E676' }}>Within TAT</span>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00E676' }}>
                {withinTat.toLocaleString()}
              </span>
            </div>

            {/* Outside TAT box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '12px',
                backgroundColor: 'rgba(248, 113, 113, 0.08)',
                border: '1px solid rgba(248, 113, 113, 0.25)',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} color="#F87171" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F87171' }}>Outside TAT</span>
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#F87171' }}>
                {outsideTat.toLocaleString()}
              </span>
            </div>

            {/* Progress Track */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>TAT Compliance</span>
                <strong style={{ color: 'var(--text-primary)' }}>{tatCompliance.toFixed(1)}%</strong>
              </div>
              <div
                style={{
                  height: '8px',
                  width: '100%',
                  backgroundColor: 'var(--border-color)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(Math.max(tatCompliance, 0), 100)}%`,
                    background: 'linear-gradient(90deg, #00E676 0%, #00A843 100%)',
                    borderRadius: '4px',
                    transition: 'width 0.8s ease',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <span>Avg Resolution Time</span>
            <strong style={{ color: 'var(--text-primary)' }}>{avgResolution}</strong>
          </div>
        </div>

        {/* Card 2: Tickets by Category */}
        <div
          className="glass-card glass-card-lift"
          style={{
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '340px',
          }}
        >
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Tickets by Category
                </h4>

                {/* Chart switchers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Visualizer Type Pill */}
                  <div ref={chartDropdownRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChartTypeDropdownOpen(!chartTypeDropdownOpen);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        backgroundColor: 'var(--glass-bg, rgba(255, 255, 255, 0.06))',
                        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                        borderRadius: '6px',
                        color: 'var(--text-primary, #FFFFFF)',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{chartType}</span>
                      <ChevronDown size={12} />
                    </button>
                    {chartTypeDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          minWidth: '130px',
                          backgroundColor: 'var(--dropdown-bg, #111827)',
                          border: '1px solid var(--dropdown-border, rgba(255, 255, 255, 0.2))',
                          borderRadius: '8px',
                          boxShadow: 'var(--shadow-elevation, 0 16px 36px -4px rgba(0, 0, 0, 0.8))',
                          zIndex: 100,
                          padding: '4px',
                        }}
                      >
                        {CHART_TYPES.map((type) => {
                          const isSelected = chartType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setChartType(type);
                                setChartTypeDropdownOpen(false);
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '7px 10px',
                                borderRadius: '5px',
                                border: 'none',
                                backgroundColor: isSelected ? 'rgba(255, 91, 34, 0.25)' : 'transparent',
                                color: isSelected ? '#FF7A45' : 'var(--text-primary, #FFFFFF)',
                                fontSize: '0.75rem',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Top N Dropdown */}
                  <div ref={topNDropdownRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTopNDropdownOpen(!topNDropdownOpen);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        backgroundColor: 'var(--glass-bg, rgba(255, 255, 255, 0.06))',
                        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.15))',
                        borderRadius: '6px',
                        color: 'var(--text-primary, #FFFFFF)',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{topN}</span>
                      <ChevronDown size={12} />
                    </button>
                    {topNDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          right: 0,
                          minWidth: '100px',
                          backgroundColor: 'var(--dropdown-bg, #111827)',
                          border: '1px solid var(--dropdown-border, rgba(255, 255, 255, 0.2))',
                          borderRadius: '8px',
                          boxShadow: 'var(--shadow-elevation, 0 16px 36px -4px rgba(0, 0, 0, 0.8))',
                          zIndex: 100,
                          padding: '4px',
                        }}
                      >
                        {TOP_N_OPTIONS.map((opt) => {
                          const isSelected = topN === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTopN(opt);
                                setTopNDropdownOpen(false);
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '7px 10px',
                                borderRadius: '5px',
                                border: 'none',
                                backgroundColor: isSelected ? 'rgba(255, 91, 34, 0.25)' : 'transparent',
                                color: isSelected ? '#FF7A45' : 'var(--text-primary, #FFFFFF)',
                                fontSize: '0.75rem',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Distribution of logged service requests across categories.
              </p>
            </div>

            {/* Chart Container */}
            <div style={{ height: '220px', width: '100%', position: 'relative' }}>
              {displayedCategories.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  No category data available
                </div>
              ) : chartType === 'Horizontal Bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayedCategories} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                    <XAxis type="number" fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
                    <YAxis type="category" dataKey="category" fontSize={10} stroke="var(--text-muted)" width={85} tickFormatter={(val) => (val?.length > 13 ? `${val.substring(0, 12)}…` : val)} />
                    <Tooltip content={<ServiceDeskChartTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Tickets"
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                      cursor="pointer"
                      onClick={(d) => handleCategoryDrill(d)}
                    >
                      {displayedCategories.map((entry, index) => (
                        <Cell key={`cell-hbar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : chartType === 'Vertical Bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayedCategories} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="category" fontSize={9} stroke="var(--text-muted)" angle={-25} textAnchor="end" interval={0} tickFormatter={(val) => (val?.length > 10 ? `${val.substring(0, 9)}…` : val)} />
                    <YAxis fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
                    <Tooltip content={<ServiceDeskChartTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Tickets"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                      cursor="pointer"
                      onClick={(d) => handleCategoryDrill(d)}
                    >
                      {displayedCategories.map((entry, index) => (
                        <Cell key={`cell-vbar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : chartType === 'Line' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayedCategories} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="category" fontSize={9} stroke="var(--text-muted)" angle={-25} textAnchor="end" interval={0} tickFormatter={(val) => (val?.length > 10 ? `${val.substring(0, 9)}…` : val)} />
                    <YAxis fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
                    <Tooltip content={<ServiceDeskChartTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="#FF5B22" strokeWidth={2.5} dot={{ r: 4, fill: '#FF5B22' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : chartType === 'Area' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayedCategories} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                    <defs>
                      <linearGradient id="ticketAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF5B22" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FF5B22" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="category" fontSize={9} stroke="var(--text-muted)" angle={-25} textAnchor="end" interval={0} tickFormatter={(val) => (val?.length > 10 ? `${val.substring(0, 9)}…` : val)} />
                    <YAxis fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
                    <Tooltip content={<ServiceDeskChartTooltip />} />
                    <Area type="monotone" dataKey="count" stroke="#FF5B22" strokeWidth={2.2} fill="url(#ticketAreaGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : chartType === 'Donut' || chartType === 'Pie' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ServiceDeskChartTooltip />} />
                    <Pie
                      data={displayedCategories}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={chartType === 'Donut' ? 45 : 0}
                      outerRadius={75}
                      paddingAngle={chartType === 'Donut' ? 3 : 1}
                      cursor="pointer"
                      onClick={(d) => handleCategoryDrill(d)}
                    >
                      {displayedCategories.map((entry, index) => (
                        <Cell key={`cell-pie-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={displayedCategories} cx="50%" cy="50%" outerRadius={70}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis dataKey="category" fontSize={9} stroke="var(--text-muted)" tickFormatter={(val) => (val?.length > 8 ? `${val.substring(0, 7)}…` : val)} />
                    <PolarRadiusAxis fontSize={9} stroke="var(--text-muted)" />
                    <Radar name="Tickets" dataKey="count" stroke="#FF5B22" fill="#FF5B22" fillOpacity={0.4} />
                    <Tooltip content={<ServiceDeskChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <span>Showing {topN === 'All' ? rawCategories.length : topN} of {rawCategories.length} Categories</span>
            <span style={{ color: '#00E676', fontWeight: 700 }}>{rawCategories.length} Categories</span>
          </div>
        </div>

        {/* Card 3: Priority Escalations */}
        <div
          onClick={() => openSlideOver('drill_ticket', { type: 'priority', value: 'high' } as never)}
          className="glass-card glass-card-lift"
          style={{
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            minHeight: '340px',
          }}
          title="Click to view priority escalations drill-down"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Priority Escalations
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Monitors urgent tickets and critical escalation resolution times.
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  backgroundColor: priorityTickets.length > 0 ? 'rgba(255, 91, 34, 0.15)' : 'rgba(0, 200, 83, 0.15)',
                  color: priorityTickets.length > 0 ? '#FF5B22' : '#00C853',
                  border: `1px solid ${priorityTickets.length > 0 ? 'rgba(255, 91, 34, 0.3)' : 'rgba(0, 200, 83, 0.3)'}`,
                }}
              >
                {priorityTickets.length > 0 ? `${priorityTickets.length} Escalations` : '0 Urgent'}
              </span>
            </div>

            {priorityTickets.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '30px 10px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 200, 83, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px',
                    color: '#00E676',
                  }}
                >
                  <CheckCircle2 size={24} />
                </div>
                <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  No Priority Tickets
                </strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '240px' }}>
                  All service requests across nationwide facilities are operating within normal priority thresholds.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {priorityTickets.slice(0, 4).map((ticket, idx) => (
                  <div
                    key={ticket.id || idx}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#EF4444' }}>
                      #{ticket.ticket_number || ticket.id}
                    </span>
                    <span
                      style={{
                        color: 'var(--text-primary)',
                        maxWidth: '160px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ticket.heading || 'Escalated Request'}
                    </span>
                    <span style={{ fontWeight: 700, color: '#EF4444', fontSize: '0.6875rem' }}>
                      {ticket.priority || 'P1'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <span>Escalation Health</span>
            <strong style={{ color: priorityTickets.length > 0 ? '#FF5B22' : '#00E676' }}>
              {priorityTickets.length > 0 ? `${priorityTickets.length} Pending Actions` : 'Healthy'}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}