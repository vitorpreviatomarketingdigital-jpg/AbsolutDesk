import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  ShieldCheck, 
  Key, 
  QrCode, 
  Copy, 
  Check, 
  X, 
  Lock, 
  RefreshCw, 
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { calculateTOTP, getOtpAuthUrl } from '../utils/totp';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  secret: string;
  onSave2FA: (enabled: boolean, newSecret: string, unattendedPassword?: string) => void;
  deskId: string;
  unattendedPassword?: string;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  onClose,
  isEnabled,
  secret,
  onSave2FA,
  deskId,
  unattendedPassword = '',
}) => {
  const [enabled, setEnabled] = useState(isEnabled);
  const [currentSecret, setCurrentSecret] = useState(secret);
  const [inputCode, setInputCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [password, setPassword] = useState(unattendedPassword);
  const [copied, setCopied] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state when props change
  useEffect(() => {
    setEnabled(isEnabled);
    setCurrentSecret(secret);
    setPassword(unattendedPassword);
  }, [isEnabled, secret, unattendedPassword, isOpen]);

  // Update live simulated TOTP code & countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const updateCode = async () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setSecondsRemaining(remaining);
      const code = await calculateTOTP(currentSecret);
      setSimulatedCode(code);
    };

    updateCode();
    interval = setInterval(updateCode, 1000);
    return () => clearInterval(interval);
  }, [currentSecret]);

  // Generate QR Code
  useEffect(() => {
    if (isOpen && canvasRef.current && currentSecret) {
      const otpUrl = getOtpAuthUrl(currentSecret, `OmniDesk (${deskId})`);
      QRCode.toCanvas(canvasRef.current, otpUrl, {
        width: 180,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch(err => console.error('QR code error', err));
    }
  }, [isOpen, currentSecret, deskId]);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    navigator.clipboard.writeText(currentSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyAndSave = async () => {
    if (enabled) {
      // Validate 6-digit code matches current or adjacent window
      const code0 = await calculateTOTP(currentSecret, 0);
      const codeMinus1 = await calculateTOTP(currentSecret, -1);
      const codePlus1 = await calculateTOTP(currentSecret, 1);

      if (inputCode.trim() === code0 || inputCode.trim() === codeMinus1 || inputCode.trim() === codePlus1 || inputCode.trim() === simulatedCode) {
        setVerificationError('');
        setVerifiedSuccess(true);
        setTimeout(() => {
          onSave2FA(true, currentSecret, password);
          onClose();
        }, 800);
      } else {
        setVerificationError('Código de 6 dígitos inválido ou expirado. Tente novamente.');
      }
    } else {
      onSave2FA(false, currentSecret, password);
      onClose();
    }
  };

  const handleGenerateNewSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let s = '';
    for (let i = 0; i < 16; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    setCurrentSecret(s);
    setVerificationError('');
    setVerifiedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Segurança & Autenticação 2FA</h2>
              <p className="text-xs text-slate-400">Padrão AnyDesk / TeamViewer TOTP RFC 6238</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Toggle Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div>
              <div className="font-semibold text-white flex items-center gap-2">
                <span>Exigir Código 2FA ao Conectar</span>
                {enabled && (
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                    Ativado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Qualquer dispositivo remoto precisará inserir o token dinâmico de 6 dígitos do seu app autenticador.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={enabled} 
                onChange={(e) => setEnabled(e.target.checked)} 
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Unattended Access Password */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <label className="font-semibold text-white flex items-center gap-2 text-xs">
              <Lock className="w-4 h-4 text-blue-400" />
              Senha de Acesso Não Supervisionado (Opcional)
            </label>
            <input 
              type="password"
              placeholder="Digite uma senha forte para acesso autônomo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400">
              Permite conectar a este dispositivo sem necessidade de confirmação manual na tela do host.
            </p>
          </div>

          {/* 2FA QR Code and Setup Section */}
          {enabled && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  1. Escanear no Google Authenticator ou Authy
                </span>
                <button
                  onClick={handleGenerateNewSecret}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Gerar nova chave
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                {/* QR Code Canvas */}
                <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl shadow-inner">
                  <canvas ref={canvasRef} className="rounded-lg" />
                  <span className="text-[10px] text-slate-600 mt-1 font-semibold">QR Code TOTP</span>
                </div>

                {/* Secret Key and Simulator */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Chave Manual (Base32):</label>
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg">
                      <code className="text-xs font-mono text-emerald-400 tracking-wider select-all flex-1">
                        {currentSecret}
                      </code>
                      <button
                        onClick={handleCopySecret}
                        className="p-1 text-slate-400 hover:text-white rounded"
                        title="Copiar Chave"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Simulator for immediate testing without phone */}
                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Token Atual (Simulador):</span>
                      <span className="text-emerald-400 font-mono font-bold">{secondsRemaining}s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-lg font-bold tracking-widest text-white bg-slate-950 px-3 py-1 rounded border border-slate-800">
                        {simulatedCode}
                      </div>
                      <button
                        onClick={() => setInputCode(simulatedCode)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 px-2.5 py-1.5 rounded font-medium transition"
                      >
                        Auto-preencher
                      </button>
                    </div>
                    {/* Progress countdown bar */}
                    <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-1000"
                        style={{ width: `${(secondsRemaining / 30) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Input */}
              <div className="space-y-2">
                <label className="font-semibold text-xs text-slate-300 block">
                  2. Digite o código de 6 dígitos gerado pelo seu app para confirmar:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value.replace(/\D/g, ''));
                      setVerificationError('');
                    }}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-center text-lg font-mono font-bold tracking-widest text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleVerifyAndSave}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-lg text-sm transition flex items-center gap-2"
                  >
                    {verifiedSuccess ? <Check className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    Confirmar
                  </button>
                </div>
                {verificationError && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {verificationError}
                  </p>
                )}
                {verifiedSuccess && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                    <Check className="w-3.5 h-3.5" />
                    2FA autenticado com sucesso! Salvando...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleVerifyAndSave}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-lg shadow-sm transition"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};
