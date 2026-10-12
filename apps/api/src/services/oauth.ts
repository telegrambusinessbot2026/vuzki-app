import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';

const googleClient = new OAuth2Client(config.googleClientId);

export async function verifyGoogleToken(token: string): Promise<{ providerId: string; email?: string; name?: string }> {
  const clientId = config.googleClientId;
  if (!clientId) {
    throw new Error('Google OAuth is not configured on the server (missing GOOGLE_CLIENT_ID)');
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      throw new Error('Invalid Google token payload');
    }
    return {
      providerId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch (err: any) {
    throw new Error(`Google token verification failed: ${err?.message || 'invalid token'}`);
  }
}
