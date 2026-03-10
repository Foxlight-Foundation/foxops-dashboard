import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'ws://localhost:18789';
const CALL_TIMEOUT_MS = 15_000;

// Read token from env, falling back to local openclaw config for dev convenience
const resolveToken = (): string => {
  if (process.env.OPENCLAW_GATEWAY_TOKEN) return process.env.OPENCLAW_GATEWAY_TOKEN;
  try {
    const cfgPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as { gateway?: { auth?: { token?: string } } };
    return cfg?.gateway?.auth?.token ?? '';
  } catch {
    return '';
  }
};

const GATEWAY_TOKEN = resolveToken();

interface GatewayMessage {
  type: string;
  id?: string;
  event?: string;
  method?: string;
  ok?: boolean;
  payload?: unknown;
  params?: unknown;
  error?: { code?: string; message?: string };
}

const connect = (): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(GATEWAY_URL);
    let connectId: string | null = null;

    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error('Gateway connect timeout'));
    }, CALL_TIMEOUT_MS);

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as GatewayMessage;

      if (msg.type === 'event' && msg.event === 'connect.challenge') {
        connectId = randomUUID();
        ws.send(JSON.stringify({
          type: 'req',
          id: connectId,
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: { id: 'cli', version: '1.0.0', platform: 'node', mode: 'cli' },
            caps: [],
            scopes: ['operator.read', 'operator.admin'],
            auth: GATEWAY_TOKEN ? { token: GATEWAY_TOKEN } : {},
          },
        }));
        return;
      }

      if (msg.type === 'res' && msg.id === connectId) {
        clearTimeout(timeout);
        if (msg.ok) {
          resolve(ws);
        } else {
          ws.terminate();
          reject(new Error(`Gateway auth failed: ${msg.error?.message ?? 'unknown'}`));
        }
      }
    });
  });

export const gatewayCall = async <T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> => {
  const ws = await connect();

  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Gateway call timed out: ${method}`));
    }, CALL_TIMEOUT_MS);

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as GatewayMessage;
      if (msg.type === 'res' && msg.id === id) {
        clearTimeout(timeout);
        ws.close();
        if (msg.ok) {
          resolve(msg.payload as T);
        } else {
          reject(new Error(msg.error?.message ?? `Gateway call failed: ${method}`));
        }
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.send(JSON.stringify({ type: 'req', id, method, params }));
  });
};
