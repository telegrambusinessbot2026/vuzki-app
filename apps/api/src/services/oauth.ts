import { OAuth2Client } from 'google-auth-library';
import appleSigninAuth from 'apple-signin-auth';
import { config } from '../config';

const googleClient = new OAuth2Client(config.googleClientId);

export async function verifyGoogleToken(token: string): Promise<{ providerId: string; email?: string; name?: string }> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: config.googleClientId,
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
  } catch (err) {
    throw new Error('Google token verification failed');
  }
}

export async function verifyAppleToken(token: string): Promise<{ providerId: string; email?: string }> {
  try {
    const payload = await appleSigninAuth.verifyIdToken(token, {
      audience: config.appleClientId,
      ignoreExpiration: false,
    });
    if (!payload || !payload.sub) {
      throw new Error('Invalid Apple token payload');
    }
    return {
      providerId: payload.sub,
      email: payload.email,
    };
  } catch (err) {
    throw new Error('Apple token verification failed');
  }
}

export async function verifyFacebookToken(token: string): Promise<{ providerId: string; email?: string; name?: string }> {
  try {
    const res = await fetch('https://graph.facebook.com/me?fields=id,name,email&access_token=' + token);
    if (!res.ok) throw new Error('Invalid Facebook token');
    const data: any = await res.json();
    if (!data.id) throw new Error('Invalid Facebook token payload');
    return {
      providerId: data.id,
      email: data.email,
      name: data.name,
    };
  } catch (err) {
    throw new Error('Facebook token verification failed');
  }
}
