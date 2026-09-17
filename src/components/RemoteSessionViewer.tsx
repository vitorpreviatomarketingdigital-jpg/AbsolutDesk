import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, 
  Apple, 
  Smartphone, 
  PhoneOff, 
  MessageSquare, 
  FolderSync, 
  PenTool, 
  Camera, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Wifi, 
  Terminal, 
  FileText, 
  Settings, 
  Sparkles, 
  Send, 
  Lock, 
  Check, 
  RefreshCw,
  Folder,
  Layers,
  Search,
  Power,
  ClipboardCopy,
  Copy,
  ArrowRightLeft,
  Keyboard,
  MousePointer,
  AlertCircle
} from 'lucide-react';
import { 
  PlatformType, 
  SessionPermissions, 
  ChatMessage, 
  QualityPreset 
} from '../types';

interface RemoteSessionViewerProps {
  remoteDeskId: string;
  remoteAlias: string;
  remotePlatform: PlatformType;
  permissions: SessionPermissions;
  stream: MediaStream | null;
  onDisconnect: () => void;
  onOpenFileTransfer: () => void;
  socket: WebSocket | null;
}

export const RemoteSessionViewer: React.FC<RemoteSessionViewerProps> = ({
  remoteDeskId,
  remoteAlias,
  remotePlatform,
  permissions,
  stream,
  onDisconnect,
  onOpenFileTransfer,
  socket,
}) => {
  // Session states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showClipboardPanel, setShowClipboardPanel] = useState(false);

  // Clipboard States (Sincronização Windows <-> Mac mini / Host)
  const [localClipboardText, setLocalClipboardText] = useState('Texto copiado do Notebook Windows para teste.');
  const [clipboardToast, setClipboardToast] = useState<string | null>(null);
  const [clipboardHistory, setClipboardHistory] = useState<string[]>([
    'https://github.com/omnidesk-remote/agent',
    'sudo launchctl load -w /Library/LaunchDaemons/com.omnidesk.service.plist',
    'Chave de Autenticação: admin@omnidesk-macmini-2026',
  ]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'remote',
      senderAlias: remoteAlias,
      text: `Conexão direta estabelecida com ${remoteAlias} sem aprovação manual. Controle total de mouse, teclado e sincronização de área de transferência ativos.`,
      timestamp: Date.now() - 4000,
    }
  ]);
  const [newChatText, setNewChatText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Quality & Network Metrics
  const [qualityMode, setQualityMode] = useState<'low_latency' | 'balanced' | 'high_quality'>('low_latency');
  const [ping, setPing] = useState(11);
  const [fps, setFps] = useState(60);
  const [bitrate, setBitrate] = useState('4.8 Mbps');
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const [isScreenLocked, setIsScreenLocked] = useState(false);

  // Mouse coordinate overlay tracking
  const [remoteMousePos, setRemoteMousePos] = useState({ x: 50, y: 50 });
  const [clickWave, setClickWave] = useState<{ x: number; y: number; id: number } | null>(null);

  // Simulated Virtual OS Windows inside remote desktop
  const [activeApp, setActiveApp] = useState<'terminal' | 'notepad' | 'files' | 'settings' | null>('notepad');
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [notepadContent, setNotepadContent] = useState(
    `[MAC MINI / WORKSTATION - DOCUMENTO ATIVO]\nComputador: ${remoteAlias}\nAcesso: Autônomo e Direto (Sem confirmação no host)\nSincronização de Teclado e Área de Transferência habilitada.\n\nPronto para receber texto copiado do Windows ou digitação remota:`
  );
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    `OmniDesk Remote Kernel v4.2 [${remotePlatform === 'mac' ? 'Darwin 24.1.0 Apple Silicon' : 'Windows 11 NT'}]`,
    `Conexão P2P de Baixa Latência estabelecida com sucesso.`,
    `Digite comandos como 'ls', 'pwd', 'ping', 'top' ou digite no seu teclado do Windows.`,
  ]);

  // Video & Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const whiteboardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Bind live WebRTC stream if present
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Real-time ping jitter simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const delta = Math.floor(Math.random() * 5) - 2;
      setPing(prev => Math.max(7, Math.min(22, prev + delta)));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Listen for socket messages from remote partner
  useEffect(() => {
    if (!socket) return;
    const handleMsg = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'remote_chat_message') {
          setChatMessages(prev => [...prev, {
            id: `msg_${Date.now()}`,
            sender: 'remote',
            senderAlias: remoteAlias,
            text: data.text,
            timestamp: Date.now(),
          }]);
          if (!showChat) setUnreadCount(c => c + 1);
        } else if (data.type === 'remote_input_event' && data.pos) {
          setRemoteMousePos(data.pos);
        } else if (data.type === 'clipboard_sync' && data.text) {
          // Received synchronized clipboard from remote partner
          setLocalClipboardText(data.text);
          setClipboardHistory(prev => [data.text, ...prev.filter(t => t !== data.text)].slice(0, 8));
          setNotepadContent(prev => prev + `\n[CLIPBOARD RECEBIDO DO HOST]:\n${data.text}\n`);
          showToast(`📋 Texto sincronizado da Área de Transferência do ${remoteAlias}!`);
        }
      } catch (err) {
        console.error('Socket error in viewer', err);
      }
    };

    socket.addEventListener('message', handleMsg);
    return () => socket.removeEventListener('message', handleMsg);
  }, [socket, showChat, remoteAlias]);

  // Real Keyboard Event Interception & Forwarding
  useEffect(() => {
    if (!permissions.allowKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing inside local chat input or custom modal form
      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName.toLowerCase();
      const isInput = tagName === 'input' && activeEl?.getAttribute('type') !== 'hidden';
      const isChatText = activeEl?.id === 'chat_input';
      const isClipboardInput = activeEl?.id === 'clipboard_input';

      if (isChatText || isClipboardInput) return;

      // Broadcast key event to remote machine via WebSocket
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'remote_key_event',
          targetDeskId: remoteDeskId,
          key: e.key,
          code: e.code,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          metaKey: e.metaKey,
        }));
      }

      // Handle keyboard typing directly into the active simulated OS window (Notepad / Terminal)
      if (activeApp === 'notepad' && !isInput) {
        if (e.key === 'Backspace') {
          setNotepadContent(prev => prev.slice(0, -1));
        } else if (e.key === 'Enter') {
          setNotepadContent(prev => prev + '\n');
        } else if (e.key === 'Tab') {
          e.preventDefault();
          setNotepadContent(prev => prev + '    ');
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          setNotepadContent(prev => prev + e.key);
        }
      } else if (activeApp === 'terminal' && !isInput) {
        if (e.key === 'Backspace') {
          setTerminalInput(prev => prev.slice(0, -1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          executeTerminalCmd(terminalInput);
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          setTerminalInput(prev => prev + e.key);
        }
      }

      // Handle Ctrl + V or Cmd + V clipboard paste
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        handlePasteWindowsTextToRemote();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [permissions.allowKeyboard, activeApp, terminalInput, socket, remoteDeskId, localClipboardText]);

  // Toast notification helper
  const showToast = (msg: string) => {
    setClipboardToast(msg);
    setTimeout(() => setClipboardToast(null), 3500);
  };

  // CLIPBOARD SYNC: Copy from Windows to Mac mini / Host
  const handlePasteWindowsTextToRemote = async () => {
    let textToSync = localClipboardText;

    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const sysText = await navigator.clipboard.readText();
        if (sysText && sysText.trim()) {
          textToSync = sysText;
          setLocalClipboardText(sysText);
        }
      }
    } catch (e) {
      console.log('Browser clipboard read note: using local buffer', e);
    }

    // Broadcast over WebSocket to Host
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'clipboard_sync',
        targetDeskId: remoteDeskId,
        text: textToSync,
        sourcePlatform: 'windows',
      }));
    }

    // Append directly into the active document/notepad in the Mac mini
    setNotepadContent(prev => prev + `\n\n[TEXTO COLADO DO WINDOWS]:\n${textToSync}`);
    setClipboardHistory(prev => [textToSync, ...prev.filter(t => t !== textToSync)].slice(0, 8));

    showToast(`✓ Texto do Windows copiado e colado no ${remoteAlias}!`);
  };

  // CLIPBOARD SYNC: Copy text from Mac mini to Windows
  const handleCopyFromMacToWindows = async () => {
    const textToCopy = notepadContent.trim();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      }
    } catch (e) {
      console.warn('Clipboard write fallback', e);
    }

    setLocalClipboardText(textToCopy);
    setClipboardHistory(prev => [textToCopy, ...prev.filter(t => t !== textToCopy)].slice(0, 8));
    showToast(`✓ Texto do ${remoteAlias} copiado para a Área de Transferência do Windows!`);
  };

  // Handle remote screen mouse interactions
  const handleScreenMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!permissions.allowMouse) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setRemoteMousePos({ x, y });

    // Broadcast mouse position over socket
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'remote_input_event',
        targetDeskId: remoteDeskId,
        pos: { x, y },
      }));
    }
  };

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!permissions.allowMouse) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    setClickWave({ x: clientX, y: clientY, id: Date.now() });
    setTimeout(() => setClickWave(null), 600);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  // Send Remote System Keystroke (Ctrl+Alt+Del)
  const sendCtrlAltDel = () => {
    setTerminalHistory(prev => [
      ...prev,
      `[SISTEMA] Sinal de Interrupção Seguro enviado (Ctrl + Alt + Del).`
    ]);
    showToast('Atalho [Ctrl + Alt + Del] enviado ao host remoto.');
  };

  // Lock Remote Desktop
  const lockRemoteMachine = () => {
    setIsScreenLocked(prev => !prev);
  };

  // Send Chat message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'local',
      senderAlias: 'Notebook Windows',
      text: newChatText.trim(),
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, newMsg]);

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'remote_chat_message',
        targetDeskId: remoteDeskId,
        text: newChatText.trim(),
      }));
    }

    setNewChatText('');
  };

  // Interactive Terminal Commands (macOS / Windows commands)
  const executeTerminalCmd = (cmdRaw: string) => {
    const cmd = cmdRaw.trim().toLowerCase();
    if (!cmd) return;

    const newLogs = [...terminalHistory, `$ ${cmdRaw}`];

    if (cmd === 'help') {
      newLogs.push('Comandos disponíveis:');
      newLogs.push('  ls / dir    - Lista arquivos do diretório atual');
      newLogs.push('  pwd         - Exibe caminho atual');
      newLogs.push('  ping        - Testa latência e pacotes de rede');
      newLogs.push('  top         - Monitor de CPU e memória RAM');
      newLogs.push('  clear / cls - Limpa a tela do terminal');
    } else if (cmd === 'ls' || cmd === 'dir') {
      newLogs.push('Applications/   Documents/   Downloads/   Projects/   Desktop/');
      newLogs.push('omnidesk-server.js   system-config.plist   docker-compose.yml');
    } else if (cmd === 'pwd') {
      newLogs.push(remotePlatform === 'mac' ? '/Users/administrador/workspace' : 'C:\\Users\\Administrador\\Workspace');
    } else if (cmd === 'ping') {
      newLogs.push(`PING 192.168.1.1: 56 data bytes`);
      newLogs.push(`64 bytes from 192.168.1.1: icmp_seq=0 ttl=64 time=${ping} ms`);
      newLogs.push(`64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=${ping - 1} ms`);
      newLogs.push(`--- 192.168.1.1 ping statistics: 0% packet loss ---`);
    } else if (cmd === 'top') {
      newLogs.push(`Processes: 248 total, 2 running, 246 sleeping`);
      newLogs.push(`CPU usage: 4.8% user, 2.1% sys, 93.1% idle`);
      newLogs.push(`Memory: 32GB total, 11.4GB used, 20.6GB free`);
    } else if (cmd === 'clear' || cmd === 'cls') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    } else {
      newLogs.push(`comando executado: ${cmdRaw}`);
    }

    setTerminalHistory(newLogs);
    setTerminalInput('');
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeTerminalCmd(terminalInput);
  };

  // Whiteboard drawing logic
  const handleWhiteboardMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleWhiteboardMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleWhiteboardMouseUp = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-40 bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans select-none">
      {/* Toast Notification for Clipboard Sync */}
      {clipboardToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/95 border border-emerald-600 text-emerald-200 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{clipboardToast}</span>
        </div>
      )}

      {/* Top Floating AnyDesk / TeamViewer Toolbar */}
      <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 z-50 shadow-xl">
        {/* Left: Device Info & Latency Metrics */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex items-center gap-1.5">
              {remotePlatform === 'mac' ? <Apple className="w-4 h-4 text-slate-200" /> : <Monitor className="w-4 h-4 text-blue-400" />}
              <span className="font-bold text-sm text-white">{remoteAlias}</span>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {remoteDeskId}
            </span>
            <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Sem Aprovação
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
              <Wifi className="w-3.5 h-3.5" /> {ping} ms
            </span>
            <span>•</span>
            <span className="font-mono text-slate-300">{fps} FPS</span>
            <span>•</span>
            <span className="font-mono text-slate-300">{bitrate}</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> DTLS P2P
            </span>
          </div>
        </div>

        {/* Center: Remote Control Actions */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
          {/* CLIPBOARD SYNC DIRECT BUTTON */}
          <button
            onClick={handlePasteWindowsTextToRemote}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-sm"
            title="Copiar texto do seu notebook Windows e colar diretamente no Mac mini"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            <span>Colar do Windows (Ctrl+V)</span>
          </button>

          <button
            onClick={() => setShowClipboardPanel(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
              showClipboardPanel ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="Abrir Gerenciador de Área de Transferência"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clipboard Sync</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          <button
            onClick={sendCtrlAltDel}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition flex items-center gap-1"
            title="Enviar Ctrl + Alt + Del para a máquina remota"
          >
            <span>Ctrl+Alt+Del</span>
          </button>

          <button
            onClick={lockRemoteMachine}
            className={`px-2 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 ${
              isScreenLocked 
                ? 'bg-amber-600 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="Bloquear/Desbloquear tela remota"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          {/* Quality Selector */}
          <select
            value={qualityMode}
            onChange={(e) => setQualityMode(e.target.value as any)}
            className="bg-slate-900 text-slate-200 text-xs rounded-lg px-2 py-1 border border-slate-700 focus:outline-none cursor-pointer hidden sm:inline-block"
          >
            <option value="low_latency">⚡ 60 FPS (P2P)</option>
            <option value="balanced">⚖️ Equilibrado</option>
            <option value="high_quality">💎 HD Nativo</option>
          </select>
        </div>

        {/* Right Tools: File Transfer, Chat, Whiteboard, Disconnect */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenFileTransfer}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition"
            title="Transferência de Arquivos"
          >
            <FolderSync className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setShowChat(prev => !prev);
              setUnreadCount(0);
            }}
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition"
            title="Chat em tempo real"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowWhiteboard(prev => !prev)}
            className={`p-2 rounded-lg border transition ${
              showWhiteboard 
                ? 'bg-rose-600 text-white border-rose-500' 
                : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border-slate-700'
            }`}
            title="Anotações na tela"
          >
            <PenTool className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAudioMuted(prev => !prev)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title={isAudioMuted ? "Desmutar Áudio" : "Mutar Áudio"}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Tela Cheia"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm transition ml-1"
            title="Encerrar Sessão"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Encerrar</span>
          </button>
        </div>
      </div>

      {/* Main Remote Screen Area */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center">
        {/* Remote Screen Viewport Container */}
        <div 
          onMouseMove={handleScreenMouseMove}
          onClick={handleScreenClick}
          tabIndex={0}
          className="relative w-full h-full max-w-[1920px] max-h-[1080px] bg-slate-900 shadow-2xl flex flex-col overflow-hidden cursor-crosshair focus:outline-none"
        >
          {/* Real Screen Share Stream Video if active */}
          {stream ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isAudioMuted}
                className="w-full h-full object-contain pointer-events-none"
              />
              <div className="absolute top-3 left-3 bg-red-600/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 backdrop-blur-sm shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                TRANSMISSÃO AO VIVO DO MAC MINI / PC (60 FPS)
              </div>
            </div>
          ) : (
            /* Interactive Simulated Remote OS Desktop */
            <div className="w-full h-full relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
              {/* Desktop Wallpaper Texture & Watermark */}
              <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center">
                {remotePlatform === 'mac' ? (
                  <Apple className="w-96 h-96 text-white" />
                ) : (
                  <Monitor className="w-96 h-96 text-blue-400" />
                )}
              </div>

              {/* Top Menu Bar if macOS */}
              {remotePlatform === 'mac' ? (
                <div className="h-7 bg-slate-900/85 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between text-xs text-slate-200 z-20">
                  <div className="flex items-center gap-4">
                    <Apple className="w-4 h-4 text-white" />
                    <span className="font-bold">Finder</span>
                    <span className="text-slate-400">Arquivo</span>
                    <span className="text-slate-400">Editar</span>
                    <span className="text-slate-400">Visualizar</span>
                    <span className="text-slate-400">Ir</span>
                    <span className="text-slate-400">Janela</span>
                    <span className="text-slate-400">Ajuda</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Keyboard className="w-3.5 h-3.5" /> Teclado Windows Ativo
                    </span>
                    <span>•</span>
                    <span>100% [AC]</span>
                    <span>Wi-Fi (192.168.1.150)</span>
                    <span>10:45</span>
                  </div>
                </div>
              ) : (
                <div className="h-6 bg-slate-950/80 border-b border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400 z-20">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5 text-blue-400" />
                    <span>PC Gamer - Windows 11 Pro</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-emerald-400">● LAN: 192.168.1.200</span>
                  </div>
                </div>
              )}

              {/* Desktop Icons */}
              <div className="p-6 grid grid-flow-col auto-cols-max grid-rows-4 gap-6 z-10 w-fit">
                <button 
                  onClick={() => setActiveApp('notepad')}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 text-slate-200 text-xs w-24 transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-medium drop-shadow text-center">Bloco Notas</span>
                </button>

                <button 
                  onClick={() => setActiveApp('terminal')}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 text-slate-200 text-xs w-24 transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-md">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-medium drop-shadow text-center">
                    {remotePlatform === 'mac' ? 'Terminal zsh' : 'Prompt CMD'}
                  </span>
                </button>

                <button 
                  onClick={onOpenFileTransfer}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 text-slate-200 text-xs w-24 transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
                    <Folder className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-medium drop-shadow text-center">
                    {remotePlatform === 'mac' ? 'Finder' : 'Arquivos'}
                  </span>
                </button>

                <button 
                  onClick={() => setShowClipboardPanel(true)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 text-slate-200 text-xs w-24 transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                    <ArrowRightLeft className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-medium drop-shadow text-center">Clipboard Sync</span>
                </button>
              </div>

              {/* Active Window: Notepad / Text Editor */}
              {activeApp === 'notepad' && (
                <div className="absolute top-12 sm:top-14 left-10 sm:left-24 w-11/12 max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-20 flex flex-col">
                  <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span>{remotePlatform === 'mac' ? 'TextEdit - notas_compartilhadas.txt' : 'Bloco de Notas - notas.txt'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePasteWindowsTextToRemote}
                        className="text-[11px] px-2 py-0.5 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 rounded transition flex items-center gap-1"
                        title="Colar texto atual copiado do Windows"
                      >
                        <ClipboardCopy className="w-3 h-3" />
                        <span>Colar do Windows</span>
                      </button>
                      <button
                        onClick={handleCopyFromMacToWindows}
                        className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition flex items-center gap-1"
                        title="Copiar este conteúdo para o seu Windows"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copiar p/ Windows</span>
                      </button>
                      <button onClick={() => setActiveApp(null)} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400" />
                    </div>
                  </div>
                  <textarea
                    id="remote_notepad"
                    rows={8}
                    value={notepadContent}
                    onChange={(e) => setNotepadContent(e.target.value)}
                    placeholder="Digite diretamente no seu teclado do Windows ou cole o clipboard..."
                    className="w-full p-4 bg-slate-950 text-slate-200 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                  <div className="px-4 py-2 bg-slate-900 text-[11px] text-slate-400 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Keyboard className="w-3.5 h-3.5" /> Digitação via Teclado do Windows Ativa
                    </span>
                    <span>UTF-8 &bull; OmniDesk Clipboard Sync</span>
                  </div>
                </div>
              )}

              {/* Active Window: Terminal / CMD */}
              {activeApp === 'terminal' && (
                <div className="absolute top-12 sm:top-14 left-10 sm:left-24 w-11/12 max-w-xl bg-slate-950/95 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-20 flex flex-col">
                  <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span>{remotePlatform === 'mac' ? 'Terminal — zsh (Mac mini)' : 'Prompt de Comando (PC Gamer)'}</span>
                    </div>
                    <button 
                      onClick={() => setActiveApp(null)} 
                      className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400"
                    />
                  </div>
                  <div className="p-4 h-64 overflow-y-auto font-mono text-xs text-emerald-400 space-y-1 bg-black/85">
                    {terminalHistory.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap leading-relaxed">{line}</div>
                    ))}
                  </div>
                  <form onSubmit={handleTerminalSubmit} className="flex border-t border-slate-800 bg-slate-900">
                    <span className="px-3 py-2 text-xs font-mono text-emerald-400">$</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      placeholder="Digite comandos (ex: ls, pwd, ping, top, clear)..."
                      className="flex-1 bg-transparent px-1 py-2 text-xs font-mono text-white focus:outline-none placeholder-slate-600"
                    />
                    <button type="submit" className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono">
                      Executar
                    </button>
                  </form>
                </div>
              )}

              {/* Bottom OS Taskbar / Dock */}
              <div className="relative z-20">
                {remotePlatform === 'mac' ? (
                  /* macOS Centered Floating Dock */
                  <div className="pb-3 flex justify-center">
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/80 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-2xl">
                      <button 
                        onClick={() => setActiveApp('notepad')}
                        className="p-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 transition hover:scale-110"
                        title="TextEdit"
                      >
                        <FileText className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => setActiveApp('terminal')}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition hover:scale-110"
                        title="Terminal"
                      >
                        <Terminal className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={onOpenFileTransfer}
                        className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 transition hover:scale-110"
                        title="Finder"
                      >
                        <Folder className="w-6 h-6" />
                      </button>
                      <div className="h-6 w-px bg-slate-700 mx-1" />
                      <button 
                        onClick={handlePasteWindowsTextToRemote}
                        className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition hover:scale-110 shadow-sm"
                        title="Colar Clipboard do Windows no Mac mini"
                      >
                        <ClipboardCopy className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Windows Taskbar */
                  <div className="h-12 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveApp('notepad')}
                        className="p-2 rounded-lg hover:bg-slate-800 text-blue-400"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveApp('terminal')}
                        className="p-2 rounded-lg hover:bg-slate-800 text-emerald-400"
                      >
                        <Terminal className="w-4 h-4" />
                      </button>
                      <button
                        onClick={onOpenFileTransfer}
                        className="p-2 rounded-lg hover:bg-slate-800 text-amber-400"
                      >
                        <Folder className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handlePasteWindowsTextToRemote}
                        className="px-2.5 py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-xs font-bold flex items-center gap-1"
                      >
                        <ClipboardCopy className="w-3.5 h-3.5" />
                        <span>Colar Clipboard</span>
                      </button>
                    </div>
                    <div className="text-xs font-mono text-slate-400">10:45</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Privacy Black Screen Overlay */}
          {isBlackScreen && (
            <div className="absolute inset-0 bg-black z-30 flex flex-col items-center justify-center text-slate-500">
              <Layers className="w-12 h-12 mb-2 text-purple-400 animate-pulse" />
              <p className="text-sm font-semibold text-slate-300">Tela Remota em Modo Privacidade</p>
              <p className="text-xs text-slate-500">O usuário no computador físico está vendo apenas uma tela preta.</p>
            </div>
          )}

          {/* Locked Screen Overlay */}
          {isScreenLocked && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center text-slate-200">
              <Lock className="w-12 h-12 mb-3 text-amber-400" />
              <h3 className="text-base font-bold">Dispositivo Remoto Bloqueado</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">A sessão foi suspensa por motivos de segurança.</p>
              <button
                onClick={() => setIsScreenLocked(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
              >
                Desbloquear Sessão
              </button>
            </div>
          )}

          {/* Simulated Mouse Pointer & Wave click effect */}
          <div 
            className="absolute pointer-events-none transition-all duration-75 z-40"
            style={{ left: `${remoteMousePos.x}%`, top: `${remoteMousePos.y}%` }}
          >
            <div className="relative -top-1 -left-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 4L11 20L14 13L21 10L4 4Z" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5"/>
              </svg>
              <span className="absolute left-4 top-4 bg-red-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow">
                Notebook Windows
              </span>
            </div>
          </div>

          {clickWave && (
            <div 
              className="absolute pointer-events-none w-8 h-8 rounded-full border-2 border-red-500 animate-ping -translate-x-1/2 -translate-y-1/2 z-40"
              style={{ left: clickWave.x, top: clickWave.y }}
            />
          )}

          {/* Transparent Whiteboard Canvas Layer */}
          {showWhiteboard && (
            <div className="absolute inset-0 z-30 cursor-crosshair">
              <canvas
                ref={whiteboardCanvasRef}
                width={1920}
                height={1080}
                onMouseDown={handleWhiteboardMouseDown}
                onMouseMove={handleWhiteboardMouseMove}
                onMouseUp={handleWhiteboardMouseUp}
                className="w-full h-full"
              />
              <div className="absolute bottom-16 right-4 flex gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-700 shadow-xl">
                <button
                  onClick={clearWhiteboard}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setShowWhiteboard(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CLIPBOARD SYNC DRAWER / PANEL (WINDOWS <-> MAC MINI) */}
        {showClipboardPanel && (
          <div className="w-80 sm:w-96 h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-40 animate-slideLeft">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                <span>Sincronização de Área de Transferência</span>
              </div>
              <button 
                onClick={() => setShowClipboardPanel(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
              <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-3 space-y-1">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Sincronização Bidirecional Ativa
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Copie qualquer texto no seu Notebook Windows e transfira para o Mac mini instantaneamente com os botões abaixo ou pelo atalho <strong className="text-white">Ctrl + V</strong>.
                </p>
              </div>

              {/* Buffer text editor */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">Texto da Área de Transferência:</label>
                <textarea
                  id="clipboard_input"
                  rows={4}
                  value={localClipboardText}
                  onChange={(e) => setLocalClipboardText(e.target.value)}
                  placeholder="Cole ou digite aqui o texto que deseja enviar ao Mac mini..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handlePasteWindowsTextToRemote}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20"
                >
                  <ClipboardCopy className="w-4 h-4" />
                  <span>Enviar do Windows ➔ Mac mini</span>
                </button>

                <button
                  onClick={handleCopyFromMacToWindows}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold flex items-center justify-center gap-2 transition border border-slate-700"
                >
                  <Copy className="w-4 h-4 text-blue-400" />
                  <span>Capturar do Mac mini ➔ Windows</span>
                </button>
              </div>

              {/* Clipboard History */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
                  Histórico de Recortes Sincronizados:
                </span>
                <div className="space-y-1.5">
                  {clipboardHistory.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        setLocalClipboardText(item);
                        handlePasteWindowsTextToRemote();
                      }}
                      className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 cursor-pointer transition text-[11px] text-slate-300 truncate font-mono flex items-center justify-between group"
                    >
                      <span className="truncate">{item}</span>
                      <ClipboardCopy className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 flex-shrink-0 ml-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* In-Session Chat Slide-out Panel */}
        {showChat && (
          <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-40 animate-slideLeft">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>Chat com {remoteAlias}</span>
              </div>
              <button 
                onClick={() => setShowChat(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'local' ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-slate-500 mb-0.5">{msg.senderAlias}</span>
                  <div 
                    className={`p-2.5 rounded-xl max-w-[90%] leading-relaxed ${
                      msg.sender === 'local' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/60'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Send Input */}
            <form onSubmit={handleSendChat} className="p-2.5 border-t border-slate-800 flex gap-2 bg-slate-950">
              <input
                id="chat_input"
                type="text"
                value={newChatText}
                onChange={(e) => setNewChatText(e.target.value)}
                placeholder="Escreva uma mensagem..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
