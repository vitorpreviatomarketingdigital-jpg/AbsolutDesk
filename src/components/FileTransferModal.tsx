import React, { useState } from 'react';
import { 
  FolderSync, 
  Upload, 
  Download, 
  File, 
  Folder, 
  Check, 
  X, 
  Trash2, 
  HardDrive, 
  Laptop,
  ArrowRight
} from 'lucide-react';
import { RemoteFile, FileTransferJob } from '../types';

interface FileTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  remoteDeskId: string;
  remoteAlias: string;
  onSendFileToRemote: (file: File) => void;
}

export const FileTransferModal: React.FC<FileTransferModalProps> = ({
  isOpen,
  onClose,
  remoteDeskId,
  remoteAlias,
  onSendFileToRemote,
}) => {
  const [localFiles] = useState<RemoteFile[]>([
    { name: 'Relatorio_Tecnico_2026.pdf', size: 2450000, type: 'file', modified: 'Hoje, 10:14' },
    { name: 'Backup_Config_System.zip', size: 18900000, type: 'file', modified: 'Ontem, 16:30' },
    { name: 'Script_Atualizacao_Rede.bat', size: 14200, type: 'file', modified: '15/09/2026' },
    { name: 'Pasta_Documentos_Trabalho', size: 0, type: 'folder', modified: '12/09/2026' },
  ]);

  const [remoteFiles, setRemoteFiles] = useState<RemoteFile[]>([
    { name: 'Windows_Logs_Diagnostico.evtx', size: 5400000, type: 'file', modified: 'Hoje, 09:20' },
    { name: 'AnyDesk_Config_Profile.xml', size: 84000, type: 'file', modified: 'Hoje, 08:15' },
    { name: 'Arquivos_de_Programas', size: 0, type: 'folder', modified: '01/08/2026' },
    { name: 'Hosts_Backup.txt', size: 4200, type: 'file', modified: '10/09/2026' },
  ]);

  const [activeTransfers, setActiveTransfers] = useState<FileTransferJob[]>([]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newJob: FileTransferJob = {
        id: `job_${Date.now()}`,
        name: file.name,
        size: file.size,
        progress: 0,
        direction: 'upload',
        status: 'transferring',
      };

      setActiveTransfers(prev => [newJob, ...prev]);

      // Call parent hook
      onSendFileToRemote(file);

      // Simulate real progress animation
      let p = 0;
      const interval = setInterval(() => {
        p += 20;
        if (p >= 100) {
          p = 100;
          clearInterval(interval);
          setActiveTransfers(prev => 
            prev.map(j => j.id === newJob.id ? { ...j, progress: 100, status: 'completed' } : j)
          );
          // Add to remote folder
          setRemoteFiles(prev => [
            { name: file.name, size: file.size, type: 'file', modified: 'Agora mesmo' },
            ...prev
          ]);
        } else {
          setActiveTransfers(prev => 
            prev.map(j => j.id === newJob.id ? { ...j, progress: p } : j)
          );
        }
      }, 300);
    }
  };

  const handleDownloadRemoteFile = (file: RemoteFile) => {
    const newJob: FileTransferJob = {
      id: `job_${Date.now()}`,
      name: file.name,
      size: file.size,
      progress: 0,
      direction: 'download',
      status: 'transferring',
    };

    setActiveTransfers(prev => [newJob, ...prev]);

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setActiveTransfers(prev => 
          prev.map(j => j.id === newJob.id ? { ...j, progress: 100, status: 'completed' } : j)
        );
      } else {
        setActiveTransfers(prev => 
          prev.map(j => j.id === newJob.id ? { ...j, progress: p } : j)
        );
      }
    }, 250);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '--';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Transferência de Arquivos AnyDesk</h2>
              <p className="text-xs text-slate-400">
                Sincronização P2P de arquivos entre seu computador e {remoteAlias} ({remoteDeskId})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-Pane File Browser */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 flex-1 overflow-hidden">
          {/* Local Machine Files */}
          <div className="p-4 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Laptop className="w-4 h-4 text-blue-400" />
                <span>Este Computador (Local)</span>
              </div>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                Enviar Arquivo Real
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg mb-2 border border-slate-800 truncate">
              C:\Users\User\Documents\
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {localFiles.map((file, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 text-xs transition"
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    {file.type === 'folder' ? (
                      <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="truncate text-slate-200">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-shrink-0">
                    <span>{formatBytes(file.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Remote Machine Files */}
          <div className="p-4 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Computador Remoto ({remoteAlias})</span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                Conectado (Leitura/Escrita)
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg mb-2 border border-slate-800 truncate">
              C:\OmniDesk_Shared\
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {remoteFiles.map((file, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 text-xs transition group"
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    {file.type === 'folder' ? (
                      <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="truncate text-slate-200">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-shrink-0">
                    <span>{formatBytes(file.size)}</span>
                    {file.type === 'file' && (
                      <button
                        onClick={() => handleDownloadRemoteFile(file)}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-emerald-400 transition"
                        title="Baixar para o meu computador"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transfer Queue Status */}
        {activeTransfers.length > 0 && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 max-h-36 overflow-y-auto space-y-2">
            <h4 className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              Fila de Transferência Ativa
            </h4>
            {activeTransfers.map((job) => (
              <div key={job.id} className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 truncate">
                  {job.direction === 'upload' ? (
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className="truncate text-slate-200">{job.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({formatBytes(job.size)})</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${job.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                      style={{ width: `${job.progress}%` }} 
                    />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-300 w-9 text-right">
                    {job.progress}%
                  </span>
                  {job.status === 'completed' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <span className="text-[10px] text-blue-400 animate-pulse">Enviando...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex justify-between items-center text-xs text-slate-400">
          <span>Canal de Dados WebRTC de Baixa Latência (SCTP)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
