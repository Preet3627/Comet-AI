// src/components/SyncSettings.tsx
import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Cloud, Wifi, WifiOff, HardDrive, Key, UploadCloud, DownloadCloud, AlertTriangle, CheckCircle, RefreshCw, Info } from 'lucide-react';

interface SyncSettingsProps {
    onClose: () => void;
}

const SyncSettings: React.FC<SyncSettingsProps> = ({ onClose }) => {
    const store = useAppStore();
    const [remoteDeviceId, setRemoteDeviceId] = useState('');
    const [p2pConnected, setP2PConnected] = useState(false);
    const [firebaseReady, setFirebaseReady] = useState(false);
    const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);
    const [encryptionKey, setEncryptionKey] = useState(store.syncPassphrase || '');
    const [encryptionKeyConfirmed, setEncryptionKeyConfirmed] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!window.electronAPI) {
            setStatusMessage('Electron API not available. Sync features may be limited.');
            return;
        }

        const cleanupConnected = window.electronAPI.onP2PConnected(() => {
            setP2PConnected(true);
            setStatusMessage('P2P Connection established!');
        });
        const cleanupDisconnected = window.electronAPI.onP2PDisconnected(() => {
            setP2PConnected(false);
            setStatusMessage('P2P Connection lost.');
        });
        const cleanupFirebaseReady = window.electronAPI.onP2PFirebaseReady((userId) => {
            setFirebaseReady(true);
            setFirebaseUserId(userId);
            setStatusMessage(`Firebase ready. User ID: ${userId}`);
        });

        // TODO: Add listeners for signaling events (offer/answer/candidate) if needed in renderer
        // For now, P2PFileSyncService handles these internally in main process

        return () => {
            if (typeof cleanupConnected === 'function') cleanupConnected();
            if (typeof cleanupDisconnected === 'function') cleanupDisconnected();
            if (typeof cleanupFirebaseReady === 'function') cleanupFirebaseReady();
        };
    }, []);

    const handleConnectP2P = async () => {
        if (!window.electronAPI) {
            setStatusMessage('Electron API not available.');
            return;
        }
        if (!remoteDeviceId) {
            setStatusMessage('Please enter a remote device ID to connect.');
            return;
        }
        setStatusMessage('Attempting to connect P2P...');
        const success = await window.electronAPI.connectToRemoteDevice(remoteDeviceId);
        if (success) {
            setStatusMessage('Connection process initiated. Check console for details.');
        } else {
            setStatusMessage('Failed to initiate P2P connection.');
        }
    };

    const handleGenerateKey = () => {
        const newKey = crypto.randomUUID(); // Basic UUID, could be more complex
        setEncryptionKey(newKey);
        store.setSyncPassphrase(newKey);
        setEncryptionKeyConfirmed(true);
        setStatusMessage('New encryption key generated and saved!');
    };

    const handleSaveEncryptionKey = () => {
        store.setSyncPassphrase(encryptionKey);
        setEncryptionKeyConfirmed(true);
        setStatusMessage('Encryption key saved!');
    };

    // TODO: Implement actual folder selection and sync initiation
    const handleInitiateSync = () => {
        setStatusMessage('Sync initiation logic to be implemented.');
    };

    return (
        <div className="space-y-8">
            <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-8">
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">P2P & Cloud Sync Status</h3>
                    <p className="text-xs text-white/30">Monitor and manage your cross-device synchronization.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${p2pConnected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        {p2pConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{p2pConnected ? 'P2P Connected' : 'P2P Disconnected'}</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${firebaseReady ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}>
                        <Cloud size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{firebaseReady ? `Cloud Ready (${firebaseUserId ? firebaseUserId.substring(0, 6) + '...' : 'Guest'})` : 'Cloud Not Ready'}</span>
                    </div>
                </div>

                {statusMessage && (
                    <div className="flex items-center gap-2 text-xs p-3 rounded-lg bg-white/5 border border-white/10 text-white/70">
                        <Info size={16} /> {statusMessage}
                    </div>
                )}
            </div>

            <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-8">
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">Connect to Remote Device (P2P)</h3>
                    <p className="text-xs text-white/30">Enter the Device ID of a peer to establish a direct connection for P2P sync.</p>
                </div>
                <input
                    type="text"
                    placeholder="Remote Device ID (e.g., another Comet Browser instance)"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-6 text-sm text-white focus:outline-none focus:ring-1 focus:ring-deep-space-accent-neon/50 transition-all placeholder:text-white/30"
                    value={remoteDeviceId}
                    onChange={(e) => setRemoteDeviceId(e.target.value)}
                />
                <button
                    onClick={handleConnectP2P}
                    className="w-full px-6 py-3 bg-deep-space-accent-neon text-deep-space-bg font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                    disabled={!firebaseReady || p2pConnected}
                >
                    Connect P2P
                </button>
            </div>

            <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-8">
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">Encryption Key Management</h3>
                    <p className="text-xs text-white/30">Your data is encrypted locally with this key. Keep it safe!</p>
                </div>
                <input
                    type="password"
                    placeholder="Enter or generate your encryption key"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-6 text-sm text-white focus:outline-none focus:ring-1 focus:ring-deep-space-accent-neon/50 transition-all placeholder:text-white/30"
                    value={encryptionKey}
                    onChange={(e) => {
                        setEncryptionKey(e.target.value);
                        setEncryptionKeyConfirmed(false);
                    }}
                />
                <div className="flex gap-4">
                    <button
                        onClick={handleGenerateKey}
                        className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white/60 font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                        <Key size={18} className="inline-block mr-2" /> Generate New Key
                    </button>
                    <button
                        onClick={handleSaveEncryptionKey}
                        className={`flex-1 px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all ${encryptionKey && !encryptionKeyConfirmed ? 'bg-deep-space-accent-neon text-deep-space-bg hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,255,255,0.3)]' : 'bg-white/5 text-white/40 cursor-not-allowed'}`}
                        disabled={!encryptionKey || encryptionKeyConfirmed}
                    >
                        {encryptionKeyConfirmed ? <CheckCircle size={18} className="inline-block mr-2" /> : <UploadCloud size={18} className="inline-block mr-2" />}
                        {encryptionKeyConfirmed ? 'Key Saved!' : 'Save Key'}
                    </button>
                </div>
                <p className="text-[10px] text-orange-400/60 font-medium leading-relaxed">
                    <AlertTriangle size={12} className="inline-block mr-1" />
                    If you lose this key, you will not be able to decrypt your synchronized data on new devices.
                    We recommend backing it up securely.
                </p>
            </div>

            <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-8">
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">Synchronized Folders</h3>
                    <p className="text-xs text-white/30">Configure which local folders to keep synchronized across your devices.</p>
                </div>
                {/* TODO: Implement folder listing and management */}
                <div className="text-center py-12 text-white/40">
                    <HardDrive size={48} className="mx-auto mb-4" />
                    <p>No folders configured for sync yet.</p>
                    <button
                        onClick={handleInitiateSync}
                        className="mt-6 px-6 py-3 bg-deep-space-accent-neon text-deep-space-bg font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                        disabled={!firebaseReady}
                    >
                        <UploadCloud size={18} className="inline-block mr-2" /> Add New Sync Folder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SyncSettings;
