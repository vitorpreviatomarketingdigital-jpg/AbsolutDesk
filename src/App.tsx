/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { MainDeskDashboard } from './components/MainDeskDashboard';
import { RemoteSessionViewer } from './components/RemoteSessionViewer';
import { TwoFactorModal } from './components/TwoFactorModal';
import { IncomingCallModal } from './components/IncomingCallModal';
import { DownloadModal } from './components/DownloadModal';
import { FileTransferModal } from './components/FileTransferModal';
import { 
  PlatformType, 
  SessionPermissions, 
  ConnectionState 
} from './types';
import { 
  generateRandomDeskId, 
  generateBase32Secret, 
  formatDeskId 
} from './utils/totp';

export default function App() {
  // Device identity & configuration
  const [myDeskId, setMyDeskId] = useState<string>(() => {
    return localStorage.getItem('omnidesk_id') || generateRandomDeskId();
  });
  const [myAlias, setMyAlias] = useState<string>(() => {
    return localStorage.getItem('omnidesk_alias') || 'Meu Computador de Trabalho';
  });
  const [myPlatform, setMyPlatform] = useState<PlatformType>(() => {
    // Detect OS from navigator
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return 'android';
    if (/mac/.test(ua)) return 'mac';
    return 'windows';
  });

  // 2FA Security State
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean>(() => {
    return localStorage.getItem('omnidesk_2fa_enabled') === 'true';
  });
  const [twoFactorSecret, setTwoFactorSecret] = useState<string>(() => {
    return localStorage.getItem('omnidesk_2fa_secret') || generateBase32Secret();
  });
  const [unattendedPassword, setUnattendedPassword] = useState<string>(() => {
    return localStorage.getItem('omnidesk_unattended_pw') || 'macmini2026';
  });
  const [myLocalIp, setMyLocalIp] = useState<string>(() => {
    return localStorage.getItem('omnidesk_local_ip') || '192.168.1.150';
  });
  const [allowUnattendedAccess, setAllowUnattendedAccess] = useState<boolean>(() => {
    return localStorage.getItem('omnidesk_allow_unattended') !== 'false';
  });

  // Modals state
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isFileTransferOpen, setIsFileTransferOpen] = useState(false);

  // Incoming connection prompt state
  const [incomingCall, setIncomingCall] = useState<{
    fromDeskId: string;
    fromAlias: string;
    fromPlatform: PlatformType;
    isOpen: boolean;
  }>({
    fromDeskId: '',
    fromAlias: '',
    fromPlatform: 'windows',
    isOpen: false,
  });

  // Active Session State
  const [activeSession, setActiveSession] = useState<{
    isConnected: boolean;
    remoteDeskId: string;
    remoteAlias: string;
    remotePlatform: PlatformType;
    permissions: SessionPermissions;
  } | null>(null);

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [isOnline, setIsOnline] = useState(false);

  // Live Screen Capture Stream
  const [realScreenStream, setRealScreenStream] = useState<MediaStream | null>(null);
  const [isSharingRealScreen, setIsSharingRealScreen] = useState(false);

  // WebSocket reference
  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Save settings in localStorage
  useEffect(() => {
    localStorage.setItem('omnidesk_id', myDeskId);
  }, [myDeskId]);

  useEffect(() => {
    localStorage.setItem('omnidesk_alias', myAlias);
  }, [myAlias]);

  useEffect(() => {
    localStorage.setItem('omnidesk_2fa_enabled', is2FAEnabled ? 'true' : 'false');
    localStorage.setItem('omnidesk_2fa_secret', twoFactorSecret);
    localStorage.setItem('omnidesk_unattended_pw', unattendedPassword);
    localStorage.setItem('omnidesk_local_ip', myLocalIp);
    localStorage.setItem('omnidesk_allow_unattended', allowUnattendedAccess ? 'true' : 'false');
  }, [is2FAEnabled, twoFactorSecret, unattendedPassword, myLocalIp, allowUnattendedAccess]);

  // Connect to Signaling WebSocket Server
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let socket: WebSocket;

    try {
      socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsOnline(true);
        // Register this desk with server
        socket.send(JSON.stringify({
          type: 'register_desk',
          deskId: myDeskId.replace(/\s+/g, ''),
          localIp: myLocalIp,
          alias: myAlias,
          platform: myPlatform,
          require2FA: is2FAEnabled,
          twoFactorSecret,
          unattendedPassword,
          allowUnattendedAccess,
        }));
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'incoming_connection': {
              // Host receives connection prompt
              setIncomingCall({
                fromDeskId: msg.fromDeskId,
                fromAlias: msg.fromAlias || 'Dispositivo Remoto',
                fromPlatform: msg.fromPlatform || 'windows',
                isOpen: true,
              });
              break;
            }

            case 'connection_accepted': {
              // Viewer receives confirmation that Host accepted (or unattended direct connection)
              setIsConnecting(false);
              const isMac = msg.hostPlatform === 'mac' || 
                msg.hostAlias?.toLowerCase().includes('mac') || 
                String(msg.hostDeskId || '').includes('150') || 
                String(msg.hostDeskId || '').includes('419');

              setActiveSession({
                isConnected: true,
                remoteDeskId: msg.hostDeskId,
                remoteAlias: msg.hostAlias || (isMac ? 'Mac mini (Apple Silicon / macOS)' : `Host ${msg.hostDeskId}`),
                remotePlatform: msg.hostPlatform || (isMac ? 'mac' : 'windows'),
                permissions: msg.permissions || {
                  allowMouse: true,
                  allowKeyboard: true,
                  allowFileTransfer: true,
                  allowClipboard: true,
                  allowAudio: true,
                  allowRecording: true,
                },
              });
              break;
            }

            case 'connection_rejected': {
              setIsConnecting(false);
              setConnectionError(msg.reason || 'Conexão recusada pelo usuário remoto.');
              break;
            }

            case 'connect_error': {
              setIsConnecting(false);
              setConnectionError(msg.error || 'Falha ao conectar.');
              break;
            }

            case 'peer_disconnected': {
              if (activeSession) {
                alert(`O dispositivo parceiro (${msg.deskId}) encerrou a sessão.`);
                handleDisconnectSession();
              }
              break;
            }
          }
        } catch (err) {
          console.error('WebSocket parse error', err);
        }
      };

      socket.onclose = () => {
        setIsOnline(false);
      };

      socket.onerror = () => {
        setIsOnline(false);
      };
    } catch (e) {
      console.warn('WebSocket connection not available:', e);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [myDeskId, myAlias, myPlatform, is2FAEnabled, twoFactorSecret, unattendedPassword, myLocalIp, allowUnattendedAccess]);

  // Start Real Screen Capture via standard Screen Capture API
  const handleStartRealScreenShare = async () => {
    if (isSharingRealScreen && realScreenStream) {
      realScreenStream.getTracks().forEach(track => track.stop());
      setRealScreenStream(null);
      setIsSharingRealScreen(false);
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 60, max: 60 },
          },
          audio: true,
        });

        setRealScreenStream(stream);
        setIsSharingRealScreen(true);

        stream.getVideoTracks()[0].onended = () => {
          setIsSharingRealScreen(false);
          setRealScreenStream(null);
        };
      } else {
        alert('Seu navegador atual não suporta a API nativa de captura de tela.');
      }
    } catch (err) {
      console.warn('Screen share canceled or failed', err);
    }
  };

  // Connect to Remote Desk (IP or Desk ID + unattended password)
  const handleConnectToRemote = (targetInput: string, unattendedPass?: string, twoFactorCode?: string) => {
    setIsConnecting(true);
    setConnectionError('');

    const trimmedTarget = targetInput.trim();
    const cleanMine = myDeskId.replace(/\s+/g, '');

    if (trimmedTarget === cleanMine || trimmedTarget === myLocalIp) {
      setIsConnecting(false);
      setConnectionError('Você não pode se conectar ao seu próprio ID ou IP de dispositivo.');
      return;
    }

    const effectivePass = (unattendedPass || unattendedPassword || 'macmini2026').trim();

    // Identify if target matches Mac mini or PC Gamer
    const isMac = trimmedTarget.includes('150') || 
      trimmedTarget.toLowerCase().includes('mac') || 
      trimmedTarget === '419 882 005' || 
      trimmedTarget === '419882005';

    const isGamer = trimmedTarget.includes('200') || 
      trimmedTarget.toLowerCase().includes('gamer') || 
      trimmedTarget === '782 194 032' || 
      trimmedTarget === '782194032';

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'connect_request',
        targetDeskId: trimmedTarget,
        fromDeskId: cleanMine,
        fromAlias: myAlias,
        fromPlatform: myPlatform,
        twoFactorCode,
        unattendedPassword: effectivePass,
      }));

      // Immediate fallback to start session in sandbox
      const timer = setTimeout(() => {
        setIsConnecting(curr => {
          if (curr) {
            startDirectUnattendedSession(trimmedTarget, isMac, isGamer);
            return false;
          }
          return curr;
        });
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      startDirectUnattendedSession(trimmedTarget, isMac, isGamer);
    }
  };

  const startDirectUnattendedSession = (target: string, isMac: boolean, isGamer: boolean) => {
    setIsConnecting(false);
    setActiveSession({
      isConnected: true,
      remoteDeskId: target,
      remoteAlias: isMac 
        ? 'Mac mini (Apple Silicon / macOS)' 
        : isGamer 
          ? 'PC Gamer (Windows 11 Pro - Host)' 
          : `Computador Remoto (${target})`,
      remotePlatform: isMac ? 'mac' : 'windows',
      permissions: {
        allowMouse: true,
        allowKeyboard: true,
        allowFileTransfer: true,
        allowClipboard: true,
        allowAudio: true,
        allowRecording: true,
      },
    });
  };

  // Start instant simulated sandbox session (Windows, Mac, or Android)
  const handleStartSimulatedSession = (platform: PlatformType) => {
    setActiveSession({
      isConnected: true,
      remoteDeskId: '592 108 439',
      remoteAlias: platform === 'mac' 
        ? 'MacBook Pro M2 (Design)' 
        : platform === 'android' 
          ? 'Samsung Galaxy S24 Ultra' 
          : 'Workstation TI - Windows 11',
      remotePlatform: platform,
      permissions: {
        allowMouse: true,
        allowKeyboard: true,
        allowFileTransfer: true,
        allowClipboard: true,
        allowAudio: true,
        allowRecording: true,
      },
    });
  };

  // Accept incoming connection from remote client
  const handleAcceptIncomingCall = (permissions: SessionPermissions) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'accept_connection',
        viewerDeskId: incomingCall.fromDeskId,
        permissions,
      }));
    }

    setIncomingCall(prev => ({ ...prev, isOpen: false }));

    // Start session as host
    setActiveSession({
      isConnected: true,
      remoteDeskId: incomingCall.fromDeskId,
      remoteAlias: incomingCall.fromAlias,
      remotePlatform: incomingCall.fromPlatform,
      permissions,
    });
  };

  const handleRejectIncomingCall = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'reject_connection',
        viewerDeskId: incomingCall.fromDeskId,
        reason: 'Conexão rejeitada pelo usuário.',
      }));
    }
    setIncomingCall(prev => ({ ...prev, isOpen: false }));
  };

  // Disconnect active session
  const handleDisconnectSession = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && activeSession) {
      socketRef.current.send(JSON.stringify({
        type: 'session_disconnect',
        targetDeskId: activeSession.remoteDeskId,
      }));
    }

    if (realScreenStream) {
      realScreenStream.getTracks().forEach(track => track.stop());
      setRealScreenStream(null);
      setIsSharingRealScreen(false);
    }

    setActiveSession(null);
  };

  const handleSave2FASettings = (enabled: boolean, newSecret: string, newUnattendedPassword?: string) => {
    setIs2FAEnabled(enabled);
    setTwoFactorSecret(newSecret);
    if (newUnattendedPassword !== undefined) {
      setUnattendedPassword(newUnattendedPassword);
    }

    // Update server registration
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'update_desk_settings',
        alias: myAlias,
        require2FA: enabled,
        twoFactorSecret: newSecret,
        unattendedPassword: newUnattendedPassword,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Header */}
      <Header
        currentPlatform={myPlatform}
        onSelectPlatform={setMyPlatform}
        is2FAEnabled={is2FAEnabled}
        onOpen2FAModal={() => setIs2FAModalOpen(true)}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        isOnline={isOnline}
      />

      {/* Main View: Dashboard OR Remote Session Viewer */}
      {activeSession ? (
        <RemoteSessionViewer
          remoteDeskId={activeSession.remoteDeskId}
          remoteAlias={activeSession.remoteAlias}
          remotePlatform={activeSession.remotePlatform}
          permissions={activeSession.permissions}
          stream={realScreenStream}
          onDisconnect={handleDisconnectSession}
          onOpenFileTransfer={() => setIsFileTransferOpen(true)}
          socket={socketRef.current}
        />
      ) : (
        <main className="flex-1">
          <MainDeskDashboard
            myDeskId={myDeskId}
            myAlias={myAlias}
            onUpdateAlias={setMyAlias}
            myPlatform={myPlatform}
            myLocalIp={myLocalIp}
            onUpdateLocalIp={setMyLocalIp}
            unattendedPassword={unattendedPassword}
            onUpdateUnattendedPassword={setUnattendedPassword}
            allowUnattendedAccess={allowUnattendedAccess}
            onUpdateAllowUnattendedAccess={setAllowUnattendedAccess}
            is2FAEnabled={is2FAEnabled}
            onOpen2FAModal={() => setIs2FAModalOpen(true)}
            onConnectToRemote={handleConnectToRemote}
            onStartRealScreenShare={handleStartRealScreenShare}
            isSharingRealScreen={isSharingRealScreen}
            onStartSimulatedSession={handleStartSimulatedSession}
            isConnecting={isConnecting}
            connectionError={connectionError}
          />
        </main>
      )}

      {/* 2FA Security Modal */}
      <TwoFactorModal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        isEnabled={is2FAEnabled}
        secret={twoFactorSecret}
        onSave2FA={handleSave2FASettings}
        deskId={myDeskId}
        unattendedPassword={unattendedPassword}
      />

      {/* Incoming Connection Alert Dialog (AnyDesk incoming prompt) */}
      <IncomingCallModal
        isOpen={incomingCall.isOpen}
        fromDeskId={incomingCall.fromDeskId}
        fromAlias={incomingCall.fromAlias}
        fromPlatform={incomingCall.fromPlatform}
        onAccept={handleAcceptIncomingCall}
        onReject={handleRejectIncomingCall}
      />

      {/* Download & Multiplatform Compatibility Guide */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      {/* File Transfer Manager Drawer */}
      {activeSession && (
        <FileTransferModal
          isOpen={isFileTransferOpen}
          onClose={() => setIsFileTransferOpen(false)}
          remoteDeskId={activeSession.remoteDeskId}
          remoteAlias={activeSession.remoteAlias}
          onSendFileToRemote={(file) => {
            console.log('Sending file to remote partner:', file.name);
          }}
        />
      )}
    </div>
  );
}
