import twilio from 'twilio';
import { ApiErrorResponse } from '@vuzki/types';
import { config } from '../config';
import { logger } from '../middleware/logger';

// Twilio Network Traversal Service tokens are short-lived by design. We issue
// 1-hour credentials (the recommended "short-lived" configuration for app
// sessions) so a leaked browser-side credential expires quickly.
const TURN_CREDENTIAL_TTL_SECONDS = 3600;

interface TwilioIceServer {
  urls?: string | string[];
  url?: string;
  username?: string;
  credential?: string;
}

// Plain ICE server shape sent to the browser (no DOM types on the API).
export interface TurnIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// Twilio may return `iceServers` as parsed objects. Normalize whatever shape
// comes back into the plain ICE server configuration the browser expects.
function toRtcIceServers(iceServers: TwilioIceServer[] | undefined): TurnIceServer[] {
  const out: TurnIceServer[] = [];
  for (const server of iceServers ?? []) {
    if (!server) continue;
    const urls = server.urls ?? server.url;
    if (!urls) continue;
    const entry: TurnIceServer = { urls };
    if (server.username) entry.username = server.username;
    if (server.credential) entry.credential = server.credential;
    out.push(entry);
  }
  return out;
}

export interface TurnCredentialsResult {
  configured: boolean;
  iceServers: TurnIceServer[];
}

// Fetch short-lived Twilio NTS STUN/TURN ICE server credentials. Called only
// server-side; the permanent Account SID / Auth Token never leave the server.
export async function getTurnCredentialIceServers(): Promise<TurnCredentialsResult> {
  const { twilioAccountSid, twilioAuthToken } = config;
  if (!twilioAccountSid || !twilioAuthToken) {
    // Not configured -> signal graceful fallback (client keeps using STUN).
    return { configured: false, iceServers: [] };
  }
  try {
    const client = twilio(twilioAccountSid, twilioAuthToken);
    const token = await client.tokens.create({ ttl: TURN_CREDENTIAL_TTL_SECONDS });
    return { configured: true, iceServers: toRtcIceServers(token.iceServers) };
  } catch (err) {
    // Log a generic marker only: never the auth token, and never the
    // generated TURN password/credential.
    logger.error('turn_credentials_fetch_failed', { error: (err as Error)?.message });
    throw new ApiErrorResponse(502, 'TURN_UNAVAILABLE', 'TURN credentials are temporarily unavailable');
  }
}