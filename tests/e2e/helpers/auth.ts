import crypto from 'crypto';
import type { Page } from '@playwright/test';

// El login real pasa por un reCAPTCHA v2 verificado server-side contra Google — no se puede
// automatizar en un navegador headless. En vez de pelear con eso, minamos el mismo JWT que
// AuthController.GenerarToken produciría (misma clave/issuer/audience que usa el backend, ver
// SGDS.Api/appsettings.json + `dotnet user-secrets`) y lo inyectamos directo en localStorage,
// exactamente como hace AuthContext después de un login exitoso. El resto de la app nunca sabe
// la diferencia — se prueban las páginas reales contra el backend real.

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface MintJwtOptions {
  usuarioId: number;
  email: string;
  nombreCompleto: string;
  esAdminSyc?: boolean;
  esGerencial?: boolean;
  proyectos?: number[]; // se emiten como "{id}:Operador", igual que AuthController
}

function mintJwt(opts: MintJwtOptions): string {
  const key = process.env.SGDS_JWT_KEY;
  if (!key) {
    throw new Error(
      'Falta la variable de entorno SGDS_JWT_KEY. Debe tener el mismo valor que "Jwt:Key" en ' +
        '`dotnet user-secrets list --project SGDS.Api`. En PowerShell: $env:SGDS_JWT_KEY = "...".',
    );
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const proyectoClaims = (opts.proyectos ?? []).map((p) => `${p}:Operador`);

  const payload: Record<string, unknown> = {
    sub: String(opts.usuarioId),
    email: opts.email,
    nombreCompleto: opts.nombreCompleto,
    esAdminSyc: String(!!opts.esAdminSyc),
    esGerencial: String(!!opts.esGerencial),
    iss: 'SGDS.Api',
    aud: 'SGDS.Frontend',
    iat: now,
    exp: now + 3600,
  };

  // JwtSecurityToken (System.IdentityModel.Tokens.Jwt) serializa un solo claim del mismo tipo
  // como string plano, y varios como array — hay que imitar eso para que jwt-decode en el
  // frontend y User.FindAll("proyecto") en el backend lo lean igual que un token real.
  if (proyectoClaims.length === 1) payload.proyecto = proyectoClaims[0];
  else if (proyectoClaims.length > 1) payload.proyecto = proyectoClaims;

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', key).update(`${encodedHeader}.${encodedPayload}`).digest();

  return `${encodedHeader}.${encodedPayload}.${base64url(signature)}`;
}

// Inyecta la sesión ANTES de que cargue cualquier script de la página, para que AuthContext la
// encuentre ya puesta en su primer render (mismo mecanismo que usa para persistir el login).
export async function loginComoOperador(page: Page, opts: MintJwtOptions) {
  const token = mintJwt(opts);
  const authUser = {
    id: String(opts.usuarioId),
    email: opts.email,
    nombreCompleto: opts.nombreCompleto,
    esAdminSyc: !!opts.esAdminSyc,
    esGerencial: !!opts.esGerencial,
    proyectos: (opts.proyectos ?? []).map((p) => ({ proyectoId: String(p), rol: 'Operador' })),
    token,
  };

  await page.addInitScript((user) => {
    window.localStorage.setItem('sgds_auth_user', JSON.stringify(user));
  }, authUser);
}
