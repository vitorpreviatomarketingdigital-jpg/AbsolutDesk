import React, { useState } from 'react';
import { 
  Monitor, 
  Apple, 
  Smartphone, 
  Copy, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  Key, 
  Radio, 
  Cast, 
  Play, 
  Sparkles, 
  Clock, 
  Star, 
  Share2, 
  QrCode,
  Laptop,
  AlertCircle,
  Zap,
  Globe,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Server,
  Terminal,
  ClipboardCopy
} from 'lucide-react';
import { PlatformType, SavedDevice } from '../types';
import { formatDeskId } from '../utils/totp';

interface MainDeskDashboardProps {
  myDeskId: string;
  myAlias: string;
  onUpdateAlias: (newAlias: string) => void;
  myPlatform: PlatformType;
  myLocalIp: string;
  onUpdateLocalIp: (ip: string) => void;
  unattendedPassword: string;
  onUpdateUnattendedPassword: (password: string) => void;
  allowUnattendedAccess: boolean;
  onUpdateAllowUnattendedAccess: (allow: boolean) => void;
  is2FAEnabled: boolean;
  onOpen2FAModal: () => void;
  onConnectToRemote: (targetIdOrIp: string, unattendedPassword?: string, twoFactorCode?: string) => void;
  onStartRealScreenShare: () => void;
  isSharingRealScreen: boolean;
  onStartSimulatedSession: (platform: PlatformType, alias?: string, ip?: string) => void;
  isConnecting: boolean;
  connectionError: string;
}

