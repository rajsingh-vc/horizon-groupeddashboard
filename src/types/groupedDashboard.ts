// Types for Grouped Dashboard API responses

export type DashboardRole = 'ceo' | 'fm_head' | 'ops';

export interface ApiParams {
  site_id?: string | number;
  site_ids?: (string | number)[];
  company_id?: string | number;
  category_id?: string | number;
  vendor_id?: string | number;
  role?: DashboardRole;
  from_date?: string;
  to_date?: string;
}

export interface OrgAssociatesResponse {
  sites: { id: number; name: string; region: string; group_id: string }[];
  categories: { id: number; name: string }[];
  vendors: { id: number; name: string; site_id: number }[];
  groups: { id: string; name: string }[];
}

// GET /api/v1/grouped_dashboard
export interface DashboardKPIsResponse {
  ticket_sla_health: {
    summary: {
      percentage: number;
      prev_percentage: number;
      vs_last_period: number;
      within_sla: number;
      prev_within_sla: number;
      at_risk: number;
      prev_at_risk: number;
      breached: number;
      prev_breached: number;
      total: number;
      prev_total: number;
    };
    records: any;
  };
  ppm_compliance: {
    summary: {
      total: number;
      percentage: number;
      prev_percentage: number;
      vs_last_period: number;
      completed: number;
      prev_completed: number;
      pending: number;
      prev_pending: number;
      missed: number;
      prev_missed: number;
      overdue: number;
      prev_overdue: number;
      total_scheduled: number;
      prev_total_scheduled: number;
    };
    records: any;
  };
  ppm: {
    total: number;
    percentage: number;
    prev_percentage: number;
    vs_last_period: number;
    completed: number;
    prev_completed: number;
    pending: number;
    prev_pending: number;
    missed: number;
    prev_missed: number;
    overdue: number;
    prev_overdue: number;
    total_scheduled: number;
    prev_total_scheduled: number;
    records: any;
  };
  asset_health: {
    summary: {
      percentage: number;
      prev_percentage: number;
      vs_last_period: number;
      operational: number;
      prev_operational: number;
      maintenance: number;
      critical: number;
      offline: number;
      total: number;
      prev_total: number;
    };
    records: any;
  };
  workforce_availability: {
    summary: {
      percentage: number;
      prev_percentage: number;
      vs_yesterday: number;
      present: number;
      prev_present: number;
      absent: number;
      prev_absent: number;
      total: number;
    };
    records: any;
  };
  vendor_sla: {
    summary: {
      percentage: number;
      prev_percentage: number;
      vs_last_period: number;
      compliant: number;
      at_risk: number;
      non_compliant: number;
      total: number;
    };
    records: any;
  };
  compliance_score: {
    summary: {
      percentage: number;
      prev_percentage: number;
      vs_last_period: number;
      compliant: number;
      prev_compliant: number;
      non_compliant: number;
      pending: number;
      total: number;
      prev_total: number;
    };
    records: any;
  };
  visitors_today: {
    summary: {
      checked_in: number;
      prev_checked_in: number;
      checked_out: number;
      currently_inside: number;
      vs_yesterday: number;
    };
    records: any;
  };
  avg_resolution_time: {
    summary: {
      hours: number;
      prev_hours: number;
      vs_last_period: number;
    };
    records: any;
  };
}

// GET /api/v1/grouped_dashboard/site_drill
export interface SiteDrillResponse {
  site: { id: number; name: string; region: string; active: boolean };
  summary: {
    health_score: number;
    sla_percentage: number;
    ppm_percentage: number;
    workforce_percentage: number;
    open_tickets: number;
    pending_tickets: number;
    breached_tickets: number;
    total_tickets: number;
    total_assets: number;
    total_staff: number;
  };
  blocks: { id: number; name: string; floor_no?: string; floor_count: number; units_count: number }[];
  tickets: {
    summary: { total: number; open: number; pending: number; breached: number; sla_percentage: number };
    recent: {
      id: number;
      ticket_number: string;
      heading: string;
      priority?: string;
      sla_status: string;
      status?: string;
      created_at: string;
      category?: string;
    }[];
  };
  assets: {
    summary: { total: number; operational: number; maintenance: number; critical: number; offline: number; health_percentage: number };
    breakdown: { status: string; count: number }[];
    by_category: { category: string; count: number }[];
    critical_assets: { id: number; name: string; asset_number: string; location: string; category?: string }[];
  };
  ppm: {
    total: number;
    completed: number;
    percentage: number;
    by_category: { category: string; total: number; completed: number; percentage: number }[];
  };
  workforce: {
    total: number;
    present: number;
    percentage: number;
    by_vendor: { vendor: string; count: number }[];
    by_work_type: { work_type: string; count: number }[];
  };
  vendors: { id: number; name: string; expiry?: string }[];
}

// GET /api/v1/grouped_dashboard/site_performance
export interface SitePerformanceSite {
  id: number;
  name: string;
  group: string;
  city: string | null;
  health_score: number;
  sla_percentage: number;
  ppm_percentage: number;
  open_tickets: number;
  pending_tickets: number;
  breached_tickets: number;
  total_assets: number;
  workforce_percentage: number;
}

