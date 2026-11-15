import { AuthError } from './auth';
import { apiUrl, fetchWithTimeout, HttpClientError } from './httpClient';
import { AuthenticatedFetch } from './tasks';

export type BookingNotice = {
  id: number;
  type: 'booking_updated' | 'booking_cancelled';
  read: boolean;
  readAt: string | null;
  notifiedAt: string;
  booking: { id: number; status: string; checkIn: string; checkOut: string };
  property: { id: number; name: string };
  task: { id: number; available: boolean } | null;
};

export type BookingNoticePage = {
  notices: BookingNotice[];
  currentPage: number;
  lastPage: number;
  unreadCount: number;
};

export type NoticeErrorCode =
  | 'CONFIGURATION'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER'
  | 'INVALID_RESPONSE';

export class NoticeError extends Error {
  constructor(public readonly code: NoticeErrorCode, message: string) {
    super(message);
    this.name = 'NoticeError';
  }
}

function isNotice(value: unknown): value is BookingNotice {
  if (!value || typeof value !== 'object') return false;
  const notice = value as Record<string, unknown>;
  if (!Number.isInteger(notice.id) || typeof notice.id !== 'number'
    || (notice.type !== 'booking_updated' && notice.type !== 'booking_cancelled')
    || typeof notice.read !== 'boolean'
    || !(notice.readAt === null || typeof notice.readAt === 'string')
    || typeof notice.notifiedAt !== 'string') return false;

  const booking = notice.booking as Record<string, unknown> | null;
  const property = notice.property as Record<string, unknown> | null;
  const task = notice.task as Record<string, unknown> | null;
  return Boolean(booking && Number.isInteger(booking.id) && typeof booking.id === 'number'
    && typeof booking.status === 'string' && typeof booking.checkIn === 'string' && typeof booking.checkOut === 'string'
    && property && Number.isInteger(property.id) && typeof property.id === 'number' && typeof property.name === 'string'
    && (task === null || (Number.isInteger(task.id) && typeof task.id === 'number' && typeof task.available === 'boolean')));
}

// Shared by the list and the "mark as read" requests.
async function requestJson(path: string, authenticatedFetch: AuthenticatedFetch, init: RequestInit = {}): Promise<unknown> {
  let url: string;
  try {
    url = apiUrl(path);
  } catch {
    throw new NoticeError('CONFIGURATION', 'O endereço da API não está configurado.');
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(url, init, authenticatedFetch);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'SESSION_EXPIRED') {
      throw new NoticeError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
    }
    if (error instanceof HttpClientError && error.code === 'CONFIGURATION') {
      throw new NoticeError('CONFIGURATION', 'O endereço da API não está configurado.');
    }
    if (error instanceof HttpClientError && error.code === 'TIMEOUT') {
      throw new NoticeError('TIMEOUT', 'A API demorou demasiado a responder. Tenta novamente.');
    }
    throw new NoticeError('NETWORK', 'Não foi possível contactar a API. Verifica a ligação e tenta novamente.');
  }

  if (response.status === 403) throw new NoticeError('FORBIDDEN', 'Não tens permissão para consultar estes avisos.');
  if (response.status === 404) throw new NoticeError('NOT_FOUND', 'Este aviso já não está disponível.');
  if (!response.ok) throw new NoticeError('SERVER', 'Não foi possível carregar os avisos. Tenta novamente.');

  try {
    return await response.json() as unknown;
  } catch {
    throw new NoticeError('INVALID_RESPONSE', 'A API devolveu uma resposta de avisos inválida.');
  }
}

export async function listBookingNotices(authenticatedFetch: AuthenticatedFetch, page = 1): Promise<BookingNoticePage> {
  const payload = await requestJson(`/booking-notices?page=${page}`, authenticatedFetch);
  const body = payload && typeof payload === 'object' ? payload as { data?: unknown; meta?: unknown } : null;
  const meta = body?.meta && typeof body.meta === 'object' ? body.meta as Record<string, unknown> : null;

  if (
    !body
    || !Array.isArray(body.data)
    || !body.data.every(isNotice)
    || !meta
    || typeof meta.current_page !== 'number'
    || typeof meta.last_page !== 'number'
    || typeof meta.unreadCount !== 'number'
  ) {
    throw new NoticeError('INVALID_RESPONSE', 'A lista de avisos devolvida pela API é inválida.');
  }

  return {
    notices: body.data,
    currentPage: meta.current_page,
    lastPage: meta.last_page,
    unreadCount: meta.unreadCount,
  };
}

// Repeating it is safe: the API keeps the first read time.
export async function markNoticeAsRead(id: number, authenticatedFetch: AuthenticatedFetch): Promise<BookingNotice> {
  const payload = await requestJson(`/booking-notices/${id}/read`, authenticatedFetch, { method: 'PATCH' });
  const data = payload && typeof payload === 'object' ? (payload as { data?: unknown }).data : null;

  if (!isNotice(data) || data.id !== id) {
    throw new NoticeError('INVALID_RESPONSE', 'O aviso devolvido pela API é inválido.');
  }
  return data;
}

// API days are YYYY-MM-DD; shown as DD/MM/YYYY.
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-');
  return year && month && date ? `${date}/${month}/${year}` : day;
}