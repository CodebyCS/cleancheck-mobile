// O Expo substitui esta leitura pelo endereço definido em .env.local.
export const healthUrl = process.env.EXPO_PUBLIC_API_HEALTH_URL?.trim() ?? '';

export async function checkApiHealth(signal: AbortSignal): Promise<number> {
  if (!healthUrl || !/^https?:\/\//i.test(healthUrl) || healthUrl.includes('IP-DO-COMPUTADOR')) {
    throw new Error('Configura EXPO_PUBLIC_API_HEALTH_URL em .env.local e recarrega a aplicação.');
  }
  // /up devolve HTML; o diagnóstico verifica o estado HTTP, não JSON.
  const response = await fetch(healthUrl, { signal, headers: { 'Cache-Control': 'no-cache' } });
  if (!response.ok) throw new Error(`O servidor respondeu com erro HTTP ${response.status}.`);
  return response.status;
}
