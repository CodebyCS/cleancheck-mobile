import { apiUrl, AuthError } from './auth';

// Trial only: tests the camera and the upload to the API. Not linked to any task.

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// Videos can take long on mobile networks, so this upload has its own timeout.
const UPLOAD_TIMEOUT_MS = 120_000;

export type TrialFile = {
  uri: string;
  name: string;
  mimeType: string;
  kind: 'photo' | 'video';
  sizeBytes: number | null;
};

export type EvidenceTrialResult = {
  kind: 'photo' | 'video';
  mime_type: string;
  size_bytes: number;
  original_name: string;
  device: string | null;
  received_at: string;
};

export type EvidenceTrialErrorCode =
  | 'VALIDATION'
  | 'TOO_LARGE'
  | 'FORBIDDEN'
  | 'TOO_MANY_REQUESTS'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'SERVER'
  | 'INVALID_RESPONSE';

export class EvidenceTrialError extends Error {
  constructor(public readonly code: EvidenceTrialErrorCode, message: string, public readonly status?: number) {
    super(message);
    this.name = 'EvidenceTrialError';
  }
}

type AuthenticatedFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isResult(value: unknown): value is EvidenceTrialResult {
  if (!value || typeof value !== 'object') return false;
  const kind = Reflect.get(value, 'kind');
  const device = Reflect.get(value, 'device');

  return (kind === 'photo' || kind === 'video')
    && typeof Reflect.get(value, 'mime_type') === 'string'
    && typeof Reflect.get(value, 'size_bytes') === 'number'
    && typeof Reflect.get(value, 'original_name') === 'string'
    && (device === null || typeof device === 'string')
    && typeof Reflect.get(value, 'received_at') === 'string';
}

// Reads the first validation message returned by Laravel, if any.
async function firstValidationMessage(response: Response): Promise<string | null> {
  const payload: unknown = await response.json().catch(() => null);
  const errors = payload && typeof payload === 'object' ? Reflect.get(payload, 'errors') : null;
  if (!errors || typeof errors !== 'object') return null;

  for (const messages of Object.values(errors)) {
    if (Array.isArray(messages) && typeof messages[0] === 'string') return messages[0];
  }
  return null;
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Desconhecido';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function exceedsLimit(file: TrialFile): boolean {
  if (file.sizeBytes === null) return false;
  return file.sizeBytes > (file.kind === 'photo' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES);
}

/**
 * Sends one file to POST /api/evidence-trials and returns the API answer and the
 * time the upload took, so both can be written down in the trial results.
 */
export async function uploadEvidenceTrial(
  file: TrialFile,
  device: string | null,
  authenticatedFetch: AuthenticatedFetch,
): Promise<{ result: EvidenceTrialResult; durationMs: number }> {
  const form = new FormData();
  // React Native accepts { uri, name, type } as a file part.
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  if (device) form.append('device', device);

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, UPLOAD_TIMEOUT_MS);
  const startedAt = Date.now();
  let response: Response;

  try {
    // Content-Type is left out so fetch adds the multipart boundary.
    response = await authenticatedFetch(apiUrl('/evidence-trials'), { method: 'POST', body: form, signal: controller.signal });
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if (timedOut) {
      throw new EvidenceTrialError('TIMEOUT', 'O envio demorou mais de 2 minutos e foi cancelado. Experimenta com Wi-Fi ou um ficheiro mais pequeno.');
    }
    throw new EvidenceTrialError('NETWORK', 'Não foi possível contactar a API. Verifica a ligação e tenta novamente.');
  } finally {
    clearTimeout(timer);
  }

  const durationMs = Date.now() - startedAt;

  if (response.status === 422) {
    const message = await firstValidationMessage(response);
    throw new EvidenceTrialError('VALIDATION', message ?? 'O ficheiro não foi aceite pela API.', 422);
  }
  if (response.status === 413) {
    throw new EvidenceTrialError('TOO_LARGE', 'O servidor recusou o ficheiro por ser demasiado grande (limite do PHP ou do servidor web).', 413);
  }
  if (response.status === 403) {
    throw new EvidenceTrialError('FORBIDDEN', 'Só contas de prestador podem fazer o ensaio de envio.', 403);
  }
  if (response.status === 429) {
    throw new EvidenceTrialError('TOO_MANY_REQUESTS', 'Demasiados envios seguidos. Espera um minuto e tenta outra vez.', 429);
  }
  if (!response.ok) {
    throw new EvidenceTrialError('SERVER', `A API respondeu com erro ${response.status}.`, response.status);
  }

  const payload: unknown = await response.json().catch(() => null);
  const data: unknown = payload && typeof payload === 'object' ? Reflect.get(payload, 'data') : null;

  if (!isResult(data)) {
    throw new EvidenceTrialError('INVALID_RESPONSE', 'A API devolveu uma resposta com formato inesperado.');
  }

  return { result: data, durationMs };
}
