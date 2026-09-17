export type PlatformType = 'windows' | 'mac' | 'android' | 'linux';

export interface DeskInfo {
  deskId: string;
  alias: string;
  platform: PlatformType;
  localIp?: string;
  isOnline: boolean;
  require2FA: boolean;
  twoFactorSecret: string;
  hasUnattendedPassword?: boolean;
  unattendedPassword?: string;
  allowUnattendedAccess?: boolean;
}

export interface SessionPermissions {
  allowMouse: boolean;
  allowKeyboard: boolean;
  allowFileTransfer: boolean;
  allowClipboard: boolean;
  allowAudio: boolean;
  allowRecording: boolean;
}

export interface ClipboardSyncItem {
  id: string;
  text: string;
  timestamp: number;
  source: 'local' | 'remote';
  sourcePlatform?: PlatformType;
}

export type ConnectionState = 
  | 'idle' 
  | 'resolving' 
  | 'connecting' 
  | 'awaiting_approval' 
  | '2fa_prompt' 
  | 'connected' 
  | 'rejected' 
  | 'disconnected';

export interface ChatMessage {
  id: string;
  sender: 'local' | 'remote';
  senderAlias: string;
  text: string;
  timestamp: number;
}

export interface RemoteFile {
  name: string;
  size: number;
  type: 'file' | 'folder';
  modified: string;
}

export interface FileTransferJob {
  id: string;
  name: string;
  size: number;
  progress: number;
  direction: 'upload' | 'download';
  status: 'pending' | 'transferring' | 'completed' | 'failed';
}

export interface SavedDevice {
  id: string;
  deskId: string;
  ipAddress?: string;
  alias: string;
  platform: PlatformType;
  lastConnected: string;
  isFavorite?: boolean;
  isOnline: boolean;
  ping: number;
  unattendedPassword?: string;
  isUnattended?: boolean;
  role?: 'host' | 'client';
}

export interface QualityPreset {
  id: 'low_latency' | 'balanced' | 'high_quality';
  label: string;
  description: string;
  fps: number;
  bitrate: string;
  latencyEstimate: string;
}
