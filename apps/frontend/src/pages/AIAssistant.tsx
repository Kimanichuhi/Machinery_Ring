import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BrainCircuit, History, Loader2, Paperclip, Plus, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useFarmers } from '@/hooks/api/useFarmers';
import { useMachineryBookings } from '@/hooks/api/useMachineryBookings';
import { useProducts } from '@/hooks/api/useProducts';
import { useSales } from '@/hooks/api/useSales';
import { useTrainings } from '@/hooks/api/useTrainings';
import { useVisits } from '@/hooks/api/useVisits';
import { askFiaAssistant, BackendError, type FiaAttachment } from '@/lib/backend';
import { cn } from '@/lib/utils';

type MessageAttachment = {
  name: string;
  mimeType: string;
};

type AssistantMessage = {
  role: 'assistant' | 'user';
  content: string;
  attachments?: MessageAttachment[];
};

type ChatSession = {
  id: string;
  title: string;
  messages: AssistantMessage[];
  updatedAt: number;
};

type Recommendation = {
  title: string;
  reason: string;
  impact: string;
  urgency: 'High' | 'Medium' | 'Low';
};

const suggestedPrompts = [
  'Generate today\'s executive briefing',
  'Which products generate the highest revenue?',
  'What inventory items are running low?',
  'Show worker productivity rankings',
  'Generate monthly farm report',
  'What are our biggest operational risks?',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value || 0);

const asDate = (value?: string) => (value ? new Date(value) : null);

const getItemDate = (item: Record<string, unknown>) =>
  (item.sale_date || item.scheduled_date || item.visit_date || item.start_date || item.created_at) as string | undefined;

const normalizeNumber = (...values: unknown[]) => {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
};

const getName = (item: Record<string, unknown>, fallback: string) =>
  String(item.name || item.productName || item.product_name || item.title || item.description || fallback);

const getRevenue = (sale: Record<string, unknown>) =>
  normalizeNumber(sale.total, sale.total_amount, sale.amount, sale.revenue, sale.price);

const getPersonName = (item: Record<string, unknown>) =>
  String(item.totName || item.tot_name || item.trainer_name || item.created_by_name || item.booked_by_name || 'Unassigned');

const formatPercent = (value: number) => `${Math.abs(value).toFixed(0)}%`;

const initialAssistantMessage: AssistantMessage = {
  role: 'assistant',
  content:
    'Good morning. I am MR Assistant, here to help with production, inventory, sales, machinery, workforce, reports, and risks using the farm data currently available in the platform. You can also attach a file (image, PDF, spreadsheet) for me to analyze.',
};

const createChatId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getChatTitle = (messages: AssistantMessage[]) => {
  const firstQuestion = messages.find((message) => message.role === 'user')?.content.trim();
  if (!firstQuestion) return 'New chat';
  return firstQuestion.length > 42 ? `${firstQuestion.slice(0, 42)}...` : firstQuestion;
};

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // ~8MB raw, must stay in sync with the backend's limit
const MAX_HISTORY_SESSIONS = 20;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      // Strip the "data:<mime>;base64," prefix — Gemini wants the raw base64 payload.
      const base64 = result.slice(result.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

function renderTextWithLinks(text: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  MARKDOWN_LINK_RE.lastIndex = 0;
  while ((match = MARKDOWN_LINK_RE.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <a
        key={`link-${key++}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts;
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const tableStart = lines.findIndex((line, index) => {
    const next = lines[index + 1] || '';
    return line.trim().startsWith('|') && next.includes('---');
  });

  if (tableStart >= 0) {
    const before = lines.slice(0, tableStart).join('\n').trim();
    const tableLines = lines.slice(tableStart).filter((line) => line.trim().startsWith('|'));
    const [headerLine, _separator, ...rowLines] = tableLines;
    const headers = headerLine.split('|').map((cell) => cell.trim()).filter(Boolean);
    const rows = rowLines.map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean));

    return (
      <div className="space-y-3">
        {before && <p className="whitespace-pre-line">{renderTextWithLinks(before)}</p>}
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="min-w-full border-collapse text-left text-xs sm:text-sm">
            <thead className="bg-muted/70">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="border-b border-border/50 px-3 py-2 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${row.join('-')}-${rowIndex}`} className="odd:bg-background/40">
                  {headers.map((header, cellIndex) => (
                    <td key={`${header}-${cellIndex}`} className="border-b border-border/30 px-3 py-2 align-top">
                      {row[cellIndex] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <span className="whitespace-pre-line">{renderTextWithLinks(content)}</span>;
}

export function AIAssistant() {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([initialAssistantMessage]);
  const [activeChatId, setActiveChatId] = useState(() => createChatId());
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<FiaAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const historyStorageKey = user?.id ? `fia-chat-history-${user.id}` : null;

  // Load this user's saved chat sessions once we know who they are.
  useEffect(() => {
    if (!historyStorageKey) return;
    try {
      const raw = localStorage.getItem(historyStorageKey);
      if (raw) setChatHistory(JSON.parse(raw));
    } catch {
      // Ignore corrupt/legacy local storage content.
    }
  }, [historyStorageKey]);

  // Keep the active session's entry in history up to date as the conversation grows.
  useEffect(() => {
    const hasUserMessage = messages.some((message) => message.role === 'user');
    if (!hasUserMessage) return;

    setChatHistory((current) => {
      const entry: ChatSession = { id: activeChatId, title: getChatTitle(messages), messages, updatedAt: Date.now() };
      const existingIndex = current.findIndex((session) => session.id === activeChatId);
      const next = existingIndex >= 0 ? [...current] : [entry, ...current];
      if (existingIndex >= 0) next[existingIndex] = entry;
      return next.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_HISTORY_SESSIONS);
    });
  }, [messages, activeChatId]);

  // Persist history for this user whenever it changes.
  useEffect(() => {
    if (!historyStorageKey) return;
    localStorage.setItem(historyStorageKey, JSON.stringify(chatHistory));
  }, [chatHistory, historyStorageKey]);

  const { data: farmers = [] } = useFarmers();
  const { data: sales = [] } = useSales();
  const { data: machineryBookings = [] } = useMachineryBookings();
  const { data: products = [] } = useProducts();
  const { data: trainings = [] } = useTrainings();
  const { data: visits = [] } = useVisits();

  const intelligence = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const salesRows = sales as Record<string, unknown>[];
    const productRows = products as Record<string, unknown>[];
    const visitRows = visits as Record<string, unknown>[];
    const trainingRows = trainings as Record<string, unknown>[];
    const machineryRows = machineryBookings as Record<string, unknown>[];

    const monthlySales = salesRows.filter((sale) => {
      const date = asDate(getItemDate(sale));
      return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const previousMonthSales = salesRows.filter((sale) => {
      const date = asDate(getItemDate(sale));
      if (!date) return false;
      const monthDiff = currentMonth === 0 ? 11 : currentMonth - 1;
      const year = currentMonth === 0 ? currentYear - 1 : currentYear;
      return date.getMonth() === monthDiff && date.getFullYear() === year;
    });

    const totalRevenue = salesRows.reduce((sum, sale) => sum + getRevenue(sale), 0);
    const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + getRevenue(sale), 0);
    const previousRevenue = previousMonthSales.reduce((sum, sale) => sum + getRevenue(sale), 0);
    const revenueGrowth = previousRevenue ? ((monthlyRevenue - previousRevenue) / previousRevenue) * 100 : monthlyRevenue ? 12 : 0;

    const lowStock = productRows.filter((product) => {
      const stock = normalizeNumber(product.stock, product.quantity, product.current_stock, product.stock_quantity);
      const minStock = normalizeNumber(product.min_stock, product.minimum_stock, product.reorder_level);
      return stock > 0 && (stock <= (minStock || 10));
    });

    const productRevenue = new Map<string, number>();
    salesRows.forEach((sale) => {
      const name = getName(sale, 'General sales');
      productRevenue.set(name, (productRevenue.get(name) || 0) + getRevenue(sale));
    });

    const topProducts = Array.from(productRevenue.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const workforce = new Map<string, number>();
    [...salesRows, ...visitRows, ...trainingRows, ...machineryRows].forEach((item) => {
      const name = getPersonName(item);
      workforce.set(name, (workforce.get(name) || 0) + 1);
    });

    const workforceRankings = Array.from(workforce.entries())
      .map(([name, score]) => ({ name, score }))
      .filter((item) => item.name !== 'Unassigned')
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const productionScore = Math.min(100, 68 + Math.min(24, visitRows.length * 2) + Math.min(8, trainingRows.length));
    const financeScore = Math.min(100, 70 + Math.min(22, Math.round(totalRevenue / 50000)) + (revenueGrowth > 0 ? 6 : 0));
    const inventoryScore = Math.max(55, 94 - lowStock.length * 6);
    const workforceScore = Math.min(100, 72 + Math.min(24, workforceRankings.length * 5));
    const machineryScore = Math.min(100, 72 + Math.min(24, machineryRows.length * 3));
    const farmHealthScore = Math.round((productionScore + financeScore + inventoryScore + workforceScore + machineryScore) / 5);

    const harvestForecast = Math.max(15, Math.round((monthlySales.length || salesRows.length || 8) * 2.7));
    const forecastRevenue = monthlyRevenue || harvestForecast * 49000;
    const confidence = Math.min(94, 76 + Math.round((salesRows.length + visitRows.length + trainingRows.length) / 4));

    const briefing = [
      `${lowStock.length || 1} inventory ${lowStock.length === 1 ? 'item is' : 'items are'} near reorder level`,
      `${machineryRows.length} machinery bookings are available for operational planning`,
      `${visitRows.length} field visits can inform crop and farmer support priorities`,
      `${trainingRows.length} trainings are recorded for workforce and farmer capacity analysis`,
      `Revenue this month is ${revenueGrowth >= 0 ? 'up' : 'down'} by ${Math.abs(revenueGrowth).toFixed(0)}%`,
      'Rainfall risk should be checked before irrigation and fertilizer scheduling',
    ];

    const recommendations: Recommendation[] = [
      {
        title: lowStock.length ? 'Reorder critical stock' : 'Confirm minimum stock levels',
        reason: lowStock.length
          ? `${lowStock.length} products are at or below reorder threshold. Prioritize fertilizer, feed, and chemical availability.`
          : 'Product stock records exist, but reorder levels should be reviewed for automated procurement.',
        impact: 'Prevents production delays and emergency purchases',
        urgency: lowStock.length ? 'High' : 'Medium',
      },
      {
        title: 'Review machinery allocation',
        reason: `${machineryRows.length} machinery bookings can be sequenced by route and task type to reduce fuel usage.`,
        impact: 'Improves utilization and lowers operating cost',
        urgency: machineryRows.length > 5 ? 'Medium' : 'Low',
      },
      {
        title: 'Target top revenue channels',
        reason: topProducts[0]
          ? `${topProducts[0].name} is currently the strongest sales contributor.`
          : 'Sales records should be segmented by product and market for price intelligence.',
        impact: 'Improves margin and selling timing',
        urgency: 'Medium',
      },
      {
        title: 'Increase field intelligence coverage',
        reason: `${visitRows.length} visits and ${trainingRows.length} trainings are available. Use them to flag underperforming areas.`,
        impact: 'Improves yield forecasting and risk detection',
        urgency: visitRows.length < 10 ? 'High' : 'Medium',
      },
    ];

    const riskData = [
      {
        title: 'Inventory runout',
        level: lowStock.length ? 'High' : 'Medium',
        signal: lowStock.length ? `${lowStock.length} products below threshold` : 'Reorder thresholds need calibration',
        action: 'Create procurement request and confirm supplier lead time',
      },
      {
        title: 'Climate timing',
        level: 'Medium',
        signal: 'Rainfall forecast should be checked before irrigation decisions',
        action: 'Delay non-urgent irrigation if rain is expected within 48 hours',
      },
      {
        title: 'Revenue concentration',
        level: topProducts.length <= 2 ? 'Medium' : 'Low',
        signal: topProducts[0] ? `${topProducts[0].name} leads current revenue` : 'Limited sales mix data',
        action: 'Compare markets and diversify sales opportunities',
      },
    ];

    return {
      briefing,
      recommendations,
      riskData,
      farmHealthScore,
      lowStock,
      topProducts,
      workforceRankings,
      totalRevenue,
      monthlyRevenue,
      revenueGrowth,
      harvestForecast,
      forecastRevenue,
      confidence,
      summary: {
        farmers: farmers.length,
        sales: salesRows.length,
        products: productRows.length,
        machinery: machineryRows.length,
        visits: visitRows.length,
        trainings: trainingRows.length,
      },
    };
  }, [farmers.length, machineryBookings, products, sales, trainings, visits]);

  const respondToPrompt = (prompt: string) => {
    const normalized = prompt.toLowerCase();
    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(normalized);
    const asksSalesImprovement =
      (normalized.includes('improve') || normalized.includes('increase') || normalized.includes('grow') || normalized.includes('boost')) &&
      (normalized.includes('sales') || normalized.includes('revenue'));
    const asksHowMany = normalized.includes('how many') || normalized.includes('number of') || normalized.includes('count');
    const asksForSalesRecords =
      (normalized.includes('generate') || normalized.includes('list') || normalized.includes('show') || normalized.includes('display')) &&
      normalized.includes('sale') &&
      normalized.includes('record');
    const topProduct = intelligence.topProducts[0];
    const lowStockNames = intelligence.lowStock
      .slice(0, 5)
      .map((item) => getName(item as Record<string, unknown>, 'Unnamed product'));
    const workforceSummary = intelligence.workforceRankings
      .slice(0, 5)
      .map((item, index) => `${index + 1}. ${item.name} (${item.score} recorded activities)`)
      .join('\n');
    const recommendationSummary = intelligence.recommendations
      .slice(0, 4)
      .map((item, index) => `${index + 1}. ${item.title}: ${item.reason}`)
      .join('\n');
    const riskSummary = intelligence.riskData
      .map((risk) => `- ${risk.title} (${risk.level}): ${risk.signal}. Action: ${risk.action}`)
      .join('\n');
    const executiveSnapshot = [
      `Farm Health Score: ${intelligence.farmHealthScore}/100`,
      `Farmers: ${intelligence.summary.farmers}`,
      `Sales records: ${intelligence.summary.sales}`,
      `Products: ${intelligence.summary.products}`,
      `Monthly revenue: ${formatCurrency(intelligence.monthlyRevenue)}`,
      `Total recorded revenue: ${formatCurrency(intelligence.totalRevenue)}`,
      `Low-stock alerts: ${intelligence.lowStock.length}`,
      `Machinery jobs: ${intelligence.summary.machinery}`,
      `Visits: ${intelligence.summary.visits}`,
      `Trainings: ${intelligence.summary.trainings}`,
    ].join('\n');

    if (isGreeting) {
      return 'Hello there. What can I help you with today? You can ask me things like how to improve sales, which products are performing best, what stock needs attention, or what risks need action.';
    }

    if (normalized.includes('report')) {
      const leaders = intelligence.topProducts.length
        ? intelligence.topProducts.map((item, index) => `${index + 1}. ${item.name}: ${formatCurrency(item.revenue)}`).join('\n')
        : 'No product-level revenue leaders are available yet.';
      const recentMachinery = (machineryBookings as Record<string, unknown>[])
        .slice(0, 5)
        .map((booking, index) => `${index + 1}. ${getName(booking, 'Machinery booking')} — ${getItemDate(booking) || 'Date not recorded'} (${getPersonName(booking)})`)
        .join('\n');
      const recentVisits = (visits as Record<string, unknown>[])
        .slice(0, 5)
        .map((visit, index) => `${index + 1}. ${getName(visit, 'Field visit')} — ${getItemDate(visit) || 'Date not recorded'} (${getPersonName(visit)})`)
        .join('\n');
      const recentTrainings = (trainings as Record<string, unknown>[])
        .slice(0, 5)
        .map((training, index) => `${index + 1}. ${getName(training, 'Training')} — ${getItemDate(training) || 'Date not recorded'} (${getPersonName(training)})`)
        .join('\n');

      let topic = 'Farm Performance';
      let metrics = executiveSnapshot;
      let findings = intelligence.briefing.length
        ? intelligence.briefing.map((item) => `- ${item}`).join('\n')
        : 'No standout trends are visible in the current records.';
      let risks = riskSummary;
      let recommendations = recommendationSummary;

      if (normalized.includes('sale') || normalized.includes('revenue') || normalized.includes('financial') || normalized.includes('profit')) {
        topic = 'Sales & Revenue';
        metrics = [
          `Total recorded revenue: ${formatCurrency(intelligence.totalRevenue)}`,
          `Monthly revenue: ${formatCurrency(intelligence.monthlyRevenue)}`,
          `Revenue movement: ${intelligence.revenueGrowth >= 0 ? 'up' : 'down'} ${formatPercent(intelligence.revenueGrowth)} vs previous comparable month`,
          `Sales records: ${intelligence.summary.sales}`,
        ].join('\n');
        findings = `Revenue leaders:\n${leaders}`;
        risks = intelligence.lowStock.length ? `- Stock risk to top sellers: ${lowStockNames.join(', ')}.` : '';
        recommendations = [
          `1. Protect availability of ${topProduct ? topProduct.name : 'top-selling products'}; avoid stockouts.`,
          '2. Convert recent visits and trainings into follow-up orders.',
          '3. Compare products by margin, not just revenue, before reallocating stock.',
          '4. Investigate underperforming products for pricing, availability, or demand issues.',
        ].join('\n');
      } else if (normalized.includes('inventory') || normalized.includes('stock') || normalized.includes('fertilizer') || normalized.includes('product')) {
        topic = 'Inventory';
        metrics = [
          `Products tracked: ${intelligence.summary.products}`,
          `Low-stock alerts: ${intelligence.lowStock.length}`,
        ].join('\n');
        findings = lowStockNames.length
          ? `Products needing stock attention:\n${lowStockNames.map((name) => `- ${name}`).join('\n')}`
          : 'No critical low-stock products are visible in the current records.';
        risks = lowStockNames.length ? '- Stockouts on the listed products can delay sales and farmer support.' : '';
        recommendations = [
          '1. Confirm physical stock for any item at or below reorder level.',
          '2. Create procurement requests for items running low.',
          '3. Keep reorder levels and supplier lead times up to date so this report stays accurate.',
        ].join('\n');
      } else if (normalized.includes('workforce') || normalized.includes('worker') || normalized.includes('staff') || normalized.includes('productivity')) {
        topic = 'Workforce';
        metrics = `Ranked by recorded sales, visits, trainings, and machinery activity:\n${workforceSummary || 'Not enough assigned activity data to rank workers yet.'}`;
        findings = 'This ranking reflects recorded activity volume, not quality or outcomes.';
        risks = '';
        recommendations = [
          '1. Attach a responsible staff member to every sale, visit, machinery task, and training.',
          '2. Compare activity volume against revenue and farmer outcomes, not volume alone.',
          '3. Follow up with low-activity staff to confirm whether work is missing or simply unrecorded.',
        ].join('\n');
      } else if (normalized.includes('machinery')) {
        topic = 'Machinery';
        metrics = `Machinery jobs recorded: ${intelligence.summary.machinery}`;
        findings = recentMachinery ? `Recent bookings:\n${recentMachinery}` : 'No machinery bookings recorded yet.';
        risks = '';
        recommendations = [
          '1. Confirm machinery utilization against demand to avoid idle equipment.',
          '2. Record outcomes per booking (area covered, issues) for better planning.',
        ].join('\n');
      } else if (normalized.includes('visit')) {
        topic = 'Field Visits';
        metrics = `Visits recorded: ${intelligence.summary.visits}`;
        findings = recentVisits ? `Recent visits:\n${recentVisits}` : 'No field visits recorded yet.';
        risks = '';
        recommendations = [
          '1. Follow up on recent visits with the farmers involved to convert interest into sales.',
          '2. Ensure every visit records a responsible person and outcome.',
        ].join('\n');
      } else if (normalized.includes('training')) {
        topic = 'Training';
        metrics = `Trainings recorded: ${intelligence.summary.trainings}`;
        findings = recentTrainings ? `Recent trainings:\n${recentTrainings}` : 'No trainings recorded yet.';
        risks = '';
        recommendations = [
          '1. Track attendance and follow-up adoption after each training.',
          '2. Align upcoming trainings with low-performing regions or products.',
        ].join('\n');
      } else if (normalized.includes('risk')) {
        topic = 'Risk';
        findings = riskSummary || 'No significant risks are visible in the current records.';
        risks = '';
      } else if (normalized.includes('farmer')) {
        topic = 'Farmers';
        metrics = `Farmers recorded: ${intelligence.summary.farmers}`;
      }

      return [
        `## ${topic} Report`,
        `**Executive Summary**\nFarm Health Score: ${intelligence.farmHealthScore}/100. This report is scoped to ${topic.toLowerCase()} using currently recorded platform data.`,
        `**Key Metrics**\n${metrics}`,
        `**Findings**\n${findings}`,
        risks ? `**Risks**\n${risks}` : '',
        `**Recommended Actions**\n${recommendations}`,
      ]
        .filter(Boolean)
        .join('\n\n');
    }

    if ((asksHowMany || normalized.includes('total')) && normalized.includes('farmer')) {
      return `We currently have ${intelligence.summary.farmers} farmers recorded in the platform.`;
    }

    if ((asksHowMany || normalized.includes('total')) && normalized.includes('product')) {
      return `We currently have ${intelligence.summary.products} products recorded in the platform.`;
    }

    if ((asksHowMany || normalized.includes('total')) && normalized.includes('sale')) {
      return `We currently have ${intelligence.summary.sales} sales records, with total recorded revenue of ${formatCurrency(intelligence.totalRevenue)}.`;
    }

    if ((asksHowMany || normalized.includes('total')) && normalized.includes('visit')) {
      return `We currently have ${intelligence.summary.visits} visits recorded in the platform.`;
    }

    if ((asksHowMany || normalized.includes('total')) && normalized.includes('training')) {
      return `We currently have ${intelligence.summary.trainings} trainings recorded in the platform.`;
    }

    if ((asksHowMany || normalized.includes('total')) && normalized.includes('machinery')) {
      return `We currently have ${intelligence.summary.machinery} machinery jobs recorded in the platform.`;
    }

    if (asksForSalesRecords) {
      const salesRows = (sales as Record<string, unknown>[]).slice(0, 15);
      if (!salesRows.length) return 'No sales records are currently available.';

      const tableRows = salesRows.map((sale, index) => {
        const product = getName(sale, 'General sales').replace(/\|/g, '/');
        const revenue = formatCurrency(getRevenue(sale));
        const date = getItemDate(sale) || 'Not recorded';
        const person = getPersonName(sale).replace(/\|/g, '/');
        return `| ${index + 1} | ${product} | ${revenue} | ${date} | ${person} |`;
      });

      return [
        `Here are the latest ${salesRows.length} sales records I can see:`,
        '',
        '| # | Product | Revenue | Date | Responsible Person |',
        '|---|---|---:|---|---|',
        ...tableRows,
      ].join('\n');
    }

    if (asksSalesImprovement) {
      const leaders = intelligence.topProducts.length
        ? intelligence.topProducts.map((item, index) => `${index + 1}. ${item.name}: ${formatCurrency(item.revenue)}`).join('\n')
        : 'No product-level revenue leaders are available yet.';

      return `Direct answer: to improve sales, focus first on the products already showing demand, prevent stockouts, and use field visits/trainings to convert farmer interest into orders.\n\nWhat the data shows:\n- Total recorded revenue: ${formatCurrency(intelligence.totalRevenue)}\n- Monthly revenue: ${formatCurrency(intelligence.monthlyRevenue)}\n- Revenue movement: ${intelligence.revenueGrowth >= 0 ? 'up' : 'down'} ${formatPercent(intelligence.revenueGrowth)}\n- Low-stock alerts: ${intelligence.lowStock.length}\n- Field visits: ${intelligence.summary.visits}\n- Trainings: ${intelligence.summary.trainings}\n\nBest current sales opportunities:\n${leaders}\n\nSales improvement plan:\n1. Protect the best sellers: keep ${topProduct ? topProduct.name : 'top-selling products'} available and avoid stockouts.\n2. Follow up with farmers from recent visits and trainings, because those are warm leads.\n3. Bundle products with machinery or advisory services where it makes sense.\n4. Ask TOTs and Local MRs to record missed sales reasons: price, stock, distance, timing, or farmer cash flow.\n5. Review slow-moving products and decide whether to discount, bundle, retrain teams, or reduce procurement.\n\nImmediate next action: check whether any top revenue product also appears in low stock. If yes, reorder that first because lost availability is the fastest way to lose sales.`;
    }

    if (normalized.includes('inventory') || normalized.includes('stock') || normalized.includes('fertilizer')) {
      return lowStockNames.length
        ? `Direct answer: the products needing stock attention are ${lowStockNames.join(', ')}.\n\nKey evidence:\n${executiveSnapshot}\n\nInsight: stock risk is operationally important because product shortages can delay sales, farmer support, and planned field activity.\n\nRecommended actions:\n1. Confirm physical stock for the listed items.\n2. Create procurement requests for anything at or below reorder level.\n3. Add supplier lead times and reorder thresholds so MR Assistant can rank urgency more accurately.`
        : `Direct answer: no critical low-stock products are visible in the current records.\n\nKey evidence:\n${executiveSnapshot}\n\nInsight: this is only reliable if product stock and minimum stock fields are being maintained.\n\nRecommended actions:\n1. Review product reorder levels.\n2. Update stock after every sale or receipt.\n3. Add supplier lead times for procurement planning.`;
    }

    if (normalized.includes('revenue') || normalized.includes('sales') || normalized.includes('profit') || normalized.includes('financial')) {
      const leaders = intelligence.topProducts.length
        ? intelligence.topProducts.map((item, index) => `${index + 1}. ${item.name}: ${formatCurrency(item.revenue)}`).join('\n')
        : 'No product-level revenue leaders are available yet.';
      return `Direct answer: total recorded revenue is ${formatCurrency(intelligence.totalRevenue)} and this month is ${formatCurrency(intelligence.monthlyRevenue)}. Revenue is ${intelligence.revenueGrowth >= 0 ? 'up' : 'down'} by ${formatPercent(intelligence.revenueGrowth)} versus the previous comparable month.\n\nRevenue leaders:\n${leaders}\n\nInsight: ${
        topProduct
          ? `${topProduct.name} is the strongest visible contributor, so pricing, availability, and market demand for that product should be protected.`
          : 'sales need clearer product tagging before MR Assistant can identify strong and weak revenue channels.'
      }\n\nRecommended actions:\n1. Compare top products by margin, not just revenue.\n2. Check whether low stock threatens the strongest sellers.\n3. Review underperforming products for pricing, availability, or field demand issues.`;
    }

    if (normalized.includes('worker') || normalized.includes('productivity') || normalized.includes('staff')) {
      return workforceSummary
        ? `Direct answer: the current productivity ranking from recorded sales, visits, trainings, and machinery activity is:\n${workforceSummary}\n\nInsight: this ranking reflects recorded activity volume, not quality or outcomes. It becomes stronger when each sale, visit, training, and machinery booking has a responsible person attached.\n\nRecommended actions:\n1. Compare activity volume with revenue and farmer outcomes.\n2. Follow up with low-activity staff to confirm whether work is missing or simply unrecorded.\n3. Use visits and trainings to balance workload across territories.`
        : `Direct answer: there is not enough assigned activity data to rank workers reliably.\n\nKey evidence:\n${executiveSnapshot}\n\nRecommended actions:\n1. Attach responsible staff to sales, visits, machinery tasks, and trainings.\n2. Record outcomes, not just activity counts.\n3. Re-run the ranking after the data is complete.`;
    }

    if (normalized.includes('risk')) {
      return `Direct answer: the biggest current risks are:\n${riskSummary}\n\nInsight: the highest-priority risk is ${intelligence.riskData[0]?.title.toLowerCase()} because it can affect service delivery, sales continuity, and farmer support.\n\nRecommended actions:\n${recommendationSummary}`;
    }

    if (normalized.includes('briefing') || normalized.includes('today')) {
      return `Today's executive briefing:\n${executiveSnapshot}\n\nOperational insights:\n${intelligence.briefing.map((item) => `- ${item}`).join('\n')}\n\nRisks:\n${riskSummary}\n\nRecommended actions:\n${recommendationSummary}`;
    }

    return `Direct answer: based on the current records, the farm is operating at a Farm Health Score of ${intelligence.farmHealthScore}/100.\n\nCurrent summary:\n${executiveSnapshot}\n\nMain insights:\n${intelligence.briefing.map((item) => `- ${item}`).join('\n')}\n\nRecommended actions:\n${recommendationSummary}\n\nFor a sharper answer, ask about one area such as revenue, stock, risks, workers, machinery, visits, or trainings.`;
  };

  const buildAssistantContext = () => ({
    answerStyle: {
      instruction: 'Stick to the exact question. For simple counts or factual questions, answer in one or two sentences only. For greetings, respond briefly and ask what the manager needs help with. For business questions that ask for analysis, provide summary, evidence, insights, and practical actions.',
      currency: 'KES',
      limitations: 'Use only this supplied platform context. State clearly when records are missing or insufficient.',
    },
    farmHealthScore: intelligence.farmHealthScore,
    summary: intelligence.summary,
    briefing: intelligence.briefing,
    recommendations: intelligence.recommendations,
    risks: intelligence.riskData,
    products: (products as Record<string, unknown>[]).slice(0, 25).map((product) => ({
      name: getName(product, 'Unnamed product'),
      stock: normalizeNumber(product.stock, product.quantity, product.current_stock, product.stock_quantity),
      reorderLevel: normalizeNumber(product.min_stock, product.minimum_stock, product.reorder_level),
      price: normalizeNumber(product.price, product.unit_price, product.selling_price),
    })),
    lowStock: intelligence.lowStock.slice(0, 10).map((item) => ({
      name: getName(item as Record<string, unknown>, 'Unnamed product'),
      stock: normalizeNumber(
        (item as Record<string, unknown>).stock,
        (item as Record<string, unknown>).quantity,
        (item as Record<string, unknown>).current_stock,
        (item as Record<string, unknown>).stock_quantity
      ),
      reorderLevel: normalizeNumber(
        (item as Record<string, unknown>).min_stock,
        (item as Record<string, unknown>).minimum_stock,
        (item as Record<string, unknown>).reorder_level
      ),
    })),
    topProducts: intelligence.topProducts,
    workforceRankings: intelligence.workforceRankings,
    revenue: {
      total: intelligence.totalRevenue,
      monthly: intelligence.monthlyRevenue,
      growthPercent: intelligence.revenueGrowth,
      forecast: intelligence.forecastRevenue,
    },
    forecast: {
      harvestTonnes: intelligence.harvestForecast,
      confidencePercent: intelligence.confidence,
    },
    recentRecords: {
      sales: (sales as Record<string, unknown>[]).slice(0, 15).map((sale) => ({
        product: getName(sale, 'General sales'),
        revenue: getRevenue(sale),
        date: getItemDate(sale),
        responsiblePerson: getPersonName(sale),
      })),
      visits: (visits as Record<string, unknown>[]).slice(0, 10).map((visit) => ({
        title: getName(visit, 'Field visit'),
        date: getItemDate(visit),
        responsiblePerson: getPersonName(visit),
      })),
      trainings: (trainings as Record<string, unknown>[]).slice(0, 10).map((training) => ({
        title: getName(training, 'Training'),
        date: getItemDate(training),
        responsiblePerson: getPersonName(training),
      })),
      machineryBookings: (machineryBookings as Record<string, unknown>[]).slice(0, 10).map((booking) => ({
        title: getName(booking, 'Machinery booking'),
        date: getItemDate(booking),
        responsiblePerson: getPersonName(booking),
      })),
    },
  });

  const handleAsk = async (prompt = input) => {
    const cleanPrompt = prompt.trim();
    const attachments = pendingAttachments;
    if (!cleanPrompt && attachments.length === 0) return;

    const userMessages: AssistantMessage[] = [
      ...messages,
      {
        role: 'user',
        content: cleanPrompt || 'Please analyze the attached file(s).',
        attachments: attachments.length > 0 ? attachments.map(({ name, mimeType }) => ({ name, mimeType })) : undefined,
      },
    ];
    setMessages(userMessages);
    setInput('');
    setPendingAttachments([]);
    setIsThinking(true);

    try {
      const response = await askFiaAssistant(cleanPrompt || 'Please analyze the attached file(s).', buildAssistantContext(), attachments);
      setMessages([...userMessages, { role: 'assistant', content: response.content }]);
    } catch (error) {
      // Log the real error for debugging, but never surface API-provider details
      // (quota, billing, rate limits) to the user — show a clean, generic message.
      console.error('MR Assistant request failed:', error);

      if (error instanceof BackendError && error.status === 401) {
        toast.error('Your session has expired. Please refresh the page and log in again.');
        setMessages([
          ...userMessages,
          {
            role: 'assistant',
            content: 'Your session has expired. Please refresh the page and log in again, then ask me your question.',
          },
        ]);
      } else if (attachments.length > 0) {
        toast.error('Could not analyze the attached file(s) right now. Please try again shortly.');
        setMessages([
          ...userMessages,
          {
            role: 'assistant',
            content: "I couldn't analyze the attached file(s) right now — the live AI connection is temporarily unavailable. File analysis needs that connection, since offline analysis only covers platform data, not file contents. Please try again in a moment.",
          },
        ]);
      } else {
        const fallback = respondToPrompt(cleanPrompt);
        toast.error('Live AI is temporarily unavailable — showing offline analysis instead.');
        setMessages([...userMessages, { role: 'assistant', content: fallback }]);
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isThinking) void handleAsk();
    }
  };

  const handleNewChat = () => {
    setActiveChatId(createChatId());
    setMessages([initialAssistantMessage]);
    setInput('');
    setPendingAttachments([]);
    setHistoryOpen(false);
  };

  const handleSelectChat = (session: ChatSession) => {
    setActiveChatId(session.id);
    setMessages(session.messages);
    setHistoryOpen(false);
  };

  const handleDeleteChat = (event: React.MouseEvent, sessionId: string) => {
    event.stopPropagation();
    setChatHistory((current) => current.filter((session) => session.id !== sessionId));
    if (sessionId === activeChatId) handleNewChat();
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    if (pendingAttachments.length + files.length > MAX_ATTACHMENTS) {
      toast.error(`You can attach up to ${MAX_ATTACHMENTS} files at a time.`);
      return;
    }

    const oversized = files.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (oversized) {
      toast.error(`"${oversized.name}" is too large. Files must be under ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB.`);
      return;
    }

    try {
      const converted = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: await fileToBase64(file),
        }))
      );
      setPendingAttachments((current) => [...current, ...converted]);
    } catch {
      toast.error('Could not read one of the selected files.');
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments((current) => current.filter((_, i) => i !== index));
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const hasConversationStarted = messages.some((message) => message.role === 'user');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasConversationStarted) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isThinking, hasConversationStarted]);

  const attachmentChipsRow = pendingAttachments.length > 0 && (
    <div className="flex flex-wrap gap-2">
      {pendingAttachments.map((attachment, index) => (
        <span
          key={`${attachment.name}-${index}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2.5 py-1.5 text-xs"
        >
          <Paperclip className="h-3.5 w-3.5" />
          <span className="max-w-[140px] truncate">{attachment.name}</span>
          <button type="button" onClick={() => handleRemoveAttachment(index)} className="text-muted-foreground hover:text-destructive">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  );

  const inputRow = (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        accept="image/*,application/pdf,.csv,.txt,.xlsx,.xls,.doc,.docx"
        onChange={handleFilesSelected}
      />
      <div className="flex flex-1 items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          title="Attach a file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Message MR Assistant... (Enter to send, Shift+Enter for a new line)"
          className="min-h-[76px] resize-none"
        />
      </div>
      <Button
        type="button"
        className="sm:self-end"
        onClick={() => handleAsk()}
        disabled={(!input.trim() && pendingAttachments.length === 0) || isThinking}
      >
        <Send className="h-4 w-4" />
        Ask
      </Button>
    </div>
  );

  const quickPrompts = (
    <div className="flex flex-wrap justify-center gap-2">
      {suggestedPrompts.map((prompt) => (
        <Button key={prompt} type="button" variant="outline" size="sm" onClick={() => handleQuickPrompt(prompt)}>
          {prompt}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">MR Assistant</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Ask MR Assistant about production, inventory, sales, machinery, workforce, reports, and risks.
        </p>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BrainCircuit className="h-5 w-5 text-primary" />
                MR Assistant
              </CardTitle>
              <CardDescription>Ask operational, financial, inventory, workforce, sales, or report questions.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setHistoryOpen((open) => !open)}>
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleNewChat}>
                <Plus className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            {historyOpen && (
              <div className="w-full flex-shrink-0 rounded-xl border border-border/40 bg-muted/20 p-2 sm:w-64">
                <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Chat history</p>
                <div className="max-h-[420px] space-y-1 overflow-y-auto">
                  {chatHistory.length === 0 && (
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">No saved chats yet.</p>
                  )}
                  {chatHistory.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectChat(session)}
                      className={cn(
                        'group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/60',
                        session.id === activeChatId && 'bg-muted/60 font-medium'
                      )}
                    >
                      <span className="truncate">{session.title}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => handleDeleteChat(event, session.id)}
                        className="flex-shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="min-w-0 flex-1">
              {hasConversationStarted ? (
                <div className="space-y-4">
                  <div className="h-[480px] space-y-3 overflow-y-auto rounded-xl border border-border/40 bg-muted/20 p-3 scrollbar-thin">
                    {messages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={cn(
                          'max-w-[88%] whitespace-pre-line rounded-xl px-3 py-2 text-sm',
                          message.role === 'assistant'
                            ? 'bg-card text-card-foreground shadow-soft'
                            : 'ml-auto bg-primary text-primary-foreground'
                        )}
                      >
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {message.attachments.map((attachment) => (
                              <span
                                key={attachment.name}
                                className="inline-flex items-center gap-1 rounded-md bg-black/10 px-2 py-1 text-xs"
                              >
                                <Paperclip className="h-3 w-3" />
                                {attachment.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <MessageContent content={message.content} />
                      </div>
                    ))}
                    {isThinking && (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm shadow-soft">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        MR Assistant is analyzing farm records
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  {attachmentChipsRow}
                  {inputRow}
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 px-4 py-8 text-center">
                  <div className="space-y-2">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <BrainCircuit className="h-7 w-7" />
                    </div>
                    <h2 className="font-heading text-2xl font-semibold">MR Assistant</h2>
                    <p className="mx-auto max-w-md text-sm text-muted-foreground">{initialAssistantMessage.content}</p>
                  </div>
                  <div className="w-full max-w-2xl space-y-3">
                    {attachmentChipsRow}
                    {inputRow}
                    {quickPrompts}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
