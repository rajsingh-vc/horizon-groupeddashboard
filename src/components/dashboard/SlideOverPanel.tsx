import { useDashboard } from '@/contexts/DashboardContext';
import { X, MapPin, Building2, Activity, Clock, User, Wrench, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Site, Ticket, Asset, Vendor, Alert, blocks, tickets, assets, ppmTasks, workforce } from '@/data/mockData';
import {
  TicketSLAPanel,
  PPMCompliancePanel,
  AssetHealthPanel,
  WorkforcePanel,
  VendorSLAPanel,
  VisitorsTodayPanel,
  AvgResolutionPanel,
} from './KPIDetailPanels';
import { AssetDrillPanel, WorkforceDrillPanel, PPMDrillPanel, VisitorDrillPanel, TicketDrillPanel } from './DrillDownPanels';
import { SiteDrillPanel } from './SiteDrillPanel';

function SiteDetailPanel({ site }: { site: Site }) {
  const siteBlocks = blocks.filter(b => b.site_id === site.id);
  const siteTickets = tickets.filter(t => t.site_id === site.id);
  const siteAssets = assets.filter(a => a.site_id === site.id);
  const sitePPM = ppmTasks.filter(p => p.site_id === site.id);
  const siteWorkforce = workforce.filter(w => w.site_id === site.id);

  const openTickets = siteTickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const criticalAssets = siteAssets.filter(a => a.status === 'critical' || a.status === 'offline');
  const presentWorkforce = siteWorkforce.filter(w => w.status === 'present');

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{site.name}</h3>
            <p className="text-sm text-muted-foreground">{site.group_name}</p>
          </div>
          <Badge className={cn(
            'text-xs',
            site.status === 'healthy' && 'status-healthy',
            site.status === 'warning' && 'status-warning',
            site.status === 'critical' && 'status-critical',
          )}>
            {site.health_score}% Health
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{site.address}, {site.city}</span>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Open Tickets</div>
          <div className="text-xl font-bold">{openTickets.length}</div>
          <div className="text-xs text-critical">{site.critical_tickets} critical</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">SLA Compliance</div>
          <div className="text-xl font-bold">{site.sla_compliance}%</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">PPM Compliance</div>
          <div className="text-xl font-bold">{site.ppm_compliance}%</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Workforce</div>
          <div className="text-xl font-bold">{presentWorkforce.length}/{siteWorkforce.length}</div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Blocks ({siteBlocks.length})
        </h4>
        <div className="space-y-2">
          {siteBlocks.map(block => (
            <div key={block.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
              <div>
                <div className="text-sm font-medium">{block.name}</div>
                <div className="text-xs text-muted-foreground">{block.floors} levels • {block.tenants} units</div>
              </div>
              <Badge variant="outline" className={cn(
                'text-2xs',
                block.status === 'healthy' && 'border-healthy text-healthy',
                block.status === 'warning' && 'border-warning text-warning',
                block.status === 'critical' && 'border-critical text-critical',
              )}>
                {block.health_score}%
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Assets ({siteAssets.length})
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-healthy-bg rounded-md">
            <span>Operational</span>
            <span className="font-semibold">{siteAssets.filter(a => a.status === 'operational').length}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-warning-bg rounded-md">
            <span>Breakdown</span>
            <span className="font-semibold">{siteAssets.filter(a => a.status === 'maintenance').length}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
            <span>Offline</span>
            <span className="font-semibold">{siteAssets.filter(a => a.status === 'offline').length}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-critical-bg rounded-md">
            <span>Critical</span>
            <span className="font-semibold">{siteAssets.filter(a => a.status === 'critical').length}</span>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-3">Recent Tickets</h4>
        <div className="space-y-2">
          {siteTickets.slice(0, 5).map(ticket => (
            <div key={ticket.id} className="flex items-start justify-between p-2 border rounded-md">
              <div>
                <div className="text-xs font-medium">{ticket.ticket_no}</div>
                <div className="text-xs text-muted-foreground">{ticket.type}</div>
              </div>
              <Badge variant="outline" className={cn(
                'text-2xs',
                ticket.sla_status === 'within_sla' && 'border-healthy text-healthy',
                ticket.sla_status === 'at_risk' && 'border-warning text-warning',
                ticket.sla_status === 'breached' && 'border-critical text-critical',
              )}>
                {ticket.sla_status.replace('_', ' ')}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TicketDetailPanel({ ticket }: { ticket: Ticket }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{ticket.ticket_no}</h3>
            <p className="text-sm text-muted-foreground">{ticket.type}</p>
          </div>
          <Badge className={cn(
            'text-xs',
            ticket.priority === 'critical' && 'bg-critical text-critical-foreground',
            ticket.priority === 'high' && 'bg-warning text-warning-foreground',
            ticket.priority === 'medium' && 'bg-muted text-muted-foreground',
            ticket.priority === 'low' && 'bg-secondary text-secondary-foreground',
          )}>
            {ticket.priority}
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <Badge variant="outline">{ticket.status.replace('_', ' ')}</Badge>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">SLA Status</div>
            <Badge className={cn(
              'text-xs',
              ticket.sla_status === 'within_sla' && 'status-healthy',
              ticket.sla_status === 'at_risk' && 'status-warning',
              ticket.sla_status === 'breached' && 'status-critical',
            )}>
              {ticket.sla_hours_remaining > 0 ? `${ticket.sla_hours_remaining}h remaining` : `Breached by ${Math.abs(ticket.sla_hours_remaining)}h`}
            </Badge>
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Description</div>
          <p className="text-sm">{ticket.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Category</div>
            <div className="text-sm font-medium">{ticket.category}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Assigned To</div>
            <div className="text-sm font-medium">{ticket.assigned_to}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Created</div>
            <div className="text-sm">{new Date(ticket.created_at).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Last Updated</div>
            <div className="text-sm">{new Date(ticket.updated_at).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-3">Timeline</h4>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
            <div>
              <div className="text-xs font-medium">Ticket Created</div>
              <div className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-warning mt-1.5" />
            <div>
              <div className="text-xs font-medium">Assigned to {ticket.assigned_to}</div>
              <div className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleString()}</div>
            </div>
          </div>
          {ticket.status !== 'open' && (
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-healthy mt-1.5" />
              <div>
                <div className="text-xs font-medium">Work In Progress</div>
                <div className="text-xs text-muted-foreground">{new Date(ticket.updated_at).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetDetailPanel({ asset }: { asset: Asset }) {
  const assetPPM = ppmTasks.filter(p => p.asset_id === asset.id);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{asset.name}</h3>
            <p className="text-sm text-muted-foreground">{asset.asset_code}</p>
          </div>
          <Badge className={cn(
            'text-xs',
            asset.status === 'operational' && 'status-healthy',
            asset.status === 'maintenance' && 'status-warning',
            (asset.status === 'critical' || asset.status === 'offline') && 'status-critical',
          )}>
            {asset.status === 'maintenance' ? 'Breakdown' : asset.status}
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Health Score</div>
          <div className="text-xl font-bold">{asset.health_score}%</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Uptime</div>
          <div className="text-xl font-bold">{asset.uptime_percentage}%</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Category</div>
            <div className="text-sm font-medium">{asset.category}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Type</div>
            <div className="text-sm font-medium">{asset.type}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Manufacturer</div>
            <div className="text-sm font-medium">{asset.manufacturer}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Model</div>
            <div className="text-sm font-medium">{asset.model}</div>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-3">PPM Schedule</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 bg-muted/30 rounded-md">
            <div className="text-xs text-muted-foreground">Last PPM</div>
            <div className="text-sm font-medium">{asset.last_ppm_date}</div>
          </div>
          <div className="p-2 bg-muted/30 rounded-md">
            <div className="text-xs text-muted-foreground">Next PPM</div>
            <div className="text-sm font-medium">{asset.next_ppm_date}</div>
          </div>
        </div>
      </div>

      {assetPPM.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-3">PPM History</h4>
            <div className="space-y-2">
              {assetPPM.slice(0, 5).map(ppm => (
                <div key={ppm.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div>
                    <div className="text-xs font-medium">{ppm.type}</div>
                    <div className="text-xs text-muted-foreground">{ppm.scheduled_date}</div>
                  </div>
                  <Badge variant="outline" className={cn(
                    'text-2xs',
                    ppm.status === 'completed' && 'border-healthy text-healthy',
                    ppm.status === 'scheduled' && 'border-primary text-primary',
                    ppm.status === 'missed' && 'border-critical text-critical',
                  )}>
                    {ppm.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AlertDetailPanel({ alert }: { alert: Alert }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{alert.title}</h3>
            <p className="text-sm text-muted-foreground">{alert.site_name}</p>
          </div>
          <Badge className={cn(
            'text-xs',
            alert.severity === 'critical' && 'bg-critical text-critical-foreground',
            alert.severity === 'warning' && 'bg-warning text-warning-foreground',
          )}>
            {alert.severity}
          </Badge>
        </div>
      </div>

      <Separator />

      <div>
        <div className="text-xs text-muted-foreground mb-1">Description</div>
        <p className="text-sm">{alert.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Type</div>
          <div className="text-sm font-medium">{alert.type.replace('_', ' ')}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Time</div>
          <div className="text-sm font-medium">{new Date(alert.timestamp).toLocaleString()}</div>
        </div>
      </div>

      <Separator />

      <div className="flex gap-2">
        <Button className="flex-1" size="sm">Acknowledge</Button>
        <Button variant="outline" className="flex-1" size="sm">Escalate</Button>
      </div>
    </div>
  );
}

const KPI_TITLES: Record<string, string> = {
  kpi_ticket_sla: 'Ticket SLA Health',
  kpi_ppm: 'PPM Compliance',
  kpi_asset: 'Asset Health',
  kpi_workforce: 'Workforce Availability',
  kpi_vendor_sla: 'Vendor SLA',
  kpi_visitors: 'Visitors Today',
  kpi_avg_resolution: 'Avg Resolution Time',
  drill_asset: 'Asset Drill-down',
  drill_workforce: 'Workforce Drill-down',
  drill_site: 'Site Details',
  drill_ppm: 'PPM Drill-down',
  drill_visitors: 'Visitor Details',
  drill_ticket: 'Ticket Drill-down',
  drill_soft_services: 'Soft Services',
};

const KPI_PANEL_COMPONENTS: Record<string, React.ComponentType> = {
  kpi_ticket_sla: TicketSLAPanel,
  kpi_ppm: PPMCompliancePanel,
  kpi_asset: AssetHealthPanel,
  kpi_workforce: WorkforcePanel,
  kpi_vendor_sla: VendorSLAPanel,
  kpi_visitors: VisitorsTodayPanel,
  kpi_avg_resolution: AvgResolutionPanel,
  drill_asset: AssetDrillPanel,
  drill_workforce: WorkforceDrillPanel,
  drill_site: SiteDrillPanel,
  drill_ppm: PPMDrillPanel,
  drill_visitors: VisitorDrillPanel,
  drill_ticket: TicketDrillPanel,
  drill_soft_services: PPMDrillPanel,
};

export function SlideOverPanel() {
  const { slideOver, closeSlideOver } = useDashboard();

  if (!slideOver.isOpen) return null;

  const isWidePanel =
    slideOver.type?.startsWith('drill_') ||
    slideOver.type === 'site' ||
    slideOver.type === 'kpi_ticket_sla' ||
    slideOver.type === 'kpi_ppm' ||
    slideOver.type === 'kpi_asset' ||
    slideOver.type === 'kpi_workforce';

  const isPpmPanel = slideOver.type === 'kpi_ppm' || slideOver.type === 'drill_ppm' || slideOver.type === 'drill_soft_services';
  const panelWidth = isPpmPanel
    ? 'w-full sm:w-[960px] lg:w-[1040px] sm:max-w-[96vw]'
    : isWidePanel
    ? 'w-full sm:w-[760px] sm:max-w-[95vw]'
    : 'w-full sm:w-[540px] sm:max-w-[95vw]';

  const renderContent = () => {
    if (slideOver.type && KPI_PANEL_COMPONENTS[slideOver.type]) {
      const PanelComponent = KPI_PANEL_COMPONENTS[slideOver.type];
      return <PanelComponent />;
    }

    if (slideOver.type === 'site') {
      return <SiteDrillPanel />;
    }

    if (slideOver.type === 'asset' && !(slideOver.data as any)?.asset_number) {
      return <AssetDrillPanel />;
    }

    switch (slideOver.type) {
      case 'ticket':
        return <TicketDetailPanel ticket={slideOver.data as Ticket} />;
      case 'asset':
        return <AssetDetailPanel asset={slideOver.data as Asset} />;
      case 'alert':
        return <AlertDetailPanel alert={slideOver.data as Alert} />;
      default:
        return <div className="text-sm text-muted-foreground">No details available</div>;
    }
  };

  const getTitle = () => {
    if (slideOver.type && KPI_TITLES[slideOver.type]) {
      return KPI_TITLES[slideOver.type];
    }
    switch (slideOver.type) {
      case 'site': return 'Site Details';
      case 'ticket': return 'Ticket Details';
      case 'asset': return 'Asset Passport';
      case 'alert': return 'Alert Details';
      case 'vendor': return 'Vendor Details';
      case 'ppm': return 'PPM Task Details';
      case 'workforce': return 'Employee Details';
      case 'visitor': return 'Visitor Details';
      case 'compliance': return 'Compliance Details';
      default: return 'Details';
    }
  };

  return (
    <>
      {/* Blurred Backdrop Overlay */}
      <div
        className="fixed inset-0 z-50 animate-fade-in"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
        onClick={closeSlideOver}
      />

      {/* Slide-over Drawer Panel */}
      <div
        className={`fixed right-0 top-0 h-full ${panelWidth} max-w-full z-50 animate-slide-in-right overflow-hidden`}
        style={{
          backgroundColor: 'var(--drawer-bg, #0b111e)',
          color: 'var(--text-primary)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-elevation, -8px 0 32px rgba(0, 0, 0, 0.4))',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--drawer-header-bg, var(--drawer-bg))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#00C853',
                boxShadow: '0 0 8px #00C853',
              }}
            />
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {getTitle()}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeSlideOver}
            className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100%-57px)]">
          <div className="p-5 min-w-0 overflow-x-hidden text-foreground">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
