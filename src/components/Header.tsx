import React from 'react';
import { 
  Monitor, 
  Smartphone, 
  Apple, 
  ShieldCheck, 
  Download, 
  Settings, 
  Radio, 
  Globe
} from 'lucide-react';
import { PlatformType } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  currentPlatform: PlatformType;
  onSelectPlatform: (platform: PlatformType) => void;
  is2FAEnabled: boolean;
  onOpen2FAModal: () => void;
  onOpenDownloadModal: () => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPlatform,
  onSelectPlatform,
  is2FAEnabled,
  onOpen2FAModal,
  onOpenDownloadModal,
  isOnline,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/30 text-white font-bold text-lg tracking-wider">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">OmniDesk</h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/60">
                AnyDesk & TeamViewer Pro
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isOnline ? 'Pronto para conexões' : 'Conectando ao servidor...'}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-mono">TLS 1.3 DTLS-SRTP</span>
            </div>
          </div>
        </div>

        {/* Center: Multiplatform Selector */}
        <div className="hidden md:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
          <span className="px-2 text-slate-500 font-medium flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" /> SO Ativo:
          </span>
          <button
            onClick={() => onSelectPlatform('windows')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              currentPlatform === 'windows'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Windows
          </button>
          <button
            onClick={() => onSelectPlatform('mac')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              currentPlatform === 'mac'
                ? 'bg-slate-200 text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            macOS
          </button>
          <button
            onClick={() => onSelectPlatform('android')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              currentPlatform === 'android'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Android
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          {isInstallable && !isInstalled && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition"
              title="Instalar OmniDesk como aplicativo desktop/móvel"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {/* 2FA Security Pill Button */}
          <button
            onClick={onOpen2FAModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              is2FAEnabled
                ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 border-amber-700/80 text-amber-300 hover:bg-amber-900/50'
            }`}
            title="Configurar Autenticação de Dois Fatores (2FA)"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{is2FAEnabled ? '2FA Ativo' : 'Ativar 2FA'}</span>
          </button>

          {/* Download Native Agent / Client */}
          <button
            onClick={onOpenDownloadModal}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clientes OS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
