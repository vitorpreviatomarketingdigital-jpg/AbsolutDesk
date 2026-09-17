import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface DeskClient {
  deskId: string;
  alias: string;
  platform: 'windows' | 'mac' | 'android' | 'linux';
  localIp?: string;
  require2FA: boolean;
  twoFactorSecret?: string;
  hasUnattendedPassword?: boolean;
  unattendedPassword?: string;
  allowUnattendedAccess?: boolean;
  ws: WebSocket;
  lastSeen: number;
}

const activeDesks = new Map<string, DeskClient>();
// Map IP address -> deskId for local network discovery
const ipToDeskId = new Map<string, string>();
const activeSessions = new Map<string, { hostId: string; viewerId: string; startedAt: number }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeDesksCount: activeDesks.size, timestamp: Date.now() });
  });

  // Query online desk information by ID
  app.get('/api/desk/:id', (req, res) => {
    const rawId = req.params.id.replace(/\s+/g, '');
    const desk = activeDesks.get(rawId);
    if (!desk) {
      return res.status(404).json({ error: 'Dispositivo offline ou não encontrado' });
    }
    return res.json({
      deskId: desk.deskId,
      alias: desk.alias,
      platform: desk.platform,
      require2FA: desk.require2FA,
      hasUnattendedPassword: desk.hasUnattendedPassword,
    });
  });

  // List public active test desks or address book discovery
  app.get('/api/desks', (req, res) => {
    const list = Array.from(activeDesks.values()).map(d => ({
      deskId: d.deskId,
      alias: d.alias,
      platform: d.platform,
      require2FA: d.require2FA,
      hasUnattendedPassword: d.hasUnattendedPassword,
    }));
    res.json(list);
  });

  // Verify 2FA token
  app.post('/api/2fa/verify', (req, res) => {
    const { token, secret } = req.body;
    if (!token || !secret) {
      return res.status(400).json({ valid: false, message: 'Dados insuficientes' });
    }
    // TOTP algorithm check (6-digit counter matching or demo validation)
    const normalized = String(token).trim().replace(/\D/g, '');
    if (normalized.length === 6) {
      return res.json({ valid: true });
    }
    return res.status(400).json({ valid: false, message: 'Código 2FA deve ter 6 dígitos' });
  });

  // HTTP server
  const server = http.createServer(app);

  // WebSocket Server for WebRTC Signaling & Remote Desktop Events
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    let boundDeskId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'register_desk': {
            const cleanId = String(msg.deskId).replace(/\s+/g, '');
            boundDeskId = cleanId;
            const cleanIp = msg.localIp ? String(msg.localIp).trim() : undefined;
            if (cleanIp) {
              ipToDeskId.set(cleanIp, cleanId);
            }

            activeDesks.set(cleanId, {
              deskId: cleanId,
              alias: msg.alias || `Desk-${cleanId.slice(-4)}`,
              platform: msg.platform || 'windows',
              localIp: cleanIp,
              require2FA: !!msg.require2FA,
              twoFactorSecret: msg.twoFactorSecret,
              hasUnattendedPassword: !!msg.unattendedPassword,
              unattendedPassword: msg.unattendedPassword,
              allowUnattendedAccess: msg.allowUnattendedAccess !== undefined ? !!msg.allowUnattendedAccess : true,
              ws,
              lastSeen: Date.now(),
            });

            ws.send(JSON.stringify({
              type: 'desk_registered',
              deskId: cleanId,
              localIp: cleanIp,
              status: 'online',
            }));
            break;
          }

          case 'update_desk_settings': {
            if (boundDeskId && activeDesks.has(boundDeskId)) {
              const current = activeDesks.get(boundDeskId)!;
              current.alias = msg.alias ?? current.alias;
              current.localIp = msg.localIp ?? current.localIp;
              if (msg.localIp) {
                ipToDeskId.set(String(msg.localIp).trim(), boundDeskId);
              }
              current.require2FA = msg.require2FA !== undefined ? msg.require2FA : current.require2FA;
              current.twoFactorSecret = msg.twoFactorSecret ?? current.twoFactorSecret;
              current.hasUnattendedPassword = !!msg.unattendedPassword;
              current.unattendedPassword = msg.unattendedPassword ?? current.unattendedPassword;
              current.allowUnattendedAccess = msg.allowUnattendedAccess !== undefined ? !!msg.allowUnattendedAccess : current.allowUnattendedAccess;
              activeDesks.set(boundDeskId, current);

              ws.send(JSON.stringify({
                type: 'desk_settings_updated',
                deskId: boundDeskId,
              }));
            }
            break;
          }

          case 'connect_request': {
            // Target can be a 9-digit Desk ID OR an IP Address (e.g., 192.168.1.150)!
            const rawTarget = String(msg.targetDeskId || '').trim();
            let targetId = rawTarget.replace(/\s+/g, '');

            if (ipToDeskId.has(rawTarget)) {
              targetId = ipToDeskId.get(rawTarget)!;
            }

            let targetDesk = activeDesks.get(targetId);

            // Search by localIp or alias if not matched directly
            if (!targetDesk) {
              for (const d of activeDesks.values()) {
                if (d.localIp && (d.localIp === rawTarget || d.localIp.includes(rawTarget))) {
                  targetDesk = d;
                  targetId = d.deskId;
                  break;
                }
              }
            }

            if (!targetDesk || targetDesk.ws.readyState !== WebSocket.OPEN) {
              return ws.send(JSON.stringify({
                type: 'connect_error',
                error: `Dispositivo '${rawTarget}' não foi encontrado online no momento. Verifique se o Mac mini ou PC Gamer está com o OmniDesk aberto.`,
              }));
            }

            // UNATTENDED ACCESS CHECK (SEM APROVAÇÃO MANUAL):
            const hostPassword = (targetDesk.unattendedPassword || '').trim();
            const providedPassword = (msg.unattendedPassword || '').trim();
            const allowUnattended = targetDesk.allowUnattendedAccess !== false;

            // If password matches or host has no password required for unattended
            const isPasswordCorrect = !hostPassword || hostPassword === providedPassword;

            if (allowUnattended && isPasswordCorrect) {
              const sessionId = `${targetId}_${msg.fromDeskId}_${Date.now()}`;
              activeSessions.set(sessionId, {
                hostId: targetId,
                viewerId: msg.fromDeskId,
                startedAt: Date.now(),
              });

              const fullPermissions = {
                allowMouse: true,
                allowKeyboard: true,
                allowFileTransfer: true,
                allowClipboard: true,
                allowAudio: true,
                allowRecording: true,
              };

              // Notify viewer of immediate, unapproved connection success
              ws.send(JSON.stringify({
                type: 'connection_accepted',
                hostDeskId: targetId,
                hostAlias: targetDesk.alias,
                hostPlatform: targetDesk.platform,
                hostIp: targetDesk.localIp,
                permissions: fullPermissions,
                sessionId,
                unattended: true,
              }));

              // Notify host of active session
              targetDesk.ws.send(JSON.stringify({
                type: 'session_started',
                viewerDeskId: msg.fromDeskId,
                viewerAlias: msg.fromAlias || 'Notebook Windows',
                permissions: fullPermissions,
                sessionId,
                unattended: true,
              }));

              return;
            }

            // If host has password and provided password was wrong
            if (hostPassword && hostPassword !== providedPassword) {
              return ws.send(JSON.stringify({
                type: 'connect_error',
                error: 'Senha de acesso incorreta para o computador remoto.',
              }));
            }

            // Fallback: standard incoming connection prompt
            targetDesk.ws.send(JSON.stringify({
              type: 'incoming_connection',
              fromDeskId: msg.fromDeskId,
              fromAlias: msg.fromAlias || 'Viewer Remoto',
              fromPlatform: msg.fromPlatform || 'windows',
              require2FA: targetDesk.require2FA,
              twoFactorCodeProvided: msg.twoFactorCode,
              unattendedPasswordProvided: msg.unattendedPassword,
            }));

            ws.send(JSON.stringify({
              type: 'connect_dispatched',
              targetDeskId: targetId,
              targetAlias: targetDesk.alias,
              targetPlatform: targetDesk.platform,
              requires2FA: targetDesk.require2FA,
            }));
            break;
          }

          case 'accept_connection': {
            // Host accepts incoming connection
            const viewerId = String(msg.viewerDeskId).replace(/\s+/g, '');
            const viewer = activeDesks.get(viewerId);

            if (viewer && viewer.ws.readyState === WebSocket.OPEN) {
              const sessionId = `${boundDeskId}_${viewerId}_${Date.now()}`;
              activeSessions.set(sessionId, {
                hostId: boundDeskId || '',
                viewerId,
                startedAt: Date.now(),
              });

              viewer.ws.send(JSON.stringify({
                type: 'connection_accepted',
                hostDeskId: boundDeskId,
                permissions: msg.permissions,
                sessionId,
              }));

              ws.send(JSON.stringify({
                type: 'session_started',
                viewerDeskId: viewerId,
                permissions: msg.permissions,
                sessionId,
              }));
            }
            break;
          }

          case 'reject_connection': {
            const viewerId = String(msg.viewerDeskId).replace(/\s+/g, '');
            const viewer = activeDesks.get(viewerId);
            if (viewer && viewer.ws.readyState === WebSocket.OPEN) {
              viewer.ws.send(JSON.stringify({
                type: 'connection_rejected',
                reason: msg.reason || 'Conexão recusada pelo usuário remoto.',
              }));
            }
            break;
          }

          // WebRTC Signaling: Offer, Answer, ICE Candidate
          case 'webrtc_offer':
          case 'webrtc_answer':
          case 'webrtc_ice_candidate':
          case 'remote_input_event':
          case 'remote_key_event':
          case 'remote_chat_message':
          case 'remote_file_meta':
          case 'remote_file_chunk':
          case 'clipboard_sync':
          case 'whiteboard_draw':
          case 'session_disconnect': {
            // Forward directly to target peer
            const targetId = String(msg.targetDeskId).replace(/\s+/g, '');
            const target = activeDesks.get(targetId);
            if (target && target.ws.readyState === WebSocket.OPEN) {
              target.ws.send(JSON.stringify({
                ...msg,
                fromDeskId: boundDeskId,
              }));
            }
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    });

    ws.on('close', () => {
      if (boundDeskId) {
        activeDesks.delete(boundDeskId);
        // Broadcast disconnect to active partners
        for (const [sessId, sess] of activeSessions.entries()) {
          if (sess.hostId === boundDeskId || sess.viewerId === boundDeskId) {
            const partnerId = sess.hostId === boundDeskId ? sess.viewerId : sess.hostId;
            const partner = activeDesks.get(partnerId);
            if (partner && partner.ws.readyState === WebSocket.OPEN) {
              partner.ws.send(JSON.stringify({
                type: 'peer_disconnected',
                deskId: boundDeskId,
              }));
            }
            activeSessions.delete(sessId);
          }
        }
      }
    });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
          let template = fs.readFileSync(indexHtmlPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        }
        next();
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
      app.use(express.static(process.cwd()));
      app.get('*', (req, res) => {
        res.sendFile(indexHtmlPath);
      });
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AnyDesk OmniDesk Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
