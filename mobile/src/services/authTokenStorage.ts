export interface AuthTokenStorage {
  save(token: string): Promise<void>;
  read(): Promise<string | null>;
  remove(): Promise<void>;
}

// Contrato preparado para um adaptador seguro de Expo. Não usar AsyncStorage ou
// armazenamento público para tokens. A implementação persistente e o logout ficam pendentes.
export const authTokenStoragePending = true;