export interface SitePerformanceResponse {
  total_sites: number;
  sites: SitePerformanceSite[];
}

// GET /api/v1/grouped_dashboard/asset_portfolio
export interface AssetPortfolioResponse {
  summary: {
    total: number;
    operational: number;
    maintenance: number;
    critical: number;
    offline: number;
    health_percentage: number;
  };
  category_breakdown: {
    category: string;
    total: number;
    operational: number;
    health_percentage: number;
  }[];
  critical_assets: {
    id: number;
    name: string;
    asset_number: string;
    location: string;
    category: string;
    breakdown: boolean;
  }[];
}

// GET /api/v1/grouped_dashboard/service_desk
export interface ServiceDeskResponse {
  summary: {
    total: number;
    open: number;
    in_progress: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  sla_status: {
    within_sla: number;
    at_risk: number;
    breached: number;
    sla_percentage: number;
  };
  tickets_by_category: {
    category: string;
    count: number;
  }[];
  priority_tickets: {
    id: number;
    ticket_number: string;
    heading: string;
    priority: string;
    sla_status: string;
    status: string;
    created_at: string;
  }[];
  avg_resolution_time_hours: number;
}

// GET /api/v1/grouped_dashboard/ppm_operations
export interface PPMOperationsResponse {
  ppm: {
    total: number;
    completed: number;
    missed: number;
    overdue: number;
    pending: number;
    completion_percentage: number;
    by_category: {
      category: string;
      total: number;
      completed: number;
      completion_percentage: number;
    }[];
  };
  soft_services: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completion_percentage: number;
  };
}

// GET /api/v1/grouped_dashboard/workforce
export interface WorkforceResponse {
  summary: {
    total: number;
    present: number;
    absent: number;
    availability_percentage: number;
  };
  by_vendor: {
    vendor: string;
    total: number;
    present: number;
    absent: number;
  }[];
  by_work_type: {
    work_type: string;
    count: number;
  }[];
}

// GET /api/v1/grouped_dashboard/compliance
export interface ComplianceResponse {
  summary: {
    total: number;
    compliant: number;
    non_compliant: number;
    pending: number;
    overdue: number;
    compliance_score: number;
  };
  by_config: {
    config: string;
    total: number;
    compliant: number;
  }[];
}

// GET /api/v1/grouped_dashboard/asset_drill
export interface AssetDrillRecord {
  id: number;
  name: string;
  asset_number: string;
  location: string;
  category: string;
  status: string;
  breakdown: boolean;
  critical: boolean;
  active: boolean;
  site_id: number;
  site_name?: string;
  updated_at?: string;
}

export interface AssetDrillResponse {
  drill_type: 'status' | 'category';
  filter_value: string;
  total: number;
  summary?: {
    total: number;
    operational: number;
    maintenance: number;
    critical: number;
    offline: number;
    health_percentage: number;
  };
  records: AssetDrillRecord[];
}

// GET /api/v1/grouped_dashboard/workforce_drill
export interface WorkforceDrillRecord {
  id: number;
  name: string;
  employee_no?: string;
  work_type: string;
  vendor: string;
  site_id: number;
  site_name?: string;
  present_today: boolean;
}

export interface WorkforceDrillResponse {
  drill_type: 'vendor' | 'work_type' | 'attendance';
  filter_value: string;
  total: number;
  present: number;
  absent: number;
  records: WorkforceDrillRecord[];
}

// GET /api/v1/grouped_dashboard/ppm_drill
export interface PPMDrillRecord {
  id: number;
  asset_id: number;
  asset_name?: string;
  asset_number?: string;
  checklist?: string;
  category: string;
  location: string;
  status: string;
  start_time: string;
  end_time?: string;
  site_name?: string;
}

export interface PPMDrillResponse {
  drill_type: 'category';
  filter_value: string;
  total: number;
  completed: number;
  records: PPMDrillRecord[];
}

// GET /api/v1/grouped_dashboard/visitors_detail
export interface VisitorsDetailResponse {
  today: {
    checked_in: number;
    checked_out: number;
    currently_inside: number;
  };
  period: {
    total: number;
    avg_duration_minutes: number;
    by_category: {
      category: string;
      count: number;
    }[];
  };
}

// GET /api/v1/grouped_dashboard/visitors_drill
export interface VisitorDrillRecord {
  id: number;
  visitor_id: number;
  visitor_name: string;
  contact_no?: string;
  purpose?: string;
  visit_type: string;
  category: string;
  check_in: string;
  check_out: string | null;
  created_at: string;
  visitor_created_at?: string;
  created_by: string | null;
  created_by_id: number | null;
  host_name: string | null;
  host_id: number | null;
  approved: 'pending' | 'approved' | 'rejected' | null;
  site_name: string | null;
  site_id: number;
  status: 'inside' | 'checked_out';
}

export interface VisitorsDrillResponse {
  total: number;
  today: { checked_in: number; checked_out: number; currently_inside: number };
  filter_category: string | null;
  records: VisitorDrillRecord[];
}
