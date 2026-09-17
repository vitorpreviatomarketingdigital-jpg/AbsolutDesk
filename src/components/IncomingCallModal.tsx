import React, { useState } from 'react';
import { 
  Monitor, 
  Apple, 
  Smartphone, 
  ShieldCheck, 
  MousePointer, 
  Keyboard, 
  FolderSync, 
  Clipboard, 
  Volume2, 
  Video, 
  Check, 
  X,
  Radio
} from 'lucide-react';
import { PlatformType, SessionPermissions } from '../types';

interface IncomingCallModalProps {
  isOpen: boolean;
  fromDeskId: string;
  fromAlias: string;
  fromPlatform: PlatformType;
  onAccept: (permissions: SessionPermissions) => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  fromDeskId,
  fromAlias,
  fromPlatform,
  onAccept,
  onReject,
}) => {
  const [permissions, setPermissions] = useState<SessionPermissions>({
    allowMouse: true,
    allowKeyboard: true,
    allowFileTransfer: true,
    allowClipboard: true,
    allowAudio: true,
    allowRecording: true,
  });

  if (!isOpen) return null;

  const togglePermission = (key: keyof SessionPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'mac': return <Apple className="w-5 h-5 text-slate-200" />;
      case 'android': return <Smartphone className="w-5 h-5 text-emerald-400" />;
      default: return <Monitor className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-red-500/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 flex flex-col animate-scaleUp">
        {/* Urgent Header Banner */}
        <div className="bg-gradient-to-r from-red-700 via-rose-600 to-red-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 animate-ping" />
            <span className="font-bold text-sm uppercase tracking-wider">Solicitação de Acesso Remoto</span>
          </div>
          <span className="text-xs bg-red-950/60 px-2 py-0.5 rounded-full font-mono border border-red-400/40">
            AnyDesk Protocol
          </span>
        </div>

        {/* Remote Caller Info */}
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-md">
              {getPlatformIcon(fromPlatform)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Origem da Conexão:</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {fromPlatform}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">{fromAlias}</h3>
              <p className="text-xs font-mono text-emerald-400 tracking-wider">ID: {fromDeskId}</p>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Permissões a Conceder ao Conectado:
            </h4>
            <p className="text-[11px] text-slate-500">
              Você pode desmarcar qualquer item para restringir ações do operador.
            </p>
          </div>

          {/* Permissions Toggles Grid */}
          <div className="space-y-2">
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition">
              <div className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
                <MousePointer className="w-4 h-4 text-blue-400" />
                <span>Controle de Mouse e Ponteiro</span>
              </div>
              <input 
                type="checkbox" 
                checked={permissions.allowMouse} 
                onChange={() => togglePermission('allowMouse')}
                className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-600 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition">
              <div className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
                <Keyboard className="w-4 h-4 text-blue-400" />
                <span>Teclado & Atalhos de Sistema</span>
              </div>
              <input 
                type="checkbox" 
                checked={permissions.allowKeyboard} 
                onChange={() => togglePermission('allowKeyboard')}
                className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-600 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition">
              <div className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
                <FolderSync className="w-4 h-4 text-amber-400" />
                <span>Transferência de Arquivos</span>
              </div>
              <input 
                type="checkbox" 
                checked={permissions.allowFileTransfer} 
                onChange={() => togglePermission('allowFileTransfer')}
                className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-600 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition">
              <div className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
                <Clipboard className="w-4 h-4 text-purple-400" />
                <span>Sincronizar Área de Transferência (Clipboard)</span>
              </div>
              <input 
                type="checkbox" 
                checked={permissions.allowClipboard} 
                onChange={() => togglePermission('allowClipboard')}
                className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-600 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition">
              <div className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Transmitir Áudio do Computador</span>
              </div>
              <input 
                type="checkbox" 
                checked={permissions.allowAudio} 
                onChange={() => togglePermission('allowAudio')}
                className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-600 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-200 border border-slate-700 hover:border-red-700 font-semibold text-sm transition"
          >
            <X className="w-4 h-4" />
            Recusar
          </button>
          <button
            onClick={() => onAccept(permissions)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition animate-pulse"
          >
            <Check className="w-5 h-5" />
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
};
