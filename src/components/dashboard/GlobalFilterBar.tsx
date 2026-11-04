import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useDashboardFilterOptions } from '@/hooks/useDashboardFilterOptions';
import { useDashboardKPIs, useSitePerformance, useAssetPortfolio, useServiceDesk, usePPMOperations, useWorkforce } from '@/hooks/useGroupedDashboard';
import { useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  RotateCw,
  Sun,
  Moon,
  Search,
  Check,
  Building2,
  Filter,
} from 'lucide-react';

interface Props {
  theme?: string;
  onToggleTheme?: () => void;
}

export function GlobalFilterBar({ theme: externalTheme, onToggleTheme }: Props) {
  const queryClient = useQueryClient();
  const { filters, updateFilter, resetFilters } = useDashboard();
  const { groups: apiGroups, sites: apiSites, categories: apiCategories, vendors: apiVendors } = useDashboardFilterOptions(filters);
  const { refetch: refetchKpi, isFetching: isKpiFetching } = useDashboardKPIs(filters);
  const { data: sitePerf } = useSitePerformance(filters);
  const { data: assetsData } = useAssetPortfolio(filters);
  const { data: serviceDeskData } = useServiceDesk(filters);
  const { data: ppmData } = usePPMOperations(filters);
  const { data: workforceData } = useWorkforce(filters);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('horizon_theme') as 'dark' | 'light') || 'dark';
  });

  const isLight = theme === 'light';

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('horizon_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    if (onToggleTheme) onToggleTheme();
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>(() =>
    new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dropdown open states
  const [activeDropdown, setActiveDropdown] = useState<'date' | 'group' | 'site' | 'category' | 'vendor' | null>(null);
  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [siteSearch, setSiteSearch] = useState('');
  const barRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Esc
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
        setCustomDateOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setCustomDateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['grouped_dashboard'] });
    refetchKpi();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Extract combined Groups
  const groups = useMemo(() => {
    const gSet = new Set<string>();
    apiGroups.forEach(g => g.name && gSet.add(g.name));
    (sitePerf?.sites || []).forEach(s => {
      if (s.group && s.group !== '.') gSet.add(s.group.trim());
    });
    const list = Array.from(gSet).sort((a, b) =>
      a === 'Mumbai' ? -1 : b === 'Mumbai' ? 1 : a.localeCompare(b)
    );
    return ['All Groups', ...list];
  }, [apiGroups, sitePerf]);

  // Extract combined Sites
  const sites = useMemo(() => {
    const sMap = new Map<string, { id: string | number; name: string; group?: string }>();
    apiSites.forEach(s => sMap.set(s.name, { id: s.id, name: s.name, group: s.group_id || undefined }));
    (sitePerf?.sites || []).forEach(s => {
      const name = s.name;
      if (name) sMap.set(name, { id: s.id, name, group: s.group });
    });
    return Array.from(sMap.values());
  }, [apiSites, sitePerf]);

  // Extract combined Categories
  const categories = useMemo(() => {
    const cSet = new Set<string>(['All Categories']);
    apiCategories.forEach(c => c.name && cSet.add(c.name));
    (assetsData?.category_breakdown || []).forEach(c => c.category && cSet.add(c.category.trim()));
    (serviceDeskData?.tickets_by_category || []).forEach(t => t.category && cSet.add(t.category.trim()));
    (ppmData?.ppm?.by_category || []).forEach(p => {
      if (p.category) {
        const clean = p.category.replace(/^(MONTHLY|DAILY|WEEKLY|BI-WEEKLY) CHECKLIST - /i, '').trim();
        if (clean) cSet.add(clean);
      }
    });
    return Array.from(cSet);
  }, [apiCategories, assetsData, serviceDeskData, ppmData]);

  // Extract combined Vendors
  const vendors = useMemo(() => {
    const vSet = new Set<string>(['All Vendors']);
    apiVendors.forEach(v => v.name && vSet.add(v.name));
    (workforceData?.by_vendor || []).forEach(v => {
      const name = v.vendor;
      if (name) vSet.add(name.trim());
    });
    return Array.from(vSet);
  }, [apiVendors, workforceData]);

  // Filter labels
  const selectedDateLabel = useMemo(() => {
    if (filters.date_range === 'today') return 'Today';
    if (filters.date_range === 'week') return 'This Week';
    if (filters.date_range === 'month') return 'This Month';
    if (filters.date_range === 'quarter') return 'This Quarter';
    if (filters.date_range === 'year') return 'Year to Date';
    if (filters.date_range === 'custom') {
      const fromStr = typeof filters.from_date === 'string' ? filters.from_date : '';
      const toStr = typeof filters.to_date === 'string' ? filters.to_date : '';
      return (fromStr && toStr)
        ? `${fromStr.slice(0, 10)} – ${toStr.slice(0, 10)}`
        : 'Custom Range';
    }
    return 'This Month';
  }, [filters]);

  const selectedGroupName = useMemo(() => {
    if (!filters.group_id) return 'All Groups';
    const found = apiGroups.find(g => g.id === filters.group_id);
    return found ? found.name : filters.group_id;
  }, [filters.group_id, apiGroups]);

  const selectedSiteName = useMemo(() => {
    if (!filters.site_id) return 'All Sites';
    const found = sites.find(s => String(s.id) === String(filters.site_id) || s.name === filters.site_id);
    return found ? found.name : filters.site_id;
  }, [filters.site_id, sites]);

  const selectedCategoryName = useMemo(() => {
    if (!filters.category_id) return 'All Categories';
    const found = apiCategories.find(c => c.id === filters.category_id);
    return found ? found.name : filters.category_id;
  }, [filters.category_id, apiCategories]);

  const selectedVendorName = useMemo(() => {
    if (!filters.vendor_id) return 'All Vendors';
    const found = apiVendors.find(v => v.id === filters.vendor_id);
    return found ? found.name : filters.vendor_id;
  }, [filters.vendor_id, apiVendors]);

  // Handler for group selection
  const handleGroupSelect = (group: string) => {
    if (group === 'All Groups') {
      updateFilter('group_id', null);
    } else {
      const match = apiGroups.find(g => g.name.toLowerCase() === group.toLowerCase());
      updateFilter('group_id', match ? match.id : group);
    }
    setActiveDropdown(null);
  };

  // Handler for site selection
  const handleSiteSelect = (siteName: string) => {
    if (siteName === 'All Sites') {
      updateFilter('site_id', null);
    } else {
      const match = sites.find(s => s.name.toLowerCase() === siteName.toLowerCase());
      updateFilter('site_id', match ? String(match.id) : siteName);
    }
    setActiveDropdown(null);
  };

  // Handler for date preset
  const handleDatePreset = (preset: string) => {
    if (preset === 'Custom Range') {
      setCustomDateOpen(true);
      return;
    }
    if (preset === 'Today') updateFilter('date_range', 'today');
    else if (preset === 'This Week') updateFilter('date_range', 'week');
    else if (preset === 'This Month') updateFilter('date_range', 'month');
    else if (preset === 'This Quarter') updateFilter('date_range', 'quarter');
    else if (preset === 'Year to Date') updateFilter('date_range', 'year');
    else updateFilter('date_range', 'month');
    setActiveDropdown(null);
    setCustomDateOpen(false);
  };

  const handleApplyCustomDate = () => {
    if (customStart && customEnd) {
      updateFilter('from_date', customStart);
      updateFilter('to_date', customEnd);
      updateFilter('date_range', 'custom');
      setActiveDropdown(null);
      setCustomDateOpen(false);
    }
  };

  // Filter pill button style
  const getPillStyle = (isActive: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    height: '36px',
    padding: '0 12px',
    fontSize: '0.8125rem',
    fontWeight: isActive ? 600 : 500,
    borderRadius: '8px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    border: isActive
      ? (isLight ? '1px solid #0284C7' : '1px solid #38BDF8')
      : (isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.12)'),
    backgroundColor: isActive
      ? (isLight ? '#F0F9FF' : 'rgba(56, 189, 248, 0.12)')
      : (isLight ? '#FFFFFF' : 'rgba(23, 31, 48, 0.8)'),
    color: isActive ? (isLight ? '#0369A1' : '#38BDF8') : (isLight ? '#1E293B' : '#F8FAFC'),
    cursor: 'pointer',
    boxShadow: isLight ? '0 1px 2px rgba(15, 23, 42, 0.05)' : '0 2px 6px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.15s ease',
  });

  const dropdownContainerStyle = (width = '180px', rightAlign = false) => ({
    position: 'absolute' as const,
    top: 'calc(100% + 6px)',
    [rightAlign ? 'right' : 'left']: 0,
    zIndex: 1000,
    minWidth: width,
    maxHeight: '360px',
    overflowY: 'auto' as const,
    backgroundColor: isLight ? '#FFFFFF' : '#151D2C',
    borderRadius: '8px',
    boxShadow: isLight
      ? '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)'
      : '0 16px 40px rgba(0, 0, 0, 0.7)',
    border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255, 255, 255, 0.12)',
    padding: '6px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  });

  const dropdownItemStyle = (isSelected: boolean) => ({
    width: '100%',
    textAlign: 'left' as const,
    padding: '7px 10px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: isSelected
      ? (isLight ? '#F1F5F9' : '#334155')
      : 'transparent',
    color: isSelected
      ? (isLight ? '#0284C7' : '#38BDF8')
      : (isLight ? '#1E293B' : '#CBD5E1'),
    fontSize: '0.8125rem',
    fontWeight: isSelected ? 600 : 400,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.12s ease',
  });

  // Filtered sites for search inside site dropdown
  const filteredSites = useMemo(() => {
    let list = sites;
    if (filters.group_id) {
      list = list.filter(s => s.group?.toLowerCase() === selectedGroupName.toLowerCase());
    }
    if (siteSearch.trim()) {
      const q = siteSearch.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [sites, filters.group_id, selectedGroupName, siteSearch]);

  return (
    <header
      ref={barRef}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(11, 15, 23, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: isLight ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isLight ? '0 4px 20px -2px rgba(15, 23, 42, 0.05)' : '0 8px 30px -4px rgba(0, 0, 0, 0.6)',
        padding: '10px 24px',
        transition: 'all 0.25s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1680px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'nowrap',
        }}
      >
        {/* Left: Horizon Brand Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
            cursor: 'pointer',
          }}
          onClick={() => {
            resetFilters();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          title="Horizon Industrial Parks Dashboard"
        >
          <img
            src={isLight ? '/horizonlogo.png' : '/Horizon_White.svg'}
            alt="Horizon Industrial Parks"
            style={{
              height: '35px',
              width: 'auto',
              maxWidth: '185px',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        {/* Center: Dynamic Filter Pill Buttons */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            flexWrap: 'nowrap',
            padding: '2px 8px',
            overflow: 'visible',
            position: 'relative',
          }}
        >
          {/* Date Range Pill */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
              className="filter-pill-btn"
              style={getPillStyle(filters.date_range !== 'month')}
            >
              <Calendar size={14} color={filters.date_range !== 'month' ? (isLight ? '#0284C7' : '#38BDF8') : (isLight ? '#64748B' : '#94A3B8')} />
              <span>{selectedDateLabel}</span>
              <ChevronDown size={14} color={isLight ? '#64748B' : '#94A3B8'} />
            </button>

            {activeDropdown === 'date' && (
              <div className="dropdown-anim" style={dropdownContainerStyle(customDateOpen ? '320px' : '160px')}>
                {customDateOpen ? (
                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isLight ? '#334155' : '#94A3B8' }}>Select Start Date</div>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: isLight ? '1px solid #CBD5E1' : '1px solid #334155',
                        backgroundColor: isLight ? '#F8FAFC' : '#0B0F17',
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.75rem',
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isLight ? '#334155' : '#94A3B8' }}>Select End Date</div>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: isLight ? '1px solid #CBD5E1' : '1px solid #334155',
                        backgroundColor: isLight ? '#F8FAFC' : '#0B0F17',
                        color: isLight ? '#0F172A' : '#FFFFFF',
                        fontSize: '0.75rem',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={handleApplyCustomDate}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          backgroundColor: '#00C853',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomDateOpen(false)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: isLight ? '#E2E8F0' : '#334155',
                          color: isLight ? '#334155' : '#CBD5E1',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                ) : (
                  ['Today', 'This Week', 'This Month', 'This Quarter', 'Year to Date', 'Custom Range'].map((r) => {
                    const isSel = selectedDateLabel === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        style={dropdownItemStyle(isSel)}
                        onClick={() => handleDatePreset(r)}
                      >
                        <span>{r}</span>
                        {isSel && <Check size={14} color="#00C853" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Group Filter Pill */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'group' ? null : 'group')}
              className="filter-pill-btn"
              style={getPillStyle(selectedGroupName !== 'All Groups')}
            >
              <span>{selectedGroupName}</span>
              <ChevronDown size={14} color={isLight ? '#64748B' : '#94A3B8'} />
            </button>

            {activeDropdown === 'group' && (
              <div className="dropdown-anim" style={dropdownContainerStyle('160px')}>
                {groups.map((g) => {
                  const isSel = selectedGroupName === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      style={dropdownItemStyle(isSel)}
                      onClick={() => handleGroupSelect(g)}
                    >
                      <span>{g}</span>
                      {isSel && <Check size={14} color="#00C853" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Site Filter Pill */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'site' ? null : 'site')}
              className="filter-pill-btn"
              style={getPillStyle(selectedSiteName !== 'All Sites')}
            >
              <span>{selectedSiteName}</span>
              <ChevronDown size={14} color={isLight ? '#64748B' : '#94A3B8'} />
            </button>

            {activeDropdown === 'site' && (
              <div className="dropdown-anim" style={dropdownContainerStyle('250px')}>
                {/* Search inside site dropdown */}
                <div style={{ padding: '4px 6px', marginBottom: '4px', position: 'relative' }}>
                  <input
                    type="text"
                    value={siteSearch}
                    onChange={(e) => setSiteSearch(e.target.value)}
                    placeholder="Search parks..."
                    style={{
                      width: '100%',
                      padding: '5px 8px 5px 26px',
                      borderRadius: '6px',
                      border: isLight ? '1px solid #CBD5E1' : '1px solid #334155',
                      backgroundColor: isLight ? '#F8FAFC' : '#0B0F17',
                      color: isLight ? '#0F172A' : '#FFFFFF',
                      fontSize: '0.75rem',
                      outline: 'none',
                    }}
                  />
                  <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                </div>

                <button
                  type="button"
                  style={dropdownItemStyle(selectedSiteName === 'All Sites')}
                  onClick={() => handleSiteSelect('All Sites')}
                >
                  <span>All Sites (Nationwide)</span>
                  {selectedSiteName === 'All Sites' && <Check size={14} color="#00C853" />}
                </button>

                {filteredSites.map((s) => {
                  const isSel = selectedSiteName === s.name;
                  return (
                    <button
                      key={String(s.id)}
                      type="button"
                      style={dropdownItemStyle(isSel)}
                      onClick={() => handleSiteSelect(s.name)}
                    >
                      <span>{s.name}</span>
                      {isSel && <Check size={14} color="#00C853" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Filter Pill */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'category' ? null : 'category')}
              className="filter-pill-btn"
              style={getPillStyle(selectedCategoryName !== 'All Categories')}
            >
              <span>{selectedCategoryName}</span>
              <ChevronDown size={14} color={isLight ? '#64748B' : '#94A3B8'} />
            </button>

            {activeDropdown === 'category' && (
              <div className="dropdown-anim" style={dropdownContainerStyle('220px')}>
                {categories.map((c) => {
                  const isSel = selectedCategoryName === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      style={dropdownItemStyle(isSel)}
                      onClick={() => {
                        updateFilter('category_id', c === 'All Categories' ? null : c);
                        setActiveDropdown(null);
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</span>
                      {isSel && <Check size={14} color="#00C853" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vendor Filter Pill */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'vendor' ? null : 'vendor')}
              className="filter-pill-btn"
              style={getPillStyle(selectedVendorName !== 'All Vendors')}
            >
              <span>{selectedVendorName}</span>
              <ChevronDown size={14} color={isLight ? '#64748B' : '#94A3B8'} />
            </button>

            {activeDropdown === 'vendor' && (
              <div className="dropdown-anim" style={dropdownContainerStyle('180px', true)}>
                {vendors.map((v) => {
                  const isSel = selectedVendorName === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      style={dropdownItemStyle(isSel)}
                      onClick={() => {
                        updateFilter('vendor_id', v === 'All Vendors' ? null : v);
                        setActiveDropdown(null);
                      }}
                    >
                      <span>{v}</span>
                      {isSel && <Check size={14} color="#00C853" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Theme Toggle, Live Clock & Refresh */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="filter-pill-btn"
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{
              width: '36px',
              height: '36px',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.14)',
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(23, 31, 48, 0.85)',
              cursor: 'pointer',
              boxShadow: isLight ? '0 1px 3px rgba(15, 23, 42, 0.05)' : '0 2px 6px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            {isLight ? <Sun size={17} color="#F59E0B" /> : <Moon size={17} color="#818CF8" />}
          </button>

          <div
            style={{
              width: '1px',
              height: '20px',
              backgroundColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)',
            }}
          />

          {/* Live Telemetry Pulse & Clock */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <span
              className="pulse-dot"
              style={{ backgroundColor: isLight ? '#047857' : '#00E676' }}
            />
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: isLight ? '#0F172A' : '#F8FAFC',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              {currentTime}
            </span>
          </div>

          <div
            style={{
              width: '1px',
              height: '20px',
              backgroundColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)',
            }}
          />

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isKpiFetching}
            className="filter-pill-btn"
            title="Click to refresh operational telemetry"
            style={{
              width: '36px',
              height: '36px',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.14)',
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(23, 31, 48, 0.85)',
              cursor: isRefreshing ? 'wait' : 'pointer',
              boxShadow: isLight ? '0 1px 3px rgba(15, 23, 42, 0.05)' : '0 2px 6px rgba(0, 0, 0, 0.3)',
              color: isLight ? '#0F172A' : '#FFFFFF',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            <RotateCw
              size={16}
              className={isRefreshing || isKpiFetching ? 'spin-anim' : ''}
              color={isLight ? '#334155' : '#94A3B8'}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
export default GlobalFilterBar;
