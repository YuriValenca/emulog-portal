import { createRemoteJWKSet, jwtVerify } from 'jose';

const CHAVES_DO_FIREBASE = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

/** Devolve o uid do token de login do Firebase, ou null se ele for inválido ou estiver vencido. */
export async function verificarTokenDoFirebase(cabecalhoAuthorization: string | null): Promise<string | null> {
  const token = cabecalhoAuthorization?.startsWith('Bearer ') ? cabecalhoAuthorization.slice('Bearer '.length) : null;
  const projeto = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!token || !projeto) return null;

  try {
    const { payload } = await jwtVerify(token, CHAVES_DO_FIREBASE, {
      issuer: `https://securetoken.google.com/${projeto}`,
      audience: projeto,
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
