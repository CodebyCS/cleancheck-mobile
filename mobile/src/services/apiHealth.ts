// O Expo substitui esta leitura pelo endereço definido em .env.local.
export const healthUrl =
  process.env.EXPO_PUBLIC_API_HEALTH_URL?.trim() ?? '';

export async function checkApiHealth(
  signal: AbortSignal,
): Promise<number> {
  if (
    !healthUrl ||
    !/^https?:\/\//i.test(healthUrl) ||
    healthUrl.includes('IP-DO-COMPUTADOR')
  ) {
    throw new Error(
      'Configura EXPO_PUBLIC_API_HEALTH_URL em .env.local.',
    );
  }

  const response = await fetch(healthUrl, {
    signal,
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(
      `O servidor respondeu com erro HTTP ${response.status}.`,
    );
  }

  const payload: unknown = await response.json();

  if (
    !payload ||
    typeof payload !== 'object' ||
    Reflect.get(payload, 'application') !== 'CleanCheck' ||
    Reflect.get(payload, 'status') !== 'ok'
  ) {
    throw new Error(
      'O servidor respondeu, mas não devolveu o diagnóstico esperado do CleanCheck.',
    );
  }

  return response.status;
}
