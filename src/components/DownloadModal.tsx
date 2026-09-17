import React, { useState } from 'react';
import { 
  Monitor, 
  Apple, 
  Smartphone, 
  Download, 
  Check, 
  Copy, 
  X, 
  Terminal, 
  ShieldCheck, 
  Layers
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'windows' | 'mac' | 'android'>('windows');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const { install, isInstallable } = usePWAInstall();

  if (!isOpen) return null;

  const windowsCmd = `curl -sSL https://omni-desk.app/install.ps1 | powershell`;
  const macCmd = `curl -fsSL https://omni-desk.app/install-mac.sh | bash`;

  const copyScript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Compatibilidade Multiplataforma</h2>
              <p className="text-xs text-slate-400">Windows, macOS e Android com o mesmo protocolo de baixa latência</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-2">
          <button
            onClick={() => setActiveTab('windows')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'windows'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Windows (10 / 11)
          </button>
          <button
            onClick={() => setActiveTab('mac')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'mac'
                ? 'border-slate-200 text-white bg-slate-700/30 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Apple className="w-4 h-4" />
            macOS (Apple Silicon & Intel)
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'android'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Android (Mobile & Tablet)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {activeTab === 'windows' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-200 text-xs leading-relaxed">
                <strong>100% Compatível com Windows:</strong> Funciona nativamente no seu navegador (Chrome, Edge) via WebRTC de alta performance e pode ser instalado como aplicativo de desktop autônomo com suporte a teclas de sistema (Ctrl+Alt+Del, Alt+Tab).
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Opção 1: Aplicativo Desktop Autônomo (PWA / Windows Native)
                </h4>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white text-xs">Instalação Direta no Windows</p>
                    <p className="text-xs text-slate-400">Adiciona ícone à Área de Trabalho e Barra de Tarefas com aceleração por hardware GPU.</p>
                  </div>
                  <button
                    onClick={() => install()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition"
                  >
                    Instalar no PC
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  Opção 2: Agente em Segundo Plano (PowerShell CLI)
                </h4>
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                  <span className="truncate mr-2">{windowsCmd}</span>
                  <button
                    onClick={() => copyScript(windowsCmd)}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  >
                    {copiedCmd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mac' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-slate-200 text-xs leading-relaxed">
                <strong>macOS Apple Silicon (M1/M2/M3/M4) & Intel:</strong> Suporte completo a tela retina, comandos Cmd / Option e transmissão de som com baixa latência pelo protocolo WebRTC.
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Configuração de Permissões no macOS:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <li>Abra <strong>Ajustes do Sistema</strong> no seu Mac.</li>
                  <li>Acesse <strong>Privacidade e Segurança</strong> → <strong>Gravação de Tela</strong>.</li>
                  <li>Ative a permissão para o <strong>OmniDesk / Navegador</strong> para permitir transmissão de tela em tempo real.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-300" />
                  Terminal do Mac (Instalador rápido):
                </h4>
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                  <span className="truncate mr-2">{macCmd}</span>
                  <button
                    onClick={() => copyScript(macCmd)}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  >
                    {copiedCmd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 text-xs leading-relaxed">
                <strong>Suporte Total a Android:</strong> Controle computadores Windows/Mac a partir do seu smartphone ou tablet Android com gestos de toque, zoom com pinça e teclado virtual.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="font-semibold text-white text-xs mb-1">Modo Visualizador (Controlador)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Abra o OmniDesk no Chrome do Android, insira o ID de 9 dígitos do computador e controle o PC remotamente como se estivesse sentado na frente dele.
                  </p>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="font-semibold text-white text-xs mb-1">Modo Transmissor (Host Móvel)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Clique em &quot;Transmitir Tela&quot; no Android para compartilhar a tela do seu celular com o técnico em caso de suporte de TI mobile.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">Adicionar à Tela Inicial do Android (PWA)</span>
                <button
                  onClick={() => install()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                >
                  Instalar no Android
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-between items-center text-xs text-slate-400">
          <span>Criptografia de ponta a ponta ChaCha20-Poly1305 / AES-256</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
