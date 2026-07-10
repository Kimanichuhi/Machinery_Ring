import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  CalendarClock,
  CheckCircle2,
  CloudSun,
  Copy,
  Download,
  Eye,
  FileText,
  History,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Star,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useAuth } from '@/contexts/AuthContext';
import { useFarmers } from '@/hooks/api/useFarmers';
import { useLocalMRs } from '@/hooks/api/useLocalMRs';
import { useClientPagination } from '@/hooks/useClientPagination';
import {
  archiveSmsTemplate,
  askFiaAssistant,
  createSmsTemplate,
  deleteSmsTemplate,
  fetchScheduledSms,
  fetchSmsTemplates,
  scheduleSms,
  sendSms,
  syncWeather,
  type ScheduledSmsRecord,
  type SmsTemplateRecord,
} from '@/lib/backend';
import { cn } from '@/lib/utils';
import {
  SmsRecipient,
  defaultSmsTemplates,
  getSmsPartCount,
  normalizePhoneNumber,
  renderTemplate,
  validateSmsDraft,
} from '@/lib/communication/sms';
import { WeatherSnapshot, buildWeatherRecommendations } from '@/lib/communication/weather';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type CommunicationSection =
  | 'dashboard'
  | 'send'
  | 'templates'
  | 'history'
  | 'scheduled'
  | 'weather';

const navItems = [
  { to: '/communication/sms', label: 'SMS Hub', icon: MessageSquare },
  { to: '/communication/sms/send', label: 'Send SMS', icon: Send },
  { to: '/communication/sms/templates', label: 'Templates', icon: FileText },
  { to: '/communication/sms/scheduled', label: 'Scheduled', icon: CalendarClock },
  { to: '/communication/sms/history', label: 'History', icon: History },
  { to: '/communication/weather', label: 'Weather', icon: CloudSun },
];

const historyRows: Array<Record<string, unknown>> = [];
const deliveryLogs: Array<Record<string, unknown>> = [];
const initialWeatherSnapshot: WeatherSnapshot = {
  status: 'not_configured',
  temperature: undefined,
  humidity: undefined,
  windSpeed: undefined,
  pressure: undefined,
  rainProbability: undefined,
  cloudCover: undefined,
  visibility: undefined,
  uvIndex: undefined,
  lastUpdated: undefined,
  alertLevel: 'medium',
};

type SmsTemplateView = {
  id: string;
  name: string;
  category: string;
  content: string;
  variables?: string[];
  isDefault?: boolean;
  isFavorite?: boolean;
};

type ForecastRow = {
  time?: string;
  summary?: string;
  temperature?: number;
  temperatureMin?: number;
  temperatureMax?: number;
  humidity?: number;
  rainProbability?: number;
  rainfall?: number;
  windSpeed?: number;
};

type WeatherAlert = {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  title?: string;
  message?: string;
};

function extractVariables(content: string) {
  return Array.from(new Set(Array.from(content.matchAll(/\{\{\s*([\w_]+)\s*\}\}/g)).map((match) => match[1])));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Default and locally-created (not-yet-persisted) templates don't have a
// real database id, so archive/delete can only be performed server-side
// for templates that came back from the API.
function isPersistedTemplateId(id: string) {
  return UUID_RE.test(id);
}

function mapTemplateRecord(template: SmsTemplateRecord): SmsTemplateView {
  return {
    id: template.id || template.name,
    name: template.name,
    category: template.category,
    content: template.body,
    variables: template.variables,
    isDefault: template.is_default,
    isFavorite: template.is_favorite,
  };
}

const fallbackTemplates: SmsTemplateView[] = defaultSmsTemplates.map((template) => ({
  id: template.name,
  name: template.name,
  category: template.category,
  content: template.content,
  variables: extractVariables(template.content),
  isDefault: true,
}));

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, tone = 'default' }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const color = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
  }[tone];

  return (
    <Card className="p-4" variant="solid">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold font-heading">{value}</p>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
}

function EmptyNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
      <MessageSquare className="mb-3 h-9 w-9 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function CommunicationDashboard() {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot>(initialWeatherSnapshot);

  useEffect(() => {
    let active = true;

    syncWeather()
      .then((response) => {
        if (!active || !response.snapshot) return;
        setSnapshot({
          ...initialWeatherSnapshot,
          ...response.snapshot,
          status: response.status === 'configured' ? 'configured' : response.status === 'error' ? 'error' : 'not_configured',
          lastUpdated: response.lastUpdated || initialWeatherSnapshot.lastUpdated,
        } as WeatherSnapshot);
      })
      .catch(() => {
        if (active) setSnapshot((current) => ({ ...current, status: 'error' }));
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Communication Dashboard"
        description="Track SMS activity and synced weather intelligence for farmer communication."
        action={<Button variant="forest" onClick={() => window.location.assign('/communication/sms/send')}><Send className="mr-2 h-4 w-4" />Send SMS</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="SMS Today" value="0" subtitle="No live messages yet" icon={MessageSquare} />
        <MetricCard title="Scheduled" value="0" subtitle="No pending jobs" icon={CalendarClock} tone="warning" />
        <MetricCard title="Delivered" value="0" subtitle="No delivery data yet" icon={CheckCircle2} tone="success" />
        <MetricCard title="Weather Status" value={snapshot.status === 'configured' ? 'Synced' : snapshot.status === 'error' ? 'Error' : 'Pending'} subtitle={snapshot.lastUpdated ? new Date(snapshot.lastUpdated).toLocaleString() : 'Automatic sync'} icon={CloudSun} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Temperature" value={snapshot.temperature === undefined ? '--' : `${snapshot.temperature.toFixed(1)}°C`} subtitle="Current" icon={CloudSun} />
        <MetricCard title="Humidity" value={snapshot.humidity === undefined ? '--' : `${snapshot.humidity}%`} subtitle="Current" icon={CloudSun} />
        <MetricCard title="Rain Probability" value={snapshot.rainProbability === undefined ? '--' : `${snapshot.rainProbability}%`} subtitle="Forecast signal" icon={CloudSun} tone={(snapshot.rainProbability || 0) >= 70 ? 'warning' : 'default'} />
        <MetricCard title="Wind Speed" value={snapshot.windSpeed === undefined ? '--' : `${snapshot.windSpeed.toFixed(1)} km/h`} subtitle="Current" icon={CloudSun} tone={(snapshot.windSpeed || 0) >= 30 ? 'warning' : 'default'} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card variant="solid">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Outgoing SMS and weather campaigns will appear here after live dispatches are recorded.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyNotice title="No activity yet" description="Campaign history and delivery updates will appear here when messages are sent." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SendSmsPage() {
  const { data: farmers = [], isLoading: farmersLoading } = useFarmers();
  const { data: localMRs = [] } = useLocalMRs();
  const [templates, setTemplates] = useState<SmsTemplateView[]>(fallbackTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState('none');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [customNumbers, setCustomNumbers] = useState('');
  const [recipientMode, setRecipientMode] = useState('all_farmers');
  const [localMrId, setLocalMrId] = useState('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const recipients: SmsRecipient[] = useMemo(() => {
    const baseFarmers = localMrId === 'all'
      ? farmers
      : farmers.filter((farmer: any) => farmer.local_mr_id === localMrId || farmer.localMrId === localMrId);

    const farmerRecipients = baseFarmers
      .map((farmer: any) => ({
        id: farmer.id,
        name: farmer.name || farmer.full_name || 'Unknown farmer',
        phone: farmer.phone || farmer.phone_number || '',
        localMr: farmer.localMrName || farmer.local_mrs?.name,
        ward: farmer.ward,
        village: farmer.village,
      }))
      .filter((recipient) => recipient.phone);

    if (recipientMode !== 'custom_numbers') return farmerRecipients;

    return customNumbers
      .split(/[\n,;]/)
      .map((phone, index) => phone.trim())
      .filter(Boolean)
      .map((phone, index) => ({ id: `custom-${index}`, name: `Custom ${index + 1}`, phone: normalizePhoneNumber(phone) }));
  }, [customNumbers, farmers, localMrId, recipientMode]);

  const validation = validateSmsDraft({ title, content, recipients });
  const parts = getSmsPartCount(content);

  useEffect(() => {
    let active = true;

    fetchSmsTemplates()
      .then((response) => {
        if (!active) return;
        const records = response.templates.map(mapTemplateRecord);
        setTemplates(records.length > 0 ? records : fallbackTemplates);
      })
      .catch(() => {
        if (active) setTemplates(fallbackTemplates);
      });

    return () => {
      active = false;
    };
  }, []);

  const buildRecipientVariables = (recipient: SmsRecipient) => ({
    farmer_name: recipient.name,
    local_mr: recipient.localMr || 'Local MR',
    ward: recipient.ward || '',
    village: recipient.village || '',
    date: new Date().toLocaleDateString('en-KE'),
    time: '09:00',
    weather: 'Weather update pending',
    temperature: 'Pending',
    training_location: 'Training venue',
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'none') return;

    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    setTitle((current) => current || template.name);
    setContent(template.content);
  };

  const handleConfirmSend = () => {
    if (!validation.valid) {
      validation.errors.forEach((error) => toast.error(error));
      return;
    }
    setConfirmOpen(true);
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    setIsSending(true);

    try {
      const result = await sendSms({
        title,
        message: content,
        type: 'manual',
        recipients: recipients.map((recipient) => ({
          id: recipient.id,
          name: recipient.name,
          phone: normalizePhoneNumber(recipient.phone),
          message: renderTemplate(content, buildRecipientVariables(recipient)),
          variables: buildRecipientVariables(recipient),
        })),
      });

      toast.success(`SMS ${result.status} with ${result.provider}.`);
      if (result.warning) {
        toast.warning(result.warning);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send SMS.');
    } finally {
      setIsSending(false);
    }
  };

  if (farmersLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Send SMS"
        description="Compose, validate, preview, and queue bulk SMS messages."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" variant="solid">
          <CardHeader>
            <CardTitle>Message Form</CardTitle>
            <CardDescription>Use templates and variables such as {'{{farmer_name}}'}, {'{{local_mr}}'}, and {'{{date}}'}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Use Template</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message-title">Message Title</Label>
              <Input id="message-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Weekly Weather Update" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message-content">SMS Content</Label>
              <Textarea
                id="message-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Hello {{farmer_name}}, this week in Nyandarua..."
                className="min-h-[180px]"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{content.length}/918 characters</span>
                <span>{parts} SMS part(s) per recipient</span>
              </div>
            </div>
            {validation.errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {validation.errors.map((error) => <p key={error}>{error}</p>)}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card variant="solid">
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
              <CardDescription>Filter farmers or enter custom numbers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient Segment</Label>
                <Select value={recipientMode} onValueChange={setRecipientMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_farmers">All Farmers</SelectItem>
                    <SelectItem value="local_mr">Specific Local MR</SelectItem>
                    <SelectItem value="ward">Specific Ward</SelectItem>
                    <SelectItem value="village">Specific Village</SelectItem>
                    <SelectItem value="tot">Specific TOT</SelectItem>
                    <SelectItem value="farmer">Specific Farmer</SelectItem>
                    <SelectItem value="potato_farmers">Potato Farmers</SelectItem>
                    <SelectItem value="dairy_farmers">Dairy Farmers</SelectItem>
                    <SelectItem value="poultry_farmers">Poultry Farmers</SelectItem>
                    <SelectItem value="vegetable_farmers">Vegetable Farmers</SelectItem>
                    <SelectItem value="machinery_bookings">Farmers With Machinery Bookings</SelectItem>
                    <SelectItem value="training_attendees">Farmers Who Attended Training</SelectItem>
                    <SelectItem value="custom_numbers">Custom Phone Numbers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Local MR</Label>
                <Select value={localMrId} onValueChange={setLocalMrId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Local MRs</SelectItem>
                    {localMRs.map((mr: any) => (
                      <SelectItem key={mr.id} value={mr.id}>{mr.name || mr.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {recipientMode === 'custom_numbers' && (
                <div className="space-y-2">
                  <Label>Custom Phone Numbers</Label>
                  <Textarea value={customNumbers} onChange={(event) => setCustomNumbers(event.target.value)} placeholder="+254712345678, 0712345678" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <MetricCard title="Recipients" value={recipients.length} subtitle="Estimated" icon={Users} />
                <MetricCard title="SMS Parts" value={parts} subtitle="Per recipient" icon={MessageSquare} />
              </div>
            </CardContent>
          </Card>

          <Card variant="solid">
            <CardHeader>
              <CardTitle>SMS Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-muted p-4 text-sm">
                {renderTemplate(content || 'Your SMS preview will appear here.', {
                  ...buildRecipientVariables(recipients[0] || { id: 'preview', name: 'Farmer Name', phone: '' }),
                })}
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Preview Recipients</p>
                {recipients.slice(0, 5).map((recipient) => (
                  <div key={recipient.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span>{recipient.name}</span>
                    <span className="text-muted-foreground">{normalizePhoneNumber(recipient.phone)}</span>
                  </div>
                ))}
                {recipients.length === 0 && <EmptyNotice title="No recipients selected" description="Choose a segment or add phone numbers to preview recipients." />}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="forest" onClick={handleConfirmSend} disabled={isSending}>
          {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSending ? 'Sending...' : 'Send SMS'}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm SMS Dispatch</DialogTitle>
            <DialogDescription>
              This will queue {recipients.length.toLocaleString()} personalized message(s).
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="forest" onClick={handleSend} disabled={isSending}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Queue SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<SmsTemplateView[]>(fallbackTemplates);
  const [createOpen, setCreateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('General');
  const [templateBody, setTemplateBody] = useState('Hello {{farmer_name}}, ');
  const [isSaving, setIsSaving] = useState(false);
  const filteredTemplates = templates.filter((template) =>
    `${template.name} ${template.category} ${template.content}`.toLowerCase().includes(search.toLowerCase())
  );

  const loadTemplates = async () => {
    try {
      const response = await fetchSmsTemplates();
      const records = response.templates.map(mapTemplateRecord);
      setTemplates(records.length > 0 ? records : fallbackTemplates);
    } catch {
      setTemplates(fallbackTemplates);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !templateBody.trim()) {
      toast.error('Template name and message body are required.');
      return;
    }

    setIsSaving(true);
    const nextTemplate: SmsTemplateView = {
      id: `local-${Date.now()}`,
      name: templateName.trim(),
      category: templateCategory.trim() || 'General',
      content: templateBody.trim(),
      variables: extractVariables(templateBody),
    };

    try {
      const response = await createSmsTemplate({
        name: nextTemplate.name,
        category: nextTemplate.category,
        body: nextTemplate.content,
        variables: nextTemplate.variables,
      });
      setTemplates((current) => [mapTemplateRecord(response.template), ...current]);
      toast.success('Template created.');
    } catch (error) {
      setTemplates((current) => [nextTemplate, ...current]);
      toast.warning(error instanceof Error ? `${error.message} Saved locally for this session.` : 'Saved locally for this session.');
    } finally {
      setIsSaving(false);
      setCreateOpen(false);
      setTemplateName('');
      setTemplateCategory('General');
      setTemplateBody('Hello {{farmer_name}}, ');
    }
  };

  const [viewingTemplate, setViewingTemplate] = useState<SmsTemplateView | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<SmsTemplateView | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const handleDuplicateTemplate = async (template: SmsTemplateView) => {
    setPendingActionId(template.id);
    const copyName = `${template.name} (Copy)`;
    try {
      const response = await createSmsTemplate({
        name: copyName,
        category: template.category,
        body: template.content,
        variables: template.variables,
      });
      setTemplates((current) => [mapTemplateRecord(response.template), ...current]);
      toast.success('Template duplicated.');
    } catch (error) {
      setTemplates((current) => [
        { ...template, id: `local-${Date.now()}`, name: copyName },
        ...current,
      ]);
      toast.warning(error instanceof Error ? `${error.message} Saved locally for this session.` : 'Saved locally for this session.');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleArchiveTemplate = async (template: SmsTemplateView) => {
    if (!isPersistedTemplateId(template.id)) {
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      toast.success('Template archived.');
      return;
    }

    setPendingActionId(template.id);
    try {
      await archiveSmsTemplate(template.id);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      toast.success('Template archived.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not archive template.');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTemplate) return;

    if (!isPersistedTemplateId(deletingTemplate.id)) {
      setTemplates((current) => current.filter((item) => item.id !== deletingTemplate.id));
      toast.success('Template deleted.');
      setDeletingTemplate(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteSmsTemplate(deletingTemplate.id);
      setTemplates((current) => current.filter((item) => item.id !== deletingTemplate.id));
      toast.success('Template deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete template.');
    } finally {
      setIsDeleting(false);
      setDeletingTemplate(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="SMS Templates"
        description="Create reusable messages with variables for farmer, Local MR, weather, dates, and events."
        action={<Button variant="forest" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Template</Button>}
      />
      <Card variant="solid">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates..." />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.name} variant="solid">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.category}</CardDescription>
                </div>
                <Button variant="ghost" size="icon"><Star className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-xl bg-muted/50 p-3 text-sm">{template.content}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewingTemplate(template)}>
                  <Eye className="mr-2 h-4 w-4" />View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingActionId === template.id}
                  onClick={() => void handleDuplicateTemplate(template)}
                >
                  <Copy className="mr-2 h-4 w-4" />Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingActionId === template.id}
                  onClick={() => void handleArchiveTemplate(template)}
                >
                  Archive
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeletingTemplate(template)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create SMS Template</DialogTitle>
            <DialogDescription>Use variables such as {'{{farmer_name}}'}, {'{{local_mr}}'}, {'{{date}}'}, and {'{{weather}}'}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input id="template-name" value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Planting Advisory" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-category">Category</Label>
              <Input id="template-category" value={templateCategory} onChange={(event) => setTemplateCategory(event.target.value)} placeholder="Advisory" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-body">Message Body</Label>
              <Textarea id="template-body" value={templateBody} onChange={(event) => setTemplateBody(event.target.value)} className="min-h-[150px]" />
              <p className="text-xs text-muted-foreground">Detected variables: {extractVariables(templateBody).join(', ') || 'none'}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button variant="forest" onClick={handleCreateTemplate} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && setViewingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingTemplate?.name}</DialogTitle>
            <DialogDescription>{viewingTemplate?.category}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="rounded-xl bg-muted/50 p-3 text-sm whitespace-pre-wrap">{viewingTemplate?.content}</p>
            <p className="text-xs text-muted-foreground">
              Variables: {viewingTemplate?.variables?.join(', ') || 'none'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingTemplate?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDelete()} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScheduledPage() {
  const { data: farmers = [] } = useFarmers();
  const { data: localMRs = [] } = useLocalMRs();
  const [schedules, setSchedules] = useState<ScheduledSmsRecord[]>([]);
  const [templates, setTemplates] = useState<SmsTemplateView[]>(fallbackTemplates);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [repeatRule, setRepeatRule] = useState('once');
  const [recipientMode, setRecipientMode] = useState('all_farmers');
  const [localMrId, setLocalMrId] = useState('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState('none');
  const [isSaving, setIsSaving] = useState(false);

  const recipients: SmsRecipient[] = useMemo(() => {
    const baseFarmers = localMrId === 'all'
      ? farmers
      : farmers.filter((farmer: any) => farmer.local_mr_id === localMrId || farmer.localMrId === localMrId);

    return baseFarmers
      .map((farmer: any) => ({
        id: farmer.id,
        name: farmer.name || farmer.full_name || 'Unknown farmer',
        phone: farmer.phone || farmer.phone_number || '',
        localMr: farmer.localMrName || farmer.local_mrs?.name,
        ward: farmer.ward,
        village: farmer.village,
      }))
      .filter((recipient) => recipient.phone);
  }, [farmers, localMrId]);

  useEffect(() => {
    fetchScheduledSms()
      .then((response) => setSchedules(response.schedules))
      .catch(() => setSchedules([]));

    fetchSmsTemplates()
      .then((response) => {
        const records = response.templates.map(mapTemplateRecord);
        setTemplates(records.length > 0 ? records : fallbackTemplates);
      })
      .catch(() => setTemplates(fallbackTemplates));
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'none') return;

    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setTitle((current) => current || template.name);
    setContent(template.content);
  };

  const handleCreateSchedule = async () => {
    if (!title.trim() || !content.trim() || !scheduledFor) {
      toast.error('Title, message, and schedule time are required.');
      return;
    }

    if (recipients.length === 0) {
      toast.error('Select at least one recipient.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await scheduleSms({
        title,
        message: content,
        scheduledFor: new Date(scheduledFor).toISOString(),
        repeatRule,
        recipientMode,
        localMrId,
        recipients: recipients.map((recipient) => ({
          id: recipient.id,
          name: recipient.name,
          phone: normalizePhoneNumber(recipient.phone),
          message: renderTemplate(content, {
            farmer_name: recipient.name,
            local_mr: recipient.localMr || 'Local MR',
            ward: recipient.ward || '',
            village: recipient.village || '',
            date: new Date(scheduledFor).toLocaleDateString('en-KE'),
            time: new Date(scheduledFor).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
          }),
        })),
      });

      setSchedules((current) => [response.schedule, ...current]);
      toast.success('SMS schedule created.');
      setCreateOpen(false);
      setTitle('');
      setContent('');
      setScheduledFor('');
      setRepeatRule('once');
      setRecipientMode('all_farmers');
      setLocalMrId('all');
      setSelectedTemplateId('none');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Scheduled SMS"
        description="Manage one-time and recurring SMS jobs, including retries, pause, and resume."
        action={<Button variant="forest" onClick={() => setCreateOpen(true)}><CalendarClock className="mr-2 h-4 w-4" />New Schedule</Button>}
      />
      <Card variant="solid">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Repeat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell>{new Date(row.scheduled_for).toLocaleString()}</TableCell>
                  <TableCell>{row.repeat_rule}</TableCell>
                  <TableCell><Badge variant={row.status === 'running' ? 'warning' : 'secondary'}>{row.status}</Badge></TableCell>
                  <TableCell>{row.filters?.recipientCount?.toLocaleString() || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon"><Pause className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"><Play className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm">Retry Failed</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {schedules.length === 0 && <EmptyNotice title="No schedules yet" description="Create a one-time or recurring SMS schedule for farmers." />}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New SMS Schedule</DialogTitle>
            <DialogDescription>Schedule a personalized SMS for a future time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Repeat</Label>
                <Select value={repeatRule} onValueChange={setRepeatRule}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Weekly Advisory" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[130px]" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Schedule Date And Time</Label>
                <Input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Recipient Segment</Label>
                <Select value={recipientMode} onValueChange={setRecipientMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_farmers">All Farmers</SelectItem>
                    <SelectItem value="local_mr">Specific Local MR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {recipientMode === 'local_mr' && (
              <div className="space-y-2">
                <Label>Local MR</Label>
                <Select value={localMrId} onValueChange={setLocalMrId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Local MRs</SelectItem>
                    {localMRs.map((mr: any) => (
                      <SelectItem key={mr.id} value={mr.id}>{mr.name || mr.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              {recipients.length.toLocaleString()} recipient(s) will be scheduled. First preview: {renderTemplate(content || 'No message yet.', {
                farmer_name: recipients[0]?.name || 'Farmer Name',
                local_mr: recipients[0]?.localMr || 'Local MR',
                date: scheduledFor ? new Date(scheduledFor).toLocaleDateString('en-KE') : new Date().toLocaleDateString('en-KE'),
                time: scheduledFor ? new Date(scheduledFor).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '09:00',
              })}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button variant="forest" onClick={handleCreateSchedule} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildWeatherInsight(snapshot: WeatherSnapshot, forecast: ForecastRow[]) {
  if (snapshot.status !== 'configured') {
    return 'Weather insight will appear after the weather API syncs successfully.';
  }

  const nextRain = forecast.find((item) => (item.rainProbability || 0) >= 40);
  const nextCold = forecast.find((item) => (item.temperatureMin ?? item.temperature ?? 99) <= 10);
  const nextWind = forecast.find((item) => (item.windSpeed || 0) >= 25);
  const parts = [
    `Current conditions show ${snapshot.temperature ?? '--'}°C, ${snapshot.humidity ?? '--'}% humidity, and ${snapshot.rainProbability ?? 0}% rain probability.`,
  ];

  if (nextRain) {
    parts.push(`Rain risk rises around ${nextRain.time ? new Date(nextRain.time).toLocaleString() : 'the next forecast window'} with ${nextRain.rainProbability}% probability and about ${nextRain.rainfall ?? 0} mm expected.`);
  }

  if (nextCold) {
    parts.push(`Cold stress is possible around ${nextCold.time ? new Date(nextCold.time).toLocaleString() : 'the next forecast window'} as temperatures approach ${nextCold.temperatureMin ?? nextCold.temperature}°C.`);
  }

  if (nextWind) {
    parts.push(`Wind may reach ${nextWind.windSpeed} km/h, so spraying should be reviewed before field dispatch.`);
  }

  if (!nextRain && !nextCold && !nextWind) {
    parts.push('No severe short-term signal is visible, so routine field work can continue while monitoring local changes.');
  }

  return parts.join(' ');
}

function HistoryPage() {
  const [search, setSearch] = useState('');
  const filteredRows = historyRows.filter((row) => `${row.title} ${row.sender} ${row.type} ${row.status}`.toLowerCase().includes(search.toLowerCase()));
  const pagination = useClientPagination(filteredRows, 10);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="SMS History"
        description="Review sent campaigns, delivery outcomes, cost, export logs, duplicate, or resend."
        action={<Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>}
      />
      <Card variant="solid">
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search history..." className="md:col-span-2" />
            <Input type="date" />
            <Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select>
            <Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="weather">Weather</SelectItem><SelectItem value="training">Training</SelectItem><SelectItem value="machinery">Machinery</SelectItem></SelectContent></Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Success</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedItems.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell>{row.sender}</TableCell>
                  <TableCell>{row.recipients.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={row.status === 'failed' ? 'destructive' : 'success'}>{row.status}</Badge></TableCell>
                  <TableCell>{row.success}</TableCell>
                  <TableCell>{row.failed}</TableCell>
                  <TableCell>{row.pending}</TableCell>
                  <TableCell>KES {row.cost}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm">Resend</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalCount={filteredRows.length}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </CardContent>
      </Card>

      <Card variant="solid">
        <CardHeader>
          <CardTitle>Delivery Logs</CardTitle>
          <CardDescription>Per-recipient provider status and retry details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Provider ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Failure Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryLogs.map((log) => (
                <TableRow key={log.providerId}>
                  <TableCell>{log.farmer}</TableCell>
                  <TableCell>{log.phone}</TableCell>
                  <TableCell>{log.providerId}</TableCell>
                  <TableCell><Badge variant={log.status === 'failed' ? 'destructive' : log.status === 'pending' ? 'warning' : 'success'}>{log.status}</Badge></TableCell>
                  <TableCell>{log.response}</TableCell>
                  <TableCell>{log.retries}</TableCell>
                  <TableCell>{log.sentAt}</TableCell>
                  <TableCell>{log.deliveredAt}</TableCell>
                  <TableCell>{log.failure}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function WeatherPage() {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot>(initialWeatherSnapshot);
  const [forecast, setForecast] = useState<ForecastRow[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [aiInsight, setAiInsight] = useState('');
  const [statusMessage, setStatusMessage] = useState('Loading weather snapshot...');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadWeather = async (refresh = false) => {
    setIsRefreshing(true);

    try {
      const response = await syncWeather();
      const nextSnapshot = response.snapshot ? {
        ...initialWeatherSnapshot,
        ...response.snapshot,
        status: response.status === 'configured' ? 'configured' : response.status === 'error' ? 'error' : 'not_configured',
        lastUpdated: response.lastUpdated || initialWeatherSnapshot.lastUpdated,
      } as WeatherSnapshot : {
        ...initialWeatherSnapshot,
        status: response.status === 'configured' ? 'configured' : response.status === 'error' ? 'error' : 'not_configured',
        lastUpdated: response.lastUpdated || initialWeatherSnapshot.lastUpdated,
      };

      setSnapshot(nextSnapshot);
      setForecast((response.forecast || []) as ForecastRow[]);
      setAlerts((response.alerts || []) as WeatherAlert[]);
      setStatusMessage(response.message || (response.status === 'configured' ? 'Weather data is live.' : 'Weather API is not configured yet.'));

      const fallbackInsight = buildWeatherInsight(nextSnapshot, (response.forecast || []) as ForecastRow[]);
      setAiInsight(fallbackInsight);

      if (response.status === 'configured') {
        askFiaAssistant('Create a concise agricultural weather insight for Nyandarua using the supplied current weather, forecast, and alerts. Mention practical field actions only when supported by the values.', {
          current: nextSnapshot,
          forecast: response.forecast || [],
          alerts: response.alerts || [],
        })
          .then((aiResponse) => setAiInsight(aiResponse.content))
          .catch(() => setAiInsight(fallbackInsight));
      }

      const visibleAlerts = ((response.alerts || []) as WeatherAlert[]).filter((alert) => ['medium', 'high', 'critical'].includes(alert.severity || ''));
      visibleAlerts.forEach((alert) => toast.warning(alert.title || 'Weather alert', { description: alert.message }));
    } catch (error) {
      setSnapshot((current) => ({ ...current, status: 'error' }));
      setStatusMessage(error instanceof Error ? error.message : 'Weather sync failed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadWeather(false);
  }, []);

  const recommendations = buildWeatherRecommendations(snapshot);
  const weatherStatusLabel = snapshot.status === 'configured' ? 'Weather API is live' : snapshot.status === 'error' ? 'Weather sync failed' : 'Weather API Not Configured';
  const weatherStatusDescription = snapshot.status === 'configured'
    ? (statusMessage || 'Live forecast data is available.')
    : statusMessage;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Weather Intelligence"
        description="Current weather, forecasts, alerts, history, and agricultural recommendations for Nyandarua."
        action={
          <Button variant="outline" onClick={() => void loadWeather(true)} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      />

      <div className={`rounded-xl border p-4 ${snapshot.status === 'configured' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : snapshot.status === 'error' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" />
          {weatherStatusLabel}
        </div>
        <p className="mt-1 text-sm">{weatherStatusDescription}</p>
      </div>

      <Tabs defaultValue="current">
        <TabsList className="flex w-full flex-wrap justify-start h-auto">
          <TabsTrigger value="current">Current Weather</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="current" className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
            <MetricCard title="Temperature" value={snapshot.temperature === undefined ? '--' : `${snapshot.temperature.toFixed(1)}°C`} subtitle="Celsius" icon={CloudSun} />
            <MetricCard title="Humidity" value={snapshot.humidity === undefined ? '--' : `${snapshot.humidity}%`} subtitle="Percent" icon={CloudSun} />
            <MetricCard title="Wind Speed" value={snapshot.windSpeed === undefined ? '--' : `${snapshot.windSpeed.toFixed(1)} km/h`} subtitle="km/h" icon={CloudSun} />
            <MetricCard title="Rain Probability" value={snapshot.rainProbability === undefined ? '--' : `${snapshot.rainProbability}%`} subtitle="Percent" icon={CloudSun} />
            <MetricCard title="UV Index" value={snapshot.uvIndex === undefined ? '--' : `${snapshot.uvIndex}`} subtitle="Risk level" icon={CloudSun} />
            <MetricCard title="Pressure" value={snapshot.pressure === undefined ? '--' : `${snapshot.pressure} hPa`} subtitle="hPa" icon={CloudSun} />
            <MetricCard title="Cloud Cover" value={snapshot.cloudCover === undefined ? '--' : `${snapshot.cloudCover}%`} subtitle="Percent" icon={CloudSun} />
            <MetricCard title="Visibility" value={snapshot.visibility === undefined ? '--' : `${snapshot.visibility.toFixed(1)} km`} subtitle="Kilometers" icon={CloudSun} />
            <MetricCard title="Sunrise" value={snapshot.sunrise || '--'} subtitle="Local time" icon={CloudSun} />
            <MetricCard title="Sunset" value={snapshot.sunset || '--'} subtitle="Local time" icon={CloudSun} />
          </div>
          <Card variant="solid">
            <CardHeader>
              <CardTitle>Agricultural Summary</CardTitle>
              <CardDescription>Generated from the latest synced weather values and MR Assistant when available.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4 text-sm leading-6">{aiInsight || buildWeatherInsight(snapshot, forecast)}</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {recommendations.map((recommendation) => (
                  <div key={recommendation.title} className="rounded-xl bg-muted/50 p-4">
                    <Badge variant={recommendation.severity === 'critical' ? 'destructive' : recommendation.severity === 'high' ? 'warning' : 'secondary'}>{recommendation.severity}</Badge>
                    <p className="mt-3 font-medium">{recommendation.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{recommendation.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="forecast">
          {snapshot.status === 'configured' ? (
            <Card variant="solid">
              <CardHeader>
                <CardTitle>Detailed Forecast</CardTitle>
                <CardDescription>{buildWeatherInsight(snapshot, forecast)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Expected Conditions</TableHead>
                      <TableHead>Temp</TableHead>
                      <TableHead>Humidity</TableHead>
                      <TableHead>Rain</TableHead>
                      <TableHead>Wind</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecast.map((row, index) => (
                      <TableRow key={`${row.time}-${index}`}>
                        <TableCell>{row.time ? new Date(row.time).toLocaleString() : 'Next window'}</TableCell>
                        <TableCell className="font-medium">{row.summary || 'Forecast update'}</TableCell>
                        <TableCell>{row.temperature === undefined ? '--' : `${row.temperature}°C`}</TableCell>
                        <TableCell>{row.humidity === undefined ? '--' : `${row.humidity}%`}</TableCell>
                        <TableCell>{row.rainProbability ?? 0}% / {row.rainfall ?? 0} mm</TableCell>
                        <TableCell>{row.windSpeed === undefined ? '--' : `${row.windSpeed} km/h`}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {forecast.length === 0 && <EmptyNotice title="Forecast details are not available" description="The weather API synced current values but did not return forecast windows." />}
              </CardContent>
            </Card>
          ) : (
            <EmptyNotice title="Forecast cache is empty" description="Daily sync will populate today, tomorrow, and 7-day forecast cards once the weather API is configured." />
          )}
        </TabsContent>
        <TabsContent value="alerts">
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={`${alert.title}-${index}`} className={cn(
                'rounded-xl border p-4',
                alert.severity === 'critical' || alert.severity === 'high'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : alert.severity === 'medium'
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              )}>
                <div className="flex items-center gap-2 font-medium">
                  <BellRing className="h-4 w-4" />
                  {alert.title}
                  <Badge variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'warning' : 'success'}>{alert.severity || 'low'}</Badge>
                </div>
                <p className="mt-1 text-sm">{alert.message}</p>
              </div>
            ))}
            {alerts.length === 0 && <EmptyNotice title="No active weather alerts" description="Heavy rain, strong wind, cold, heat, and drought alerts will appear here only when forecast values support them." />}
          </div>
        </TabsContent>
        <TabsContent value="history"><EmptyNotice title="No weather history yet" description="Weather snapshots and generated reports will be stored after synchronization starts." /></TabsContent>
      </Tabs>
    </div>
  );
}

function CommunicationReportsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Communication Reports" description="Daily, weekly, monthly, provider usage, alert, weather, and queue performance reports." />
      <EmptyNotice title="Report exports are ready for provider data" description="PDF, Excel, and CSV exports can be generated once live communication records exist." />
    </div>
  );
}

function CommunicationShell({ section }: { section: CommunicationSection }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/dashboard" replace />;
  }

  const activePath = location.pathname === '/communication' || location.pathname === '/communication/sms'
    ? '/communication/sms'
    : location.pathname;

  return (
    <div className="space-y-6">
      <Card className="p-2" variant="solid">
        <div className="flex gap-1 overflow-x-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
                activePath === to ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </Card>

      {section === 'dashboard' && <CommunicationDashboard />}
      {section === 'send' && <SendSmsPage />}
      {section === 'templates' && <TemplatesPage />}
      {section === 'scheduled' && <ScheduledPage />}
      {section === 'history' && <HistoryPage />}
      {section === 'weather' && <WeatherPage />}
    </div>
  );
}

export function Communication() {
  return <CommunicationShell section="dashboard" />;
}

export function CommunicationDashboardPage() {
  return <CommunicationShell section="dashboard" />;
}

export function CommunicationSmsPage() {
  return <CommunicationShell section="dashboard" />;
}

export function CommunicationSmsSendPage() {
  return <CommunicationShell section="send" />;
}

export function CommunicationSmsTemplatesPage() {
  return <CommunicationShell section="templates" />;
}

export function CommunicationSmsHistoryPage() {
  return <CommunicationShell section="history" />;
}

export function CommunicationSmsScheduledPage() {
  return <CommunicationShell section="scheduled" />;
}

export function CommunicationSendPage() {
  return <CommunicationShell section="send" />;
}

export function CommunicationTemplatesPage() {
  return <CommunicationShell section="templates" />;
}

export function CommunicationHistoryPage() {
  return <CommunicationShell section="history" />;
}

export function CommunicationScheduledPage() {
  return <CommunicationShell section="scheduled" />;
}

export function CommunicationWeatherPage() {
  return <CommunicationShell section="weather" />;
}

export function CommunicationReports() {
  return <CommunicationReportsPage />;
}
