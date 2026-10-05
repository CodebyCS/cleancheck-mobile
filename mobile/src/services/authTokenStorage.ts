export interface AuthTokenStorage {
  save(token: string): Promise<void>;
  read(): Promise<string | null>;
  remove(): Promise<void>;
}

// Preparado para um adaptador seguro de Expo. A implementação aguarda a definição
// do token, validade, renovação, sessão e logout com o Carlos. O mock não persiste tokens.
export const authTokenStoragePending = true;
