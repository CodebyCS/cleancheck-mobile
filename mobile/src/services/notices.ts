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

export type NoticeErrorCode = 'CONFIGURATION' | 'NETWORK' | 'SESSION_EXPIRED' | 'FORBIDDEN' | 'SERVER' | 'INVALID_RESPONSE';

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

export async function listBookingNotices(authenticatedFetch: AuthenticatedFetch): Promise<BookingNotice[]> {
  let url: string;
  try {
    url = apiUrl('/booking-notices');
  } catch {
    throw new NoticeError('CONFIGURATION', 'O endereço da API não está configurado.');
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {}, authenticatedFetch);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'SESSION_EXPIRED') {
      throw new NoticeError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
    }
    if (error instanceof HttpClientError && error.code === 'CONFIGURATION') {
      throw new NoticeError('CONFIGURATION', 'O endereço da API não está configurado.');
    }
    throw new NoticeError('NETWORK', 'Não foi possível carregar os avisos. Verifica a ligação e tenta novamente.');
  }

  if (response.status === 403) throw new NoticeError('FORBIDDEN', 'Não tens permissão para consultar estes avisos.');
  if (!response.ok) throw new NoticeError('SERVER', 'Não foi possível carregar os avisos. Tenta novamente.');

  let payload: unknown;
  try {
    payload = await response.json() as unknown;
  } catch {
    throw new NoticeError('INVALID_RESPONSE', 'A API devolveu uma resposta de avisos inválida.');
  }

  const data = payload && typeof payload === 'object' ? (payload as { data?: unknown }).data : null;
  if (!Array.isArray(data) || !data.every(isNotice)) {
    throw new NoticeError('INVALID_RESPONSE', 'A lista de avisos devolvida pela API é inválida.');
  }
  return data;
}
