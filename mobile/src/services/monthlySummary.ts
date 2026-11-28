import { AuthError } from './auth';
import { apiUrl, fetchWithTimeout, HttpClientError } from './httpClient';
import { AuthenticatedFetch } from './tasks';

export type SummaryAdjustment = {
  // Signed difference: negative reduces, positive increases.
  amount: string;
  reason: string;
  created_at: string | null;
};

export type SummaryEntry = {
  id: number;
  task_id: number;
  property_name: string | null;
  task_type: string;
  service_date: string;
  // Original amount; final_amount includes the adjustments.
  amount: string;
  adjustments_total: string;
  final_amount: string;
  currency: string;
  adjustments: SummaryAdjustment[];
};

export type SummaryTotal = {
  currency: string;
  entries: number;
  original_total: string;
  adjustments_total: string;
  total: string;
};

export type MonthlySummary = {
  month: string;
  totals: SummaryTotal[];
  entries: SummaryEntry[];
};

export type MonthlySummaryErrorCode =
  | 'CONFIGURATION'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_AVAILABLE'
  | 'SERVER'
  | 'INVALID_RESPONSE';

export class MonthlySummaryError extends Error {
  constructor(public readonly code: MonthlySummaryErrorCode, message: string) {
    super(message);
    this.name = 'MonthlySummaryError';
  }
}

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function isAdjustment(value: unknown): value is SummaryAdjustment {
  if (!value || typeof value !== 'object') return false;
  const adjustment = value as Record<string, unknown>;
  return isText(adjustment.amount)
    && isText(adjustment.reason)
    && (adjustment.created_at === null || isText(adjustment.created_at));
}

function isEntry(value: unknown): value is SummaryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === 'number'
    && typeof entry.task_id === 'number'
    && (entry.property_name === null || isText(entry.property_name))
    && isText(entry.task_type)
    && isText(entry.service_date)
    && isText(entry.amount)
    && isText(entry.adjustments_total)
    && isText(entry.final_amount)
    && isText(entry.currency)
    && Array.isArray(entry.adjustments)
    && entry.adjustments.every(isAdjustment);
}

function isTotal(value: unknown): value is SummaryTotal {
  if (!value || typeof value !== 'object') return false;
  const total = value as Record<string, unknown>;
  return isText(total.currency)
    && typeof total.entries === 'number'
    && isText(total.original_total)
    && isText(total.adjustments_total)
    && isText(total.total);
}

/**
 * Monthly summary of the logged-in provider. The API identifies the provider from the
 * session token and accepts no provider id, so it can only return the user's own services.
 */
export async function getMonthlySummary(authenticatedFetch: AuthenticatedFetch, month: string): Promise<MonthlySummary> {
  let url: string;
  try {
    url = apiUrl(`/my/service-entries/summary?month=${encodeURIComponent(month)}`);
  } catch {
    throw new MonthlySummaryError('CONFIGURATION', 'O endereço da API não está configurado.');
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {}, authenticatedFetch);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'SESSION_EXPIRED') {
      throw new MonthlySummaryError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
    }
    if (error instanceof HttpClientError && error.code === 'TIMEOUT') {
      throw new MonthlySummaryError('TIMEOUT', 'A API demorou demasiado a responder. Tenta novamente.');
    }
    throw new MonthlySummaryError('NETWORK', 'Não foi possível contactar a API. Verifica a ligação e tenta novamente.');
  }

  if (response.status === 403) {
    throw new MonthlySummaryError('FORBIDDEN', 'Só os prestadores têm resumo mensal.');
  }
  // 404: the API does not have the monthly summary yet.
  if (response.status === 404) {
    throw new MonthlySummaryError('NOT_AVAILABLE', 'O resumo mensal ainda não está disponível nesta versão da API.');
  }
  if (!response.ok) {
    throw new MonthlySummaryError('SERVER', 'Não foi possível carregar o resumo do mês. Tenta novamente.');
  }

  const payload: unknown = await response.json().catch(() => null);
  const data = payload && typeof payload === 'object' ? (payload as { data?: unknown }).data : null;
  const summary = data && typeof data === 'object' ? data as Record<string, unknown> : null;

  if (
    !summary
    || !isText(summary.month)
    || !Array.isArray(summary.totals)
    || !summary.totals.every(isTotal)
    || !Array.isArray(summary.entries)
    || !summary.entries.every(isEntry)
  ) {
    throw new MonthlySummaryError('INVALID_RESPONSE', 'O resumo devolvido pela API é inválido.');
  }

  return { month: summary.month, totals: summary.totals, entries: summary.entries };
}

// Months are handled as YYYY-MM, the format the API expects.
export function currentMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return currentMonth(date);
}

const monthNames = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const name = monthNames[monthNumber - 1];
  return name ? `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${year}` : month;
}

export function formatAmount(amount: string, currency: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) return `${amount} ${currency}`;
  const text = Math.abs(value).toFixed(2).replace('.', ',');
  const symbol = currency === 'EUR' ? '€' : currency;
  return `${value < 0 ? '-' : ''}${text} ${symbol}`;
}

// Adjustments always show their sign, so a reduction is never read as an extra payment.
export function formatSigned(amount: string, currency: string): string {
  const value = Number(amount);
  return value > 0 ? `+${formatAmount(amount, currency)}` : formatAmount(amount, currency);
}
