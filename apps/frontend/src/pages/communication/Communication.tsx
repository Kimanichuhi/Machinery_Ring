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
  Settings,
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
import { getWeatherStatus, sendSms, syncWeather } from '@/lib/backend';
import { cn } from '@/lib/utils';
import {
  SmsRecipient,
  defaultSmsTemplates,
  estimateSmsCost,
  getSmsPartCount,
  normalizePhoneNumber,
  renderTemplate,
  validateSmsDraft,
} from '@/lib/communication/sms';
import { WeatherSnapshot, buildWeatherRecommendations } from '@/lib/communication/weather';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  | 'weather'
  | 'settings';

type MessageStatus = 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';

const navItems = [
  { to: '/communication/sms', label: 'SMS Hub', icon: MessageSquare },
  { to: '/communication/sms/send', label: 'Send SMS', icon: Send },
  { to: '/communication/sms/templates', label: 'Templates', icon: FileText },
  { to: '/communication/sms/scheduled', label: 'Scheduled', icon: CalendarClock },
  { to: '/communication/sms/history', label: 'History', icon: History },
  { to: '/communication/weather', label: 'Weather', icon: CloudSun },
  { to: '/communication/settings', label: 'Settings', icon: Settings },
];

const historyRows: Array<Record<string, unknown>> = [];
const scheduledRows: Array<Record<string, unknown>> = [];
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

