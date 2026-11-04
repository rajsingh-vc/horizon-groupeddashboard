import React, { useState, useMemo } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAssetPortfolio } from '@/hooks/useGroupedDashboard';
import {
  Wrench,
  ChevronRight,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BarChart2,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

type ChartType = 'Donut' | 'Pie' | 'Vertical Bar' | 'Horizontal Bar' | 'Line' | 'Area' | 'Radar';

const STATUS_CHART_TYPES: ChartType[] = ['Donut', 'Pie', 'Vertical Bar', 'Horizontal Bar'];
const CATEGORY_CHART_TYPES: ChartType[] = ['Pie', 'Donut', 'Vertical Bar', 'Horizontal Bar', 'Radar', 'Line', 'Area'];

export function AssetPortfolioHealth() {
  const { filters, openSlideOver } = useDashboard();
  const { data: rawData, isPending } = useAssetPortfolio(filters);

  const [statusChartType, setStatusChartType] = useState<ChartType>('Donut');
  const [categoryChartType, setCategoryChartType] = useState<ChartType>('Horizontal Bar');
  const [categoryTopN, setCategoryTopN] = useState<'Top 5' | 'All'>('Top 5');

  const summary = useMemo(() => {
    const raw = (rawData?.summary || {}) as Record<string, any>;
    const total = Number(raw.total ?? 0);
    const operational = Number(raw.operational ?? 0);
    const maintenance = Number(raw.maintenance ?? 0);
    const critical = Number(raw.critical ?? 0);
    const health_percentage = Number(raw.health_percentage ?? (total > 0 ? (operational / total) * 100 : 0));
    return { total, operational, maintenance, critical, health_percentage };
  }, [rawData]);

  const categories = useMemo(() => {
    const list = rawData?.category_breakdown || [];

    return list.map((c) => ({
      name: c.category || 'Equipment',
      total: Number(c.total || 0),
      operational: Number(c.operational || 0),
      score: Number(c.health_percentage ?? 100),
      color: Number(c.health_percentage ?? 100) >= 95 ? '#00E676' : '#FF9100',
    }));
  }, [rawData]);

  const displayedCategories = useMemo(() => {
    if (categoryTopN === 'Top 5') return categories.slice(0, 5);
    return categories;
  }, [categories, categoryTopN]);

  const statusDistribution = useMemo(
    () => [
      { name: 'Operational', value: summary.operational, color: '#00C853' },
      { name: 'BreakDown', value: summary.maintenance, color: '#FF9100' },
      { name: 'Critical', value: summary.critical, color: '#EF4444' },
    ],
    [summary]
  );

  const handleDrill = (tab?: 'ALL' | 'OPERATIONAL' | 'BREAKDOWN') => {
    openSlideOver('asset', {
      type: 'assets',
      title: 'Asset Portfolio & Health Telemetry',
      tab: tab || 'ALL',
      summary,
      categories,
    });
  };

  return (
    <section id="assets-section" style={{ marginBottom: '32px' }} className="animate-fade-in stagger-3">
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
              backgroundColor: 'rgba(0, 230, 118, 0.15)',
              border: '1px solid rgba(0, 230, 118, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00E676',
            }}
          >
            <Cpu size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Asset Portfolio & Health
            </h3>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                margin: '2px 0 0 0',
              }}
            >
              {summary.total.toLocaleString()} total units across Grade-A Horizon Parks •{' '}
              <strong style={{ color: '#00E676' }}>{summary.health_percentage}% Operational</strong>
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleDrill('OPERATIONAL')}
            className="filter-pill-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(0, 200, 83, 0.3)',
              backgroundColor: 'rgba(0, 200, 83, 0.1)',
              color: '#00E676',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <CheckCircle2 size={13} />
            <span>{summary.operational} Operational</span>
          </button>

          <button
            type="button"
            onClick={() => handleDrill('BREAKDOWN')}
            className="filter-pill-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 145, 0, 0.3)',
              backgroundColor: 'rgba(255, 145, 0, 0.1)',
              color: '#FF9100',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <AlertTriangle size={13} />
            <span>{summary.maintenance} Breakdown</span>
          </button>

          {summary.critical > 0 && (
            <button
              type="button"
              onClick={() => handleDrill('BREAKDOWN')}
              className="filter-pill-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Flame size={13} />
              <span>{summary.critical} Critical</span>
            </button>
          )}
        </div>
      </div>

      {/* Two Column Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px',
          alignItems: 'stretch',
        }}
      >
        {/* Card 1: Status Distribution */}
        <div
          className="glass-card glass-card-lift"
          onClick={() => handleDrill('ALL')}
          title="Click to open Asset Portfolio & Health drill-down"
          style={{
            padding: '20px 22px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '360px',
            cursor: 'pointer',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                }}
              >
                STATUS DISTRIBUTION
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Equipment Reliability Ratio
              </div>
            </div>

            {/* Chart Type Selector */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--glass-border)',
              }}
            >
              {STATUS_CHART_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setStatusChartType(t)}
                  style={{
                    padding: '3px 7px',
                    fontSize: '0.625rem',
                    fontWeight: statusChartType === t ? 700 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: statusChartType === t ? '#00C853' : 'transparent',
                    color: statusChartType === t ? '#0B0F19' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Graphic */}
          <div style={{ height: '220px', width: '100%', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              {statusChartType === 'Donut' || statusChartType === 'Pie' ? (
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151D2C',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={statusChartType === 'Donut' ? 55 : 0}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              ) : statusChartType === 'Horizontal Bar' ? (
                <BarChart data={statusDistribution} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={11} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151D2C',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <BarChart data={statusDistribution} margin={{ top: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151D2C',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>

            {statusChartType === 'Donut' && (
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
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  {summary.total}
                </span>
                <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Units
                </span>
              </div>
            )}
          </div>

          {/* Bottom Indicators */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              paddingTop: '12px',
              borderTop: '1px solid var(--glass-border)',
              fontSize: '0.75rem',
            }}
          >
            {statusDistribution.map((s) => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: s.color,
                  }}
                />
                <span style={{ color: 'var(--text-muted)' }}>{s.name}:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Category Health & Distribution */}
        <div
          className="glass-card glass-card-lift"
          onClick={() => handleDrill('ALL')}
          title="Click to open Asset Portfolio & Health breakdown drill-down"
          style={{
            padding: '20px 22px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '360px',
            cursor: 'pointer',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                }}
              >
                CATEGORY COMPLIANCE
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Equipment Category Distribution
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
              {/* Chart type selector */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {CATEGORY_CHART_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCategoryChartType(t)}
                    style={{
                      padding: '3px 6px',
                      fontSize: '0.625rem',
                      fontWeight: categoryChartType === t ? 700 : 500,
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: categoryChartType === t ? '#00C853' : 'transparent',
                      color: categoryChartType === t ? '#0B0F19' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Top N selector */}
              <button
                type="button"
                onClick={() => setCategoryTopN(categoryTopN === 'Top 5' ? 'All' : 'Top 5')}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: '1px solid var(--glass-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#00E676',
                  cursor: 'pointer',
                }}
              >
                {categoryTopN}
              </button>
            </div>
          </div>

          {/* Chart Content */}
          <div style={{ height: '220px', width: '100%' }}>
            {categoryChartType === 'Horizontal Bar' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '220px' }}>
                {displayedCategories.map((c) => (
                  <div key={c.name} onClick={() => handleDrill(undefined, c.name)} title={`Click to drill down ${c.name} assets`} style={{ display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }} className="hover:opacity-80 transition-opacity">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: '#00E676' }}>
                        {c.operational}/{c.total} ({c.score}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        width: '100%',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${c.score}%`,
                          backgroundColor: '#00E676',
                          borderRadius: '999px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : categoryChartType === 'Radar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={displayedCategories}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                  <PolarRadiusAxis stroke="#94A3B8" fontSize={9} />
                  <Radar name="Health" dataKey="score" stroke="#00E676" fill="#00E676" fillOpacity={0.3} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151D2C',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '0.75rem',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayedCategories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                  <YAxis stroke="#94A3B8" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151D2C',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '0.75rem',
                    }}
                  />
                  <Bar dataKey="total" fill="#3B82F6" name="Total Units" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="operational" fill="#00E676" name="Operational" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bottom Card Footer */}
          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>Cycle: Monthly Operational Audit</span>
            <span style={{ color: '#00E676', fontWeight: 700 }}>
              {categories.filter((c) => c.score === 100).length}/{categories.length} Categories 100% Compliant
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
export default AssetPortfolioHealth;