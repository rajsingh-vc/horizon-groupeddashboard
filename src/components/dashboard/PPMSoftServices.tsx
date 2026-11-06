import { useState, useRef, useEffect, useMemo } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { usePPMOperations } from '@/hooks/useGroupedDashboard';
import {
  ClipboardCheck,
  ChevronDown,
  Check,
  Search,
  Sparkles,
  BarChart2,
  ListFilter,
  CheckCircle2,
  AlertTriangle,
  Clock,
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
  Legend,
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

type OperationMode = 'ppm' | 'soft_services';

type ChartType =
  | 'Vertical Bar'
  | 'Horizontal Bar'
  | 'Line'
  | 'Area'
  | 'Donut'
  | 'Radar';

const CHART_TYPES: ChartType[] = [
  'Vertical Bar' ,
  'Horizontal Bar',
  'Line',
  'Area',
  'Donut',
  'Radar',
];

const TOP_N_OPTIONS = ['Top 5', 'Top 10', 'All'] as const;
type TopNOption = (typeof TOP_N_OPTIONS)[number];

export function PPMSoftServices() {
  const { openSlideOver, filters, updateFilter } = useDashboard();
  const { data, isPending: isLoading } = usePPMOperations(filters);
  const { sites } = useDashboardFilterOptions(filters);

  const [mode, setMode] = useState<OperationMode>('ppm');
  const [chartType, setChartType] = useState<ChartType>('Vertical Bar');
  const [topN, setTopN] = useState<TopNOption>('Top 5');
  const [chartDropdownOpen, setChartDropdownOpen] = useState(false);
  const [topNDropdownOpen, setTopNDropdownOpen] = useState(false);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'highest' | 'lowest' | 'alphabetical'>('highest');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const chartDropdownRef = useRef<HTMLDivElement>(null);
  const topNDropdownRef = useRef<HTMLDivElement>(null);
  const siteDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (chartDropdownRef.current && !chartDropdownRef.current.contains(e.target as Node)) {
        setChartDropdownOpen(false);
      }
      if (topNDropdownRef.current && !topNDropdownRef.current.contains(e.target as Node)) {
        setTopNDropdownOpen(false);
      }
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(e.target as Node)) {
        setSiteDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ppmData = data?.ppm;
  const softServicesData = data?.soft_services;

  const activeStats = useMemo(() => {
    if (mode === 'ppm') {
      const completed = ppmData?.completed ?? 0;
      const pending = ppmData?.pending ?? 0;
      const overdue = ppmData?.overdue ?? 0;
      const total = ppmData?.total ?? (completed + pending + overdue);
      const compliance = Number(ppmData?.completion_percentage ?? (total > 0 ? (completed / total) * 100 : 0));
      return { completed, pending, overdue, total, compliance };
    } else {
      const completed = softServicesData?.completed ?? 0;
      const pending = softServicesData?.pending ?? 0;
      const overdue = softServicesData?.overdue ?? 0;
      const total = softServicesData?.total ?? (completed + pending + overdue);
      const compliance = Number(softServicesData?.completion_percentage ?? (total > 0 ? (completed / total) * 100 : 0));
      return { completed, pending, overdue, total, compliance };
    }
  }, [mode, ppmData, softServicesData]);

  const rawPlannedVsAchieved = useMemo(() => {
    if (mode === 'soft_services') {
      return [
        {
          category: 'DAILY CHECK SHEET - DG SET',
          planned: softServicesData?.total ?? 60,
          achieved: softServicesData?.completed ?? 0,
        },
      ];
    }
    return (ppmData?.by_category ?? []).map((item) => ({
      category: item.category,
      planned: Number(item.total || 0),
      achieved: Number(item.completed || 0),
    }));
  }, [mode, ppmData, softServicesData]);

  const displayedPlannedVsAchieved = useMemo(() => {
    if (topN === 'Top 5') return rawPlannedVsAchieved.slice(0, 5);
    if (topN === 'Top 10') return rawPlannedVsAchieved.slice(0, 10);
    return rawPlannedVsAchieved;
  }, [rawPlannedVsAchieved, topN]);

  const categoryComplianceList = useMemo(() => {
    let items =
      mode === 'soft_services'
        ? [
            {
              name: 'DAILY CHECK SHEET - DG SET',
              completed: Number(softServicesData?.completed ?? 0),
              total: Number(softServicesData?.total ?? 60),
              percentage: Number(softServicesData?.completion_percentage ?? 0),
            },
          ]
        : (ppmData?.by_category ?? []).map((cat) => ({
            name: cat.category,
            completed: Number(cat.completed || 0),
            total: Number(cat.total || 0),
            percentage: Number(cat.completion_percentage || 0),
          }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((c) => c.name.toLowerCase().includes(q));
    }

    if (sortBy === 'highest') {
      items.sort((a, b) => b.percentage - a.percentage);
    } else if (sortBy === 'lowest') {
      items.sort((a, b) => a.percentage - b.percentage);
    } else {
      items.sort((a, b) => a.name.localeCompare(b.name));
    }

    return items;
  }, [ppmData, searchQuery, sortBy]);

  const selectedSiteObj = sites.find((s) => s.id === filters.site_id);
  const selectedSiteName = selectedSiteObj?.name || 'All Sites';

  return (
    <section id="ppm-section" style={{ marginBottom: '32px' }} className="animate-fade-in stagger-5">
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
              backgroundColor: 'rgba(0, 200, 83, 0.15)',
              border: '1px solid rgba(0, 200, 83, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00E676',
            }}
          >
            <ClipboardCheck size={20} strokeWidth={2.2} />
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
              Planned Preventive Maintenance & Soft Services
            </h3>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                margin: '2px 0 0 0',
              }}
            >
              Comprehensive maintenance schedules, operational workflows, and service audits across {selectedSiteName}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Mode Pill Toggle */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--glass-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '3px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setMode('ppm')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: mode === 'ppm' ? '#00C853' : 'transparent',
                color: mode === 'ppm' ? '#FFFFFF' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              PPM Operations
            </button>
            <button
              type="button"
              onClick={() => setMode('soft_services')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: mode === 'soft_services' ? '#FF5B22' : 'transparent',
                color: mode === 'soft_services' ? '#FFFFFF' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Soft Services Operations
            </button>
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
                    backgroundColor: !filters.site_id ? 'rgba(0, 200, 83, 0.15)' : 'transparent',
                    color: !filters.site_id ? '#00E676' : 'var(--text-primary)',
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
                      backgroundColor: filters.site_id === site.id ? 'rgba(0, 200, 83, 0.15)' : 'transparent',
                      color: filters.site_id === site.id ? '#00E676' : 'var(--text-primary)',
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
      </div>

      {/* 4 Top Metric KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        {/* Compliance Rate */}
        <div
          onClick={() => openSlideOver(mode === 'soft_services' ? 'drill_soft_services' : 'drill_ppm')}
          className="glass-card glass-card-lift"
          style={{
            padding: '16px 20px',
            background: mode === 'ppm'
              ? 'linear-gradient(135deg, rgba(0, 200, 83, 0.9) 0%, rgba(4, 120, 87, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 91, 34, 0.9) 0%, rgba(194, 65, 12, 0.95) 100%)',
            border: `1px solid ${mode === 'ppm' ? 'rgba(0, 200, 83, 0.4)' : 'rgba(255, 91, 34, 0.4)'}`,
            boxShadow: `0 8px 24px ${mode === 'ppm' ? 'rgba(0, 200, 83, 0.25)' : 'rgba(255, 91, 34, 0.25)'}`,
            color: '#FFFFFF',
            cursor: 'pointer',
            borderRadius: '12px',
          }}
          title="Click to inspect compliance audit"
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
            {mode === 'ppm' ? 'PPM Compliance' : 'Soft Services Compliance'}
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, margin: '6px 0 2px 0' }}>
            {activeStats.compliance.toFixed(1)}%
          </div>
          <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>
            {activeStats.compliance >= 90 ? 'High performing' : 'Requires escalation'} • Click to drill
          </span>
        </div>

        {/* Completed */}
        <div
          onClick={() => openSlideOver(mode === 'soft_services' ? 'drill_soft_services' : 'drill_ppm', { status: 'completed' } as never)}
          className="glass-card glass-card-lift"
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.85) 0%, rgba(5, 150, 105, 0.95) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
            color: '#FFFFFF',
            cursor: 'pointer',
            borderRadius: '12px',
          }}
          title="Click to inspect completed tasks"
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
            Completed Tasks
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, margin: '6px 0 2px 0' }}>
            {activeStats.completed.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>Successfully verified • Click to drill</span>
        </div>

        {/* Pending */}
        <div
          onClick={() => openSlideOver(mode === 'soft_services' ? 'drill_soft_services' : 'drill_ppm', { status: 'pending' } as never)}
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
          title="Click to inspect pending tasks"
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
            Pending Tasks
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, margin: '6px 0 2px 0' }}>
            {activeStats.pending.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>Within schedule • Click to drill</span>
        </div>

        {/* Overdue */}
        <div
          onClick={() => openSlideOver(mode === 'soft_services' ? 'drill_soft_services' : 'drill_ppm', { status: 'overdue' } as never)}
          className="glass-card glass-card-lift"
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.85) 0%, rgba(185, 28, 28, 0.95) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)',
            color: '#FFFFFF',
            cursor: 'pointer',
            borderRadius: '12px',
          }}
          title="Click to inspect overdue tasks"
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
            Overdue Tasks
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.1, margin: '6px 0 2px 0' }}>
            {activeStats.overdue.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>Requires immediate intervention</span>
        </div>
      </div>

      {/* 2 Large Analytic Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Planned vs Achieved Checklist Compliance */}
        <div
          className="glass-card glass-card-lift"
          style={{
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '380px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Planned vs. Achieved Compliance
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Execution parity across scheduled maintenance categories.
                </p>
              </div>

              {/* Chart Switcher & Top N Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Chart Type Dropdown */}
                <div ref={chartDropdownRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setChartDropdownOpen(!chartDropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: 'var(--glass-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span>{chartType}</span>
                    <ChevronDown size={12} />
                  </button>
                  {chartDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        right: 0,
                        width: '130px',
                        backgroundColor: 'var(--dropdown-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        boxShadow: 'var(--shadow-elevation)',
                        zIndex: 60,
                        padding: '4px',
                      }}
                    >
                      {CHART_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setChartType(type);
                            setChartDropdownOpen(false);
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: chartType === type ? 'rgba(0, 200, 83, 0.15)' : 'transparent',
                            color: chartType === type ? '#00E676' : 'var(--text-primary)',
                            fontSize: '0.75rem',
                            fontWeight: chartType === type ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top N Dropdown */}
                <div ref={topNDropdownRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setTopNDropdownOpen(!topNDropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: 'var(--glass-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
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
                        width: '100px',
                        backgroundColor: 'var(--dropdown-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        boxShadow: 'var(--shadow-elevation)',
                        zIndex: 60,
                        padding: '4px',
                      }}
                    >
                      {TOP_N_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setTopN(opt);
                            setTopNDropdownOpen(false);
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: topN === opt ? 'rgba(0, 200, 83, 0.15)' : 'transparent',
                            color: topN === opt ? '#00E676' : 'var(--text-primary)',
                            fontSize: '0.75rem',
                            fontWeight: topN === opt ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Visualizer Chart */}
            <div style={{ height: '240px', width: '100%' }}>
              {displayedPlannedVsAchieved.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  No planned checklist data available
                </div>
              ) : chartType === 'Horizontal Bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayedPlannedVsAchieved} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                    <XAxis type="number" fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
                    <YAxis type="category" dataKey="category" fontSize={10} stroke="var(--text-muted)" width={95} tickFormatter={(val) => (val?.length > 14 ? `${val.substring(0, 13)}…` : val)} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--dropdown-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-primary)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar dataKey="planned" name="Planned" fill="#3B82F6" radius={[0, 3, 3, 0]} barSize={12} />
                    <Bar dataKey="achieved" name="Achieved" fill="#00C853" radius={[0, 3, 3, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : chartType === 'Vertical Bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayedPlannedVsAchieved} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="category" fontSize={9} stroke="var(--text-muted)" angle={-25} textAnchor="end" interval={0} tickFormatter={(val) => (val?.length > 10 ? `${val.substring(0, 9)}…` : val)} />
                    <YAxis fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--dropdown-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-primary)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Bar dataKey="planned" name="Planned" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={14} />
                    <Bar dataKey="achieved" name="Achieved" fill="#00C853" radius={[3, 3, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : chartType === 'Line' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayedPlannedVsAchieved} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="category" fontSize={9} stroke="var(--text-muted)" angle={-25} textAnchor="end" interval={0} tickFormatter={(val) => (val?.length > 10 ? `${val.substring(0, 9)}…` : val)} />
                    <YAxis fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--dropdown-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-primary)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="planned" name="Planned" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="achieved" name="Achieved" stroke="#00C853" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : chartType === 'Area' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayedPlannedVsAchieved} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="category" fontSize={9} stroke="var(--text-muted)" angle={-25} textAnchor="end" interval={0} tickFormatter={(val) => (val?.length > 10 ? `${val.substring(0, 9)}…` : val)} />
                    <YAxis fontSize={10} stroke="var(--text-muted)" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--dropdown-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-primary)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="planned" name="Planned" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="achieved" name="Achieved" stroke="#00C853" fill="#00C853" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : chartType === 'Donut' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--dropdown-bg)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-primary)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Pie
                      data={displayedPlannedVsAchieved}
                      dataKey="achieved"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {displayedPlannedVsAchieved.map((_, idx) => (
                        <Cell key={`pie-ppm-${idx}`} fill={idx % 2 === 0 ? '#00C853' : '#3B82F6'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={displayedPlannedVsAchieved} cx="50%" cy="50%" outerRadius={70}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis dataKey="category" fontSize={9} stroke="var(--text-muted)" tickFormatter={(val) => (val?.length > 8 ? `${val.substring(0, 7)}…` : val)} />
                    <PolarRadiusAxis fontSize={9} stroke="var(--text-muted)" />
                    <Radar name="Planned" dataKey="planned" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                    <Radar name="Achieved" dataKey="achieved" stroke="#00C853" fill="#00C853" fillOpacity={0.3} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
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
            <span>Showing {topN === 'All' ? rawPlannedVsAchieved.length : topN} Categories</span>
            <span style={{ color: '#00E676', fontWeight: 700 }}>
              {activeStats.compliance.toFixed(1)}% Overall Compliance
            </span>
          </div>
        </div>

        {/* Card 2: Category Compliance Breakdown Progress Bars */}
        <div
          className="glass-card glass-card-lift"
          style={{
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '380px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Category Compliance Audit
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Execution rates by individual operational checklist.
                </p>
              </div>

              {/* Sort Dropdown */}
              <div ref={sortDropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    backgroundColor: 'var(--glass-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <ListFilter size={12} />
                  <span>
                    {sortBy === 'highest' ? 'Highest %' : sortBy === 'lowest' ? 'Lowest %' : 'A-Z'}
                  </span>
                  <ChevronDown size={12} />
                </button>
                {sortDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      width: '120px',
                      backgroundColor: 'var(--dropdown-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      boxShadow: 'var(--shadow-elevation)',
                      zIndex: 60,
                      padding: '4px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('highest');
                        setSortDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: sortBy === 'highest' ? 'rgba(0, 200, 83, 0.15)' : 'transparent',
                        color: sortBy === 'highest' ? '#00E676' : 'var(--text-primary)',
                        fontSize: '0.75rem',
                        fontWeight: sortBy === 'highest' ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      Highest %
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('lowest');
                        setSortDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: sortBy === 'lowest' ? 'rgba(0, 200, 83, 0.15)' : 'transparent',
                        color: sortBy === 'lowest' ? '#00E676' : 'var(--text-primary)',
                        fontSize: '0.75rem',
                        fontWeight: sortBy === 'lowest' ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      Lowest %
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('alphabetical');
                        setSortDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: sortBy === 'alphabetical' ? 'rgba(0, 200, 83, 0.15)' : 'transparent',
                        color: sortBy === 'alphabetical' ? '#00E676' : 'var(--text-primary)',
                        fontSize: '0.75rem',
                        fontWeight: sortBy === 'alphabetical' ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      Alphabetical
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* In-Card Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--glass-bg)',
                border: '1px solid var(--border-color)',
                marginBottom: '12px',
              }}
            >
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Filter checklists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  width: '100%',
                }}
              />
            </div>

            {/* Category List */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categoryComplianceList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  No checklists found matching criteria
                </div>
              ) : (
                categoryComplianceList.map((item, idx) => {
                  const pct = Math.min(Math.max(item.percentage, 0), 100);
                  const isHigh = pct >= 80;
                  const isMedium = pct >= 50 && pct < 80;
                  const barColor = isHigh ? '#00E676' : isMedium ? '#F59E0B' : '#EF4444';

                  return (
                    <div
                      key={item.name || idx}
                      onClick={() => openSlideOver(mode === 'soft_services' ? 'drill_soft_services' : 'drill_ppm', { type: 'category', value: item.name, category: item.name, is_soft: mode === 'soft_services' } as never)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--glass-bg)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, border-color 0.15s ease',
                      }}
                      className="glass-card-lift"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            maxWidth: '220px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.6875rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {item.completed}/{item.total}
                          </span>
                          <strong style={{ color: barColor }}>{pct.toFixed(0)}%</strong>
                        </div>
                      </div>
                      <div
                        style={{
                          height: '5px',
                          width: '100%',
                          backgroundColor: 'var(--border-color)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            backgroundColor: barColor,
                            borderRadius: '3px',
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
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
            <span>Showing {categoryComplianceList.length} Checklists</span>
            <span style={{ color: '#00E676', fontWeight: 700 }}>Click checklist to inspect</span>
          </div>
        </div>
      </div>
    </section>
  );
}