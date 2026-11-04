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
  BarChart2,
  Table as TableIcon,
  Flame,
} from 'lucide-react';

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
];

export function SitePerformanceOverview() {
  const { filters, openSlideOver } = useDashboard();
  const { data: rawSiteData, isPending } = useSitePerformance(filters);

  const [search, setSearch] = useState('');
  const [metricMode, setMetricMode] = useState<MetricMode>('health');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [chartType, setChartType] = useState<ChartType>('Horizontal Bar');
  const [topN, setTopN] = useState<'Top 5' | 'Top 10' | 'All'>('All');
  const [sortField, setSortField] = useState<'name' | 'health' | 'tat' | 'ppm' | 'assets'>('health');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

            {/* Horizontal Bar Chart representation matching reference chart-viewport */}
            <div className="chart-viewport" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <div className="chart-list">
                {chartData.map((site) => {
                  const val =
                    metricMode === 'health'
                      ? site.health
                      : metricMode === 'tat'
                      ? site.tat
                      : metricMode === 'ppm'
                      ? site.ppm
                      : site.workforce;

                  const color = val >= 85 ? '#00C853' : val >= 60 ? '#FF9100' : '#EF4444';

                  return (
                    <div
                      key={site.id}
                      onClick={() => handleSiteClick(site)}
                      className="chart-row clickable-row"
                      style={{
                        backgroundColor: 'var(--table-even-bg)',
                        border: '1px solid var(--glass-border)',
                      }}
                      title={`Click to open ${site.name} performance drilldown`}
                    >
                      <div className="chart-row-header">
                        <div className="chart-category">
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ color: 'var(--text-main)', fontSize: '0.8125rem' }}>
                            {site.name}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                            ({site.group})
                          </span>
                        </div>
                        <div className="chart-value" style={{ color }}>
                          {val}%
                        </div>
                        <div
                          className="chart-percentage"
                          style={{
                            backgroundColor: `${color}22`,
                            color,
                          }}
                        >
                          {val >= 85 ? 'Healthy' : val >= 60 ? 'Warning' : 'Critical'}
                        </div>
                      </div>

                      <div className="progress-track" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(100, val)}%`,
                            backgroundColor: color,
                            boxShadow: `0 0 8px ${color}88`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
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
                  <th style={{ padding: '10px 12px', width: '60px' }}>Rank</th>
                  <th
                    style={{ padding: '10px 12px', cursor: 'pointer' }}
                    onClick={() => handleSort('name')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Site / Park Name</span>
                      {sortField === 'name' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th style={{ padding: '10px 12px' }}>Region / Group</th>
                  <th
                    style={{ padding: '10px 12px', cursor: 'pointer' }}
                    onClick={() => handleSort('health')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Overall Health</span>
                      {sortField === 'health' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th
                    style={{ padding: '10px 12px', cursor: 'pointer' }}
                    onClick={() => handleSort('tat')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>SLA Adherence</span>
                      {sortField === 'tat' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th
                    style={{ padding: '10px 12px', cursor: 'pointer' }}
                    onClick={() => handleSort('ppm')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>PPM Adherence</span>
                      {sortField === 'ppm' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th
                    style={{ padding: '10px 12px', cursor: 'pointer' }}
                    onClick={() => handleSort('assets')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Active Assets</span>
                      {sortField === 'assets' && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                  <th style={{ padding: '10px 12px' }}>Tickets (Open/Closed)</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
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
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                        #{rank}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {site.name}
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                        {site.group}
                      </td>
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
                      <td style={{ padding: '12px', fontWeight: 600 }}>
                        {site.assets.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: site.tickets > 0 ? '#FF7A45' : 'var(--text-muted)', fontWeight: 600 }}>
                          {site.tickets} open
                        </span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
                        <span style={{ color: '#00C853', fontWeight: 600 }}>
                          {site.closed} closed
                        </span>
                      </td>
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
                paddingTop: '16px',
                marginTop: '8px',
                borderTop: '1px solid var(--glass-border)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredSites.length)} of {filteredSites.length} parks
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
                    color: currentPage <= 1 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-main)',
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
                    color: currentPage >= totalPages ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-main)',
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