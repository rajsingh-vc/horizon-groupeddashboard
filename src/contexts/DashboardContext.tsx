import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole, Site, Ticket, Asset, Vendor, Alert } from '@/data/mockData';

export interface FilterState {
  to_date: unknown;
  from_date: unknown;
  date_range: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  custom_start?: string;
  custom_end?: string;
  group_id: string | null;
  site_id: string | null;
  block_id: string | null;
  tenant_id: string | null;
  category_id: string | null;
  type_id: string | null;
  vendor_id: string | null;
  sla_status: string | null;
  compliance_status: string | null;
}

export type SlideOverType =
  | 'site' | 'ticket' | 'asset' | 'vendor' | 'ppm' | 'workforce' | 'visitor' | 'compliance' | 'alert'
  | 'kpi_ticket_sla' | 'kpi_ppm' | 'kpi_asset' | 'kpi_workforce' | 'kpi_vendor_sla' | 'kpi_visitors' | 'kpi_avg_resolution'
  | 'drill_asset' | 'drill_workforce' | 'drill_site' | 'drill_ppm' | 'drill_soft_services' | 'drill_visitors' | 'drill_ticket'
  | null;

interface SlideOverState {
  isOpen: boolean;
  type: SlideOverType;
  data: Site | Ticket | Asset | Vendor | Alert | Record<string, unknown> | null;
}

interface DashboardContextType {
  // Role
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  
  // Filters
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  
  // Slide-over Panel
  slideOver: SlideOverState;
  openSlideOver: (type: SlideOverType, data?: SlideOverState['data']) => void;
  closeSlideOver: () => void;
  
  // Alerts
  alertsOpen: boolean;
  setAlertsOpen: (open: boolean) => void;
  unacknowledgedAlerts: number;
  setUnacknowledgedAlerts: (count: number) => void;
}

const defaultFilters: FilterState = {
  date_range: 'month',
  group_id: null,
  site_id: null,
  block_id: null,
  tenant_id: null,
  category_id: null,
  type_id: null,
  vendor_id: null,
  sla_status: null,
  compliance_status: null,
  to_date: undefined,
  from_date: undefined
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [currentRole, setCurrentRole] = useState<UserRole>('ceo');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [slideOver, setSlideOver] = useState<SlideOverState>({
    isOpen: false,
    type: null,
    data: null,
  });
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState(6);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Invalidate all dashboard queries so every panel re-fetches with the new filter
    queryClient.invalidateQueries({ queryKey: ['grouped_dashboard'] });
  }, [queryClient]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    queryClient.invalidateQueries({ queryKey: ['grouped_dashboard'] });
  }, [queryClient]);

  const openSlideOver = useCallback((type: SlideOverType, data?: SlideOverState['data']) => {
    setSlideOver({ isOpen: true, type, data: data ?? null });
  }, []);

  const closeSlideOver = useCallback(() => {
    setSlideOver({ isOpen: false, type: null, data: null });
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        filters,
        setFilters,
        updateFilter,
        resetFilters,
        slideOver,
        openSlideOver,
        closeSlideOver,
        alertsOpen,
        setAlertsOpen,
        unacknowledgedAlerts,
        setUnacknowledgedAlerts,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}