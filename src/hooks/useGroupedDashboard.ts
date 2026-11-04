import { useQuery, useQueries } from '@tanstack/react-query';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
} from 'date-fns';
import { FilterState, useDashboard } from '@/contexts/DashboardContext';
import { ApiParams, DashboardRole } from '@/types/groupedDashboard';

function mapRole(role: string): DashboardRole | undefined {
  if (role === 'ceo' || role === 'fm_head' || role === 'ops') return role;
  return undefined;
}
import {
  fetchDashboardKPIs,
  fetchSitePerformance,
  fetchSiteDrill,
  fetchAssetPortfolio,
  fetchAssetDrill,
  fetchWorkforceDrill,
  fetchServiceDesk,
  fetchPPMOperations,
  fetchPPMDrill,
  fetchWorkforce,
  fetchCompliance,
  fetchVisitorsDetail,
  fetchVisitorsDrill,
} from '@/apis/groupedDashboard';
import type { AssetDrillParams, WorkforceDrillParams, SiteDrillParams, PPMDrillParams, VisitorsDrillParams } from '@/apis/groupedDashboard';

function filtersToApiParams(
  filters: FilterState,
  role?: DashboardRole
): ApiParams {

  const now = new Date();

  let from: Date;
  let to: Date;

  switch (filters.date_range) {

    case 'today':
      from = startOfDay(now);
      to = endOfDay(now);
      break;

    case 'week':
      from = startOfWeek(now, { weekStartsOn: 1 });
      to = endOfWeek(now, { weekStartsOn: 1 });
      break;

    case 'month':
      from = startOfMonth(now);
      to = endOfMonth(now);
      break;

    case 'quarter':
      from = startOfQuarter(now);
      to = endOfQuarter(now);
      break;

    case 'year':
      from = startOfYear(now);
      to = endOfYear(now);
      break;

    case 'custom':

      from = filters?.from_date
        ? startOfDay(new Date(filters.from_date as string | number | Date))
        : startOfMonth(now);

      to = filters?.to_date
        ? endOfDay(new Date(filters.to_date as string | number | Date))
        : endOfDay(now);

      break;

    default:
      from = startOfMonth(now);
      to = endOfDay(now);

  }

  const params: ApiParams = {

    from_date: format(from, "yyyy-MM-dd'T'HH:mm:ss"),
    to_date: format(to, "yyyy-MM-dd'T'HH:mm:ss"),

  };

  if (role) params.role = role;
  if (filters.site_id) params.site_id = filters.site_id;
  if (filters.category_id) params.category_id = filters.category_id;
  if (filters.vendor_id) params.vendor_id = filters.vendor_id;

  return params;
}

const QUERY_DEFAULTS = {
  staleTime: 0,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

export function useDashboardKPIs(filters: FilterState) {
  const { currentRole } = useDashboard();

  const params = filtersToApiParams(filters, mapRole(currentRole));

  return useQuery({
    queryKey: ["grouped_dashboard", "kpis", currentRole, filters.date_range, params],
    queryFn: () => fetchDashboardKPIs(params),
    ...QUERY_DEFAULTS,
  });
}

export function useSitePerformance(filters: FilterState) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole));
  return useQuery({
    queryKey: ['grouped_dashboard', 'site_performance', currentRole, filters.date_range, params],
    queryFn: () => fetchSitePerformance(params),
    ...QUERY_DEFAULTS,
  });
}

export function useSiteDrill(filters: FilterState, siteId: number | string | null) {
  const { currentRole } = useDashboard();
  const effectiveSiteId = siteId || filters.site_id || 78;
  const params = filtersToApiParams(filters, mapRole(currentRole)) as SiteDrillParams;
  params.site_id = effectiveSiteId;
  const enabled = Boolean(effectiveSiteId);
  return useQuery({
    queryKey: ['grouped_dashboard', 'site_drill', currentRole, filters.date_range, params],
    queryFn: () => fetchSiteDrill(params),
    ...QUERY_DEFAULTS,
    enabled,
  });
}

export function useAssetPortfolio(filters: FilterState) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole));
  return useQuery({
    queryKey: ['grouped_dashboard', 'asset_portfolio', currentRole, filters.date_range, params],
    queryFn: () => fetchAssetPortfolio(params),
    ...QUERY_DEFAULTS,
  });
}

export function useAssetDrill(filters: FilterState, drillParams: { status?: string; category?: string } = {}) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole)) as AssetDrillParams;
  if (drillParams.status && drillParams.status !== 'all') {
    params.status = drillParams.status;
  }
  if (drillParams.category && drillParams.category !== 'all') {
    params.category = drillParams.category;
  }
  return useQuery({
    queryKey: ['grouped_dashboard', 'asset_drill', currentRole, filters.date_range, params],
    queryFn: () => fetchAssetDrill(params),
    ...QUERY_DEFAULTS,
    enabled: true,
  });
}

export function useWorkforceDrill(filters: FilterState, drillParams: { vendor?: string; work_type?: string; attendance?: 'present' | 'absent' } = {}) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole)) as WorkforceDrillParams;
  if (drillParams.vendor && drillParams.vendor !== 'all') params.vendor = drillParams.vendor;
  if (drillParams.work_type && drillParams.work_type !== 'all') params.work_type = drillParams.work_type;
  if (drillParams.attendance) params.attendance = drillParams.attendance;
  return useQuery({
    queryKey: ['grouped_dashboard', 'workforce_drill', currentRole, filters.date_range, params],
    queryFn: () => fetchWorkforceDrill(params),
    ...QUERY_DEFAULTS,
    enabled: true,
  });
}

export function usePPMDrill(filters: FilterState, category: string | null) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole)) as PPMDrillParams;
  if (category) {
    params.category = category;
  }
  const enabled = Boolean(category);
  return useQuery({
    queryKey: ['grouped_dashboard', 'ppm_drill', currentRole, filters.date_range, params],
    queryFn: () => fetchPPMDrill(params),
    ...QUERY_DEFAULTS,
    enabled,
  });
}

export function useAllPPMDrill(filters: FilterState, categories: string[], enabled: boolean = true) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole)) as PPMDrillParams;

  return useQueries({
    queries: (categories || []).map((cat) => ({
      queryKey: ['grouped_dashboard', 'ppm_drill_batch', currentRole, filters.date_range, cat, params],
      queryFn: async () => {
        try {
          const res = await fetchPPMDrill({ ...params, category: cat });
          return { category: cat, ...res };
        } catch {
          return { category: cat, total: 0, completed: 0, records: [] as any[] };
        }
      },
      ...QUERY_DEFAULTS,
      enabled: enabled && Boolean(cat),
    })),
  });
}

export function useServiceDesk(filters: FilterState) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole));
  return useQuery({
    queryKey: ['grouped_dashboard', 'service_desk', currentRole, filters.date_range, params],
    queryFn: () => fetchServiceDesk(params),
    ...QUERY_DEFAULTS,
  });
}

export function usePPMOperations(filters: FilterState) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole));
  return useQuery({
    queryKey: ['grouped_dashboard', 'ppm_operations', currentRole, filters.date_range, params],
    queryFn: () => fetchPPMOperations(params),
    ...QUERY_DEFAULTS,
  });
}

export function useWorkforce(filters: FilterState) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole));
  return useQuery({
    queryKey: ['grouped_dashboard', 'workforce', currentRole, filters.date_range, params],
    queryFn: () => fetchWorkforce(params),
    ...QUERY_DEFAULTS,
  });
}

export function useCompliance(filters: FilterState) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole));
  return useQuery({
    queryKey: ['grouped_dashboard', 'compliance', currentRole, filters.date_range, params],
    queryFn: () => fetchCompliance(params),
    ...QUERY_DEFAULTS,
  });
}

export function useVisitorsDetail(filters: FilterState) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole));
  return useQuery({
    queryKey: ['grouped_dashboard', 'visitors_detail', currentRole, filters.date_range, params],
    queryFn: () => fetchVisitorsDetail(params),
    ...QUERY_DEFAULTS,
  });
}

export function useVisitorsDrill(filters: FilterState, drillParams: { category?: string }) {
  const { currentRole } = useDashboard();
  const params = filtersToApiParams(filters, mapRole(currentRole)) as VisitorsDrillParams;
  Object.assign(params, drillParams);
  return useQuery({
    queryKey: ['grouped_dashboard', 'visitors_drill', currentRole, filters.date_range, params],
    queryFn: () => fetchVisitorsDrill(params),
    ...QUERY_DEFAULTS,
  });
}