const envSmsProvider = import.meta.env.VITE_SMS_PROVIDER || import.meta.env.SMS_PROVIDER || 'not_configured';
const hasWeatherConfig = Boolean(import.meta.env.VITE_WEATHER_API_URL || import.meta.env.WEATHER_API_URL || import.meta.env.VITE_WEATHER_API_KEY || import.meta.env.WEATHER_API_KEY);
const envWeatherProvider = hasWeatherConfig ? 'OpenWeatherMap' : 'not_configured';
const smsProviderLabel = envSmsProvider === 'not_configured' ? 'Not configured' : envSmsProvider;

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
    <Card className="p-4">
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
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Communication Dashboard"
        description="Track the health of SMS and weather automations once live data is available."
        action={<Button variant="forest" onClick={() => window.location.assign('/communication/sms/send')}><Send className="mr-2 h-4 w-4" />Send SMS</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="SMS Today" value="0" subtitle="No live messages yet" icon={MessageSquare} />
        <MetricCard title="Scheduled" value="0" subtitle="No pending jobs" icon={CalendarClock} tone="warning" />
        <MetricCard title="Delivered" value="0" subtitle="No delivery data yet" icon={CheckCircle2} tone="success" />
        <MetricCard title="SMS Provider" value={smsProviderLabel} subtitle="Managed from environment" icon={Settings} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Outgoing SMS and weather campaigns will appear here after live dispatches are recorded.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyNotice title="No activity yet" description="Campaign history and delivery updates will appear here when messages are sent." />
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Weather Sync Status</CardTitle>
            <CardDescription>Read from environment-backed configuration for security.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-amber-50 p-4 text-amber-900">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                {envWeatherProvider === 'not_configured' ? 'Weather API Not Configured' : `${envWeatherProvider} configured`}
              </div>
              <p className="mt-1 text-sm">Configure weather credentials in the deployment environment to enable live forecasts and alerts.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SendSmsPage() {
  const { data: farmers = [], isLoading: farmersLoading } = useFarmers();
  const { data: localMRs = [] } = useLocalMRs();
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
  const estimatedCost = estimateSmsCost(content, recipients.length);

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
        <Card className="xl:col-span-2" variant="elevated">
          <CardHeader>
            <CardTitle>Message Form</CardTitle>
            <CardDescription>Use templates and variables such as {'{{farmer_name}}'}, {'{{local_mr}}'}, and {'{{date}}'}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          <Card variant="elevated">
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
                <MetricCard title="Cost" value={`KES ${estimatedCost}`} subtitle="Estimate" icon={MessageSquare} />
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>SMS Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-muted p-4 text-sm">
                {renderTemplate(content || 'Your SMS preview will appear here.', {
                  farmer_name: recipients[0]?.name || 'Farmer Name',
                  local_mr: recipients[0]?.localMr || 'Local MR',
                  date: new Date().toLocaleDateString('en-KE'),
                  time: '09:00',
                  weather: 'Weather update pending',
                  temperature: 'Pending',
                  training_location: 'Training venue',
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
              This will queue {recipients.length.toLocaleString()} message(s), estimated at KES {estimatedCost}.
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
  const templates = defaultSmsTemplates.filter((template) =>
    `${template.name} ${template.category} ${template.content}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="SMS Templates"
        description="Create reusable messages with variables for farmer, Local MR, weather, dates, and events."
        action={<Button variant="forest"><Plus className="mr-2 h-4 w-4" />Create Template</Button>}
      />
      <Card variant="elevated">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates..." />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.name} variant="elevated">
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
                <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" />View</Button>
                <Button variant="outline" size="sm"><Copy className="mr-2 h-4 w-4" />Duplicate</Button>
                <Button variant="outline" size="sm">Archive</Button>
                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ScheduledPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Scheduled SMS"
        description="Manage one-time and recurring SMS jobs, including retries, pause, and resume."
        action={<Button variant="forest"><CalendarClock className="mr-2 h-4 w-4" />New Schedule</Button>}
      />
      <Card variant="elevated">
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
              {scheduledRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell>{row.schedule}</TableCell>
                  <TableCell>{row.repeat}</TableCell>
                  <TableCell><Badge variant={row.status === 'running' ? 'warning' : 'secondary'}>{row.status}</Badge></TableCell>
                  <TableCell>{row.recipients.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon"><Pause className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"><Play className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm">Retry Failed</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
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
      <Card variant="elevated">
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

      <Card variant="elevated">
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
  const [statusMessage, setStatusMessage] = useState('Loading weather snapshot...');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadWeather = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    }

    try {
      const response = refresh ? await syncWeather() : await getWeatherStatus();
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
      setStatusMessage(response.message || (response.status === 'configured' ? 'Weather data is live.' : 'Weather API is not configured yet.'));
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
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Agricultural Summary</CardTitle>
              <CardDescription>Generated from latest weather snapshot and FIA-ready rules.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {recommendations.map((recommendation) => (
                <div key={recommendation.title} className="rounded-xl bg-muted/50 p-4">
                  <Badge variant={recommendation.severity === 'critical' ? 'destructive' : recommendation.severity === 'high' ? 'warning' : 'secondary'}>{recommendation.severity}</Badge>
                  <p className="mt-3 font-medium">{recommendation.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{recommendation.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="forecast">
          {snapshot.status === 'configured' ? (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Latest forecast snapshot</CardTitle>
                <CardDescription>Updated from OpenWeatherMap through the backend weather sync endpoint.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Location: {snapshot.location || 'Nyandarua'}</p>
                <p>Last updated: {snapshot.lastUpdated ? new Date(snapshot.lastUpdated).toLocaleString() : 'Not available yet'}</p>
                <p>Rain probability: {snapshot.rainProbability === undefined ? '--' : `${snapshot.rainProbability}%`}</p>
                <p>Alert level: {snapshot.alertLevel || 'low'}</p>
              </CardContent>
            </Card>
          ) : (
            <EmptyNotice title="Forecast cache is empty" description="Daily sync will populate today, tomorrow, and 7-day forecast cards once the weather API is configured." />
          )}
        </TabsContent>
        <TabsContent value="alerts"><EmptyNotice title="No active weather alerts" description="Heavy rain, storm, wind, frost, cold, heat, and drought alerts will appear here." /></TabsContent>
        <TabsContent value="history"><EmptyNotice title="No weather history yet" description="Weather snapshots and generated reports will be stored after synchronization starts." /></TabsContent>
        <TabsContent value="settings"><SettingsPage compact /></TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsPage({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('space-y-6', compact && 'mt-4')}>
      {!compact && (
        <SectionHeader
          title="Communication Settings"
          description="Configure provider, weather, automation, retry, rate limit, and message policies."
          action={<Button variant="forest">Save Settings</Button>}
        />
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>SMS Provider</CardTitle>
            <CardDescription>Provider values are read from the deployment environment for security and never exposed as mock options in the UI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Configured provider</p>
              <p className="mt-1 text-muted-foreground">{smsProviderLabel}</p>
            </div>
            <Input readOnly value={import.meta.env.VITE_SMS_API_URL || import.meta.env.SMS_API_URL || ''} placeholder="SMS_API_URL" />
            <Input readOnly value={import.meta.env.VITE_SMS_API_KEY || import.meta.env.SMS_API_KEY || ''} placeholder="SMS_API_KEY" type="password" />
            <Input readOnly value={import.meta.env.VITE_SMS_USERNAME || import.meta.env.SMS_USERNAME || ''} placeholder="SMS_USERNAME" />
            <Input readOnly value={import.meta.env.VITE_SMS_SENDER_ID || import.meta.env.SMS_SENDER_ID || ''} placeholder="SMS_SENDER_ID" />
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Weather Automation</CardTitle>
            <CardDescription>All values load from environment variables in deployed environments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input readOnly value={import.meta.env.VITE_WEATHER_API_URL || import.meta.env.WEATHER_API_URL || ''} placeholder="WEATHER_API_URL" />
            <Input readOnly value={import.meta.env.VITE_WEATHER_API_KEY || import.meta.env.WEATHER_API_KEY || ''} placeholder="WEATHER_API_KEY" type="password" />
            <Input readOnly value={import.meta.env.VITE_WEATHER_LOCATION || import.meta.env.WEATHER_LOCATION || 'Nyandarua'} placeholder="WEATHER_LOCATION" />
            <div className="grid grid-cols-2 gap-3">
              <Input readOnly value={import.meta.env.VITE_WEATHER_LATITUDE || import.meta.env.WEATHER_LATITUDE || '-0.3'} placeholder="WEATHER_LATITUDE" />
              <Input readOnly value={import.meta.env.VITE_WEATHER_LONGITUDE || import.meta.env.WEATHER_LONGITUDE || '36.55'} placeholder="WEATHER_LONGITUDE" />
            </div>
            <Input placeholder="Daily Sync Time" defaultValue="06:00" />
            <Input placeholder="Weekly SMS Time" defaultValue="Monday 07:00" />
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Automation Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {['Enable Weather Automation', 'Enable SMS Automation', 'Retry Failed SMS', 'Synchronize Delivery Status'].map((item) => (
              <label key={item} className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
                <Checkbox defaultChecked />
                <span className="text-sm">{item}</span>
              </label>
            ))}
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Limits And Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Maximum message length" defaultValue="918" />
            <Input placeholder="Daily message limit" defaultValue="10000" />
            <Input placeholder="Rate limit per minute" defaultValue="500" />
            <Input placeholder="Retry attempts" defaultValue="3" />
          </CardContent>
        </Card>
      </div>
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
      <Card className="p-2" variant="elevated">
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
      {section === 'settings' && <SettingsPage />}
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

export function CommunicationSettingsPage() {
  return <CommunicationShell section="settings" />;
}

export function CommunicationReports() {
  return <CommunicationReportsPage />;
}