export const MainDeskDashboard: React.FC<MainDeskDashboardProps> = ({
  myDeskId,
  myAlias,
  onUpdateAlias,
  myPlatform,
  myLocalIp,
  onUpdateLocalIp,
  unattendedPassword,
  onUpdateUnattendedPassword,
  allowUnattendedAccess,
  onUpdateAllowUnattendedAccess,
  is2FAEnabled,
  onOpen2FAModal,
  onConnectToRemote,
  onStartRealScreenShare,
  isSharingRealScreen,
  onStartSimulatedSession,
  isConnecting,
  connectionError,
}) => {
  // Mode toggle: Are we configuring this machine as Host (Mac mini / PC Gamer) or Controller (Notebook Windows)?
  const [deviceRole, setDeviceRole] = useState<'client' | 'host'>('client');

  // Input states for connecting
  const [remoteInput, setRemoteInput] = useState('');
  const [remotePasswordInput, setRemotePasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  // Editing host settings
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState(myAlias);
  const [editingIp, setEditingIp] = useState(false);
  const [ipInput, setIpInput] = useState(myLocalIp);
  const [editingPassword, setEditingPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState(unattendedPassword || 'macmini2026');

  // Add new device modal / state
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceIp, setNewDeviceIp] = useState('');
  const [newDevicePassword, setNewDevicePassword] = useState('');
  const [newDevicePlatform, setNewDevicePlatform] = useState<PlatformType>('windows');

  // Pre-configured hosts exactly matching user's architecture:
  // Mac mini (Host) and PC Gamer (Host) to be controlled by 2 Notebooks
  const [savedHosts, setSavedHosts] = useState<SavedDevice[]>([
    {
      id: 'host_macmini',
      deskId: '419 882 005',
      ipAddress: '192.168.1.150',
      alias: 'Mac mini (Apple M-Series / macOS)',
      platform: 'mac',
      lastConnected: 'Hoje, 10:20',
      isFavorite: true,
      isOnline: true,
      ping: 8,
      unattendedPassword: 'macmini2026',
      isUnattended: true,
      role: 'host',
    },
    {
      id: 'host_pcgamer',
      deskId: '782 194 032',
      ipAddress: '192.168.1.200',
      alias: 'PC Gamer (Windows 11 Pro - Host)',
      platform: 'windows',
      lastConnected: 'Ontem, 21:45',
      isFavorite: true,
      isOnline: true,
      ping: 6,
      unattendedPassword: 'gamer2026',
      isUnattended: true,
      role: 'host',
    },
    {
      id: 'client_notebook2',
      deskId: '993 124 551',
      ipAddress: '192.168.1.180',
      alias: 'Notebook Windows 2 (Secundário)',
      platform: 'windows',
      lastConnected: '15/09/2026',
      isFavorite: false,
      isOnline: true,
      ping: 12,
      unattendedPassword: 'note2026',
      isUnattended: true,
      role: 'client',
    },
  ]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(myDeskId.replace(/\s+/g, ''));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyIp = () => {
    navigator.clipboard.writeText(myLocalIp);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const handleSaveAlias = () => {
    if (aliasInput.trim()) {
      onUpdateAlias(aliasInput.trim());
    }
    setEditingAlias(false);
  };

  const handleSaveIp = () => {
    if (ipInput.trim()) {
      onUpdateLocalIp(ipInput.trim());
    }
    setEditingIp(false);
  };

  const handleSavePassword = () => {
    onUpdateUnattendedPassword(passwordInput.trim());
    setEditingPassword(false);
  };

  // Direct Unattended Connection by IP or Desk ID + Password
  const handleDirectConnect = (target: string, pass: string) => {
    if (!target.trim()) {
      alert('Por favor, informe o IP ou Desk ID do computador a ser acessado.');
      return;
    }
    onConnectToRemote(target.trim(), pass.trim());
  };

  const handleAddCustomHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim() || !newDeviceIp.trim()) return;

    const newHost: SavedDevice = {
      id: `custom_${Date.now()}`,
      deskId: '100 ' + Math.floor(100000 + Math.random() * 900000).toString().replace(/(\d{3})(\d{3})/, '$1 $2'),
      ipAddress: newDeviceIp.trim(),
      alias: newDeviceName.trim(),
      platform: newDevicePlatform,
      lastConnected: 'Adicionado agora',
      isFavorite: true,
      isOnline: true,
      ping: 10,
      unattendedPassword: newDevicePassword.trim(),
      isUnattended: true,
      role: 'host',
    };

    setSavedHosts(prev => [newHost, ...prev]);
    setShowAddDeviceModal(false);
    setNewDeviceName('');
    setNewDeviceIp('');
    setNewDevicePassword('');
  };

  const handleDeleteHost = (id: string) => {
    setSavedHosts(prev => prev.filter(h => h.id !== id));
  };

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'mac': return <Apple className="w-4 h-4 text-slate-100" />;
      case 'android': return <Smartphone className="w-4 h-4 text-emerald-400" />;
      default: return <Monitor className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 animate-fadeIn">
      {/* Topology Header & Role Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 to-red-800 border border-red-500/50 flex items-center justify-center text-white shadow-lg shadow-red-900/30 flex-shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Acesso Remoto Direto (Mac mini & PC Gamer)</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                Sem Aprovação Manual
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Conecte seus notebooks Windows ao Mac mini e PC Gamer inserindo apenas o IP e a Senha.
            </p>
          </div>
        </div>

        {/* Quick Mode Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-stretch sm:self-auto">
          <button
            onClick={() => setDeviceRole('client')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              deviceRole === 'client'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Notebook Windows (Controlador)</span>
          </button>
          <button
            onClick={() => setDeviceRole('host')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              deviceRole === 'host'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Mac mini / PC Gamer (Host)</span>
          </button>
        </div>
      </div>

      {/* Main Dual Cards: Host Setup vs Remote Connect */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: CONECTAR A COMPUTADOR REMOTO (NOTEBOOK WINDOWS -> MAC MINI / PC GAMER) */}
        <div className={`bg-slate-900 border rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden transition ${
          deviceRole === 'client' ? 'border-red-600/60 ring-1 ring-red-600/30' : 'border-slate-800'
        }`}>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <Cast className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Acessar Computador Remoto</h3>
                  <p className="text-xs text-slate-400">Controle o Mac mini ou PC Gamer sem aprovação no host</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                Direto por Senha
              </span>
            </div>

            {/* Direct Connect Form (IP + Password) */}
            <div className="space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              {/* Target IP or Desk ID */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Endereço IP ou Desk ID:</span>
                  <span className="text-[10px] text-slate-500 font-normal">Ex: 192.168.1.150 ou 419 882 005</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={remoteInput}
                    onChange={(e) => setRemoteInput(e.target.value)}
                    placeholder="192.168.1.150 ou 419 882 005"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>

              {/* Unattended Access Password */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Senha de Acesso Direto do Host:</span>
                  <span className="text-[10px] text-emerald-400 font-normal">Sem confirmação no Mac mini</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={remotePasswordInput}
                    onChange={(e) => setRemotePasswordInput(e.target.value)}
                    placeholder="Digite a senha configurada no host"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Direct Connect Action Button */}
              <button
                onClick={() => handleDirectConnect(remoteInput, remotePasswordInput)}
                disabled={isConnecting}
                className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 text-sm"
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <Radio className="w-4 h-4 animate-spin" /> Conectando ao host...
                  </span>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Conectar Imediatamente (Sem Aprovação)</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              {connectionError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{connectionError}</span>
                </div>
              )}
            </div>

            {/* Quick Access to Target Profiles */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Conexão Rápida com 1 Clique (Pré-configurada):
              </span>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setRemoteInput('192.168.1.150');
                    setRemotePasswordInput('macmini2026');
                    handleDirectConnect('192.168.1.150', 'macmini2026');
                  }}
                  className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-600 rounded-xl text-left transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Apple className="w-5 h-5 text-slate-100" />
                    <span className="text-[10px] font-mono text-emerald-400">8ms</span>
                  </div>
                  <p className="font-bold text-xs text-white group-hover:text-red-400 transition">Mac mini</p>
                  <p className="text-[10px] font-mono text-slate-400">192.168.1.150</p>
                  <span className="text-[9px] text-emerald-400 mt-1 block">Acessar sem aprovação &rarr;</span>
                </button>

                <button
                  onClick={() => {
                    setRemoteInput('192.168.1.200');
                    setRemotePasswordInput('gamer2026');
                    handleDirectConnect('192.168.1.200', 'gamer2026');
                  }}
                  className="p-3 bg-slate-950 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-700/60 rounded-xl text-left transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Monitor className="w-5 h-5 text-blue-400" />
                    <span className="text-[10px] font-mono text-emerald-400">6ms</span>
                  </div>
                  <p className="font-bold text-xs text-white group-hover:text-blue-300 transition">PC Gamer</p>
                  <p className="text-[10px] font-mono text-slate-400">192.168.1.200</p>
                  <span className="text-[9px] text-blue-400 mt-1 block">Acessar sem aprovação &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: ESTE DISPOSITIVO (HOST / SERVIDOR: MAC MINI OU PC GAMER) */}
        <div className={`bg-slate-900 border rounded-2xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden transition ${
          deviceRole === 'host' ? 'border-blue-600/60 ring-1 ring-blue-600/30' : 'border-slate-800'
        }`}>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Este Computador (Host)</h3>
                  <p className="text-xs text-slate-400">Informações para os notebooks Windows se conectarem a ele</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Online &bull; Pronto
              </span>
            </div>

            {/* Address Box: IP Local e Desk ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* IP Local */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 relative">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Endereço IP Local (LAN)
                </span>
                {editingIp ? (
                  <div className="flex items-center gap-1.5 my-1">
                    <input
                      type="text"
                      value={ipInput}
                      onChange={(e) => setIpInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs text-white font-mono"
                    />
                    <button onClick={handleSaveIp} className="text-xs text-emerald-400 font-bold hover:underline">
                      Salvar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between my-1">
                    <span className="font-mono text-base font-bold text-white">{myLocalIp}</span>
                    <button
                      onClick={() => setEditingIp(true)}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      Editar
                    </button>
                  </div>
                )}
                <button
                  onClick={handleCopyIp}
                  className="mt-2 text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {copiedIp ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">IP Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar IP</span>
                    </>
                  )}
                </button>
              </div>

              {/* Desk ID */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 relative">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  AnyDesk ID (Relay)
                </span>
                <div className="font-mono text-base font-bold text-white my-1 tracking-wider">
                  {myDeskId}
                </div>
                <button
                  onClick={handleCopyId}
                  className="mt-2 text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">ID Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Unattended Access Security Controls */}
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              {/* Switch Acesso Não Supervisionado */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Acesso Sem Aprovação Manual (Host Autônomo)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Permitir que o notebook conecte com a senha sem que ninguém precise aprovar no Mac mini
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowUnattendedAccess}
                    onChange={(e) => onUpdateAllowUnattendedAccess(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Password for Unattended Access */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Senha de Acesso Direto:</span>
                  <p className="text-[10px] text-slate-500">Usada pelo notebook Windows para entrar direto</p>
                </div>
                {editingPassword ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs text-white"
                    />
                    <button onClick={handleSavePassword} className="text-emerald-400 hover:underline text-xs font-bold">
                      Salvar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-slate-200">
                      {unattendedPassword || 'macmini2026'}
                    </span>
                    <button
                      onClick={() => setEditingPassword(true)}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Alterar
                    </button>
                  </div>
                )}
              </div>

              {/* Live Real Screen Capture Action */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Captura de Vídeo da Tela:</span>
                <button
                  onClick={onStartRealScreenShare}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    isSharingRealScreen
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                  }`}
                >
                  <Cast className="w-3.5 h-3.5" />
                  <span>{isSharingRealScreen ? 'Transmitindo Tela Real' : 'Transmitir Tela Deste PC'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Book & Configured Hardware Topology */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Computadores Cadastrados (Topologia do Usuário)</h3>
              <p className="text-xs text-slate-400">Acesse o Mac mini, o PC Gamer ou seus notebooks com 1 clique</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddDeviceModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Novo Computador</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {savedHosts.map((device) => (
            <div
              key={device.id}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 flex flex-col justify-between gap-3 transition group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      {getPlatformIcon(device.platform)}
                    </div>
                    <span className="font-bold text-xs text-white group-hover:text-red-400 transition truncate">
                      {device.alias}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {device.ping}ms
                  </span>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/70 space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">IP:</span>
                    <span className="font-bold">{device.ipAddress}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="text-slate-500">Desk ID:</span>
                    <span>{device.deskId}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="text-slate-500">Acesso:</span>
                    <span className="text-emerald-400 text-[10px]">Sem Aprovação (Autônomo)</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    handleDirectConnect(device.ipAddress || device.deskId, device.unattendedPassword || 'macmini2026');
                  }}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Acessar Agora</span>
                </button>
                <button
                  onClick={() => handleDeleteHost(device.id)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg border border-slate-800 transition"
                  title="Remover computador da lista"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom Device Modal */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-red-400" />
                Adicionar Computador à Rede
              </h3>
              <button
                onClick={() => setShowAddDeviceModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomHost} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Nome / Apelido:</label>
                <input
                  type="text"
                  required
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="Ex: Notebook 2 Trabalho ou Servidor Mac"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Endereço IP na Rede Local (LAN):</label>
                <input
                  type="text"
                  required
                  value={newDeviceIp}
                  onChange={(e) => setNewDeviceIp(e.target.value)}
                  placeholder="Ex: 192.168.1.180"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Senha de Acesso Direto (Host):</label>
                <input
                  type="password"
                  value={newDevicePassword}
                  onChange={(e) => setNewDevicePassword(e.target.value)}
                  placeholder="Senha configurada para acesso sem aprovação"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Sistema Operacional:</label>
                <select
                  value={newDevicePlatform}
                  onChange={(e) => setNewDevicePlatform(e.target.value as PlatformType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="mac">macOS (Mac mini / MacBook)</option>
                  <option value="windows">Windows 11 / 10</option>
                  <option value="android">Android</option>
                  <option value="linux">Linux</option>
                </select>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition shadow-lg shadow-red-600/30"
                >
                  Salvar Computador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
