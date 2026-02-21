import { EventEmitter } from 'events';
import { WebSocketServer, WebSocket } from 'ws';
import * as os from 'os';
import * as dgram from 'dgram';
import { clipboard } from 'electron';

export class WiFiSyncService extends EventEmitter {
    private port: number;
    private wss: WebSocketServer | null = null;
    private discoverySocket: dgram.Socket | null = null;
    private discoveryInterval: any = null;
    private clients: Set<WebSocket> = new Set();
    private deviceId: string;
    private pairingCode: string;

    constructor(port: number = 3004) {
        super();
        this.port = port;
        this.deviceId = `desktop-${os.hostname().substring(0, 8)}`;
        this.pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    }

    public start(): boolean {
        try {
            this.wss = new WebSocketServer({ port: this.port });
            console.log(`[WiFi-Sync] Server started on port ${this.port}`);

            this.wss.on('connection', (ws: WebSocket) => {
                console.log('[WiFi-Sync] Mobile client connected');
                this.clients.add(ws);

                ws.on('message', (message: any) => {
                    this._handleMessage(ws, message);
                });

                ws.on('close', () => {
                    console.log('[WiFi-Sync] Mobile client disconnected');
                    this.clients.delete(ws);
                    this.emit('client-disconnected');
                });

                ws.on('error', (err) => {
                    console.error('[WiFi-Sync] WebSocket error:', err);
                });

                this.emit('client-connected');
            });

            this._startDiscovery();
            return true;
        } catch (e) {
            console.error('[WiFi-Sync] Failed to start server:', e);
            return false;
        }
    }

    private _startDiscovery() {
        try {
            this.discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

            const discoveryPort = 3005; // Different port for discovery
            const beacon = JSON.stringify({
                type: 'comet-ai-beacon',
                deviceId: this.deviceId,
                deviceName: os.hostname(),
                ip: this.getLocalIp(),
                port: this.port
            });

            this.discoveryInterval = setInterval(() => {
                if (this.discoverySocket) {
                    const message = Buffer.from(beacon);
                    this.discoverySocket.send(message, discoveryPort, '255.255.255.255', (err) => {
                        if (err) console.error('[WiFi-Sync] Discovery send failed:', err);
                    });
                }
            }, 3000);

            this.discoverySocket.bind(0, () => {
                if (this.discoverySocket) {
                    this.discoverySocket.setBroadcast(true);
                    console.log('[WiFi-Sync] Discovery beacon started');
                }
            });
        } catch (e) {
            console.error('[WiFi-Sync] Failed to start discovery:', e);
        }
    }

    private _handleMessage(ws: WebSocket, data: any) {
        try {
            const msg = JSON.parse(data.toString());
            console.log(`[WiFi-Sync] Received: ${msg.type}`);

            switch (msg.type) {
                case 'handshake':
                    console.log('[WiFi-Sync] Handshake received from:', msg.deviceId);
                    if (msg.pairingCode === this.pairingCode) {
                        ws.send(JSON.stringify({
                            type: 'handshake-ack',
                            deviceId: this.deviceId,
                            hostname: os.hostname(),
                            platform: os.platform(),
                            authenticated: true
                        }));
                        console.log('[WiFi-Sync] Client authenticated successfully');
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            code: 'AUTH_FAILED',
                            message: 'Invalid pairing code'
                        }));
                        console.log('[WiFi-Sync] Client authentication failed');
                        // Optional: ws.close() or keep open for retry? 
                        // Flutter UI allows retry.
                    }
                    break;

                case 'execute-command':
                    this._handleCommand(ws, msg);
                    break;

                case 'clipboard-sync':
                    if (msg.text) {
                        clipboard.writeText(msg.text);
                        this.emit('clipboard-received', msg.text);
                    }
                    break;

                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (e) {
            console.error('[WiFi-Sync] Error parsing message:', e);
        }
    }

    private async _handleCommand(ws: WebSocket, msg: any) {
        const { commandId, command, args } = msg;

        // Forward to main process via event
        this.emit('command', {
            commandId,
            command,
            args,
            sendResponse: (responseBody: any) => {
                ws.send(JSON.stringify({
                    type: 'command-response',
                    commandId,
                    ...responseBody
                }));
            }
        });
    }

    public getLocalIp(): string {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            const ifaceEntry = interfaces[name];
            if (!ifaceEntry) continue;
            for (const iface of ifaceEntry) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }

    public getConnectUri(): string {
        return `comet-ai://connect?ip=${this.getLocalIp()}&port=${this.port}&device=${this.deviceId}`;
    }

    public stop() {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
            this.discoveryInterval = null;
        }
        if (this.discoverySocket) {
            this.discoverySocket.close();
            this.discoverySocket = null;
        }
    }

    public getPairingCode(): string {
        return this.pairingCode;
    }

    public broadcast(message: any) {
        if (!this.wss) return;
        const data = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }
}

let wifiSyncInstance: WiFiSyncService | null = null;
export function getWiFiSync(port?: number): WiFiSyncService {
    if (!wifiSyncInstance) {
        wifiSyncInstance = new WiFiSyncService(port);
    }
    return wifiSyncInstance;
}
