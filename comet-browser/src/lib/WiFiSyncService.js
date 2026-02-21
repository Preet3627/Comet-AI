"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WiFiSyncService = void 0;
exports.getWiFiSync = getWiFiSync;
var events_1 = require("events");
var ws_1 = require("ws");
var os = __importStar(require("os"));
var dgram = __importStar(require("dgram"));
var electron_1 = require("electron");
var WiFiSyncService = /** @class */ (function (_super) {
    __extends(WiFiSyncService, _super);
    function WiFiSyncService(port) {
        if (port === void 0) { port = 3004; }
        var _this = _super.call(this) || this;
        _this.wss = null;
        _this.discoverySocket = null;
        _this.discoveryInterval = null;
        _this.clients = new Set();
        _this.port = port;
        _this.deviceId = "desktop-".concat(os.hostname().substring(0, 8));
        _this.pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
        return _this;
    }
    WiFiSyncService.prototype.start = function () {
        var _this = this;
        try {
            this.wss = new ws_1.WebSocketServer({ port: this.port });
            console.log("[WiFi-Sync] Server started on port ".concat(this.port));
            this.wss.on('connection', function (ws) {
                console.log('[WiFi-Sync] Mobile client connected');
                _this.clients.add(ws);
                ws.on('message', function (message) {
                    _this._handleMessage(ws, message);
                });
                ws.on('close', function () {
                    console.log('[WiFi-Sync] Mobile client disconnected');
                    _this.clients.delete(ws);
                    _this.emit('client-disconnected');
                });
                ws.on('error', function (err) {
                    console.error('[WiFi-Sync] WebSocket error:', err);
                });
                _this.emit('client-connected');
            });
            this._startDiscovery();
            return true;
        }
        catch (e) {
            console.error('[WiFi-Sync] Failed to start server:', e);
            return false;
        }
    };
    WiFiSyncService.prototype._startDiscovery = function () {
        var _this = this;
        try {
            this.discoverySocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            var discoveryPort_1 = 3005; // Different port for discovery
            var beacon_1 = JSON.stringify({
                type: 'comet-ai-beacon',
                deviceId: this.deviceId,
                deviceName: os.hostname(),
                ip: this.getLocalIp(),
                port: this.port
            });
            this.discoveryInterval = setInterval(function () {
                if (_this.discoverySocket) {
                    var message = Buffer.from(beacon_1);
                    _this.discoverySocket.send(message, discoveryPort_1, '255.255.255.255', function (err) {
                        if (err)
                            console.error('[WiFi-Sync] Discovery send failed:', err);
                    });
                }
            }, 3000);
            this.discoverySocket.bind(0, function () {
                if (_this.discoverySocket) {
                    _this.discoverySocket.setBroadcast(true);
                    console.log('[WiFi-Sync] Discovery beacon started');
                }
            });
        }
        catch (e) {
            console.error('[WiFi-Sync] Failed to start discovery:', e);
        }
    };
    WiFiSyncService.prototype._handleMessage = function (ws, data) {
        try {
            var msg = JSON.parse(data.toString());
            console.log("[WiFi-Sync] Received: ".concat(msg.type));
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
                    }
                    else {
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
                        electron_1.clipboard.writeText(msg.text);
                        this.emit('clipboard-received', msg.text);
                    }
                    break;
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        }
        catch (e) {
            console.error('[WiFi-Sync] Error parsing message:', e);
        }
    };
    WiFiSyncService.prototype._handleCommand = function (ws, msg) {
        return __awaiter(this, void 0, void 0, function () {
            var commandId, command, args;
            return __generator(this, function (_a) {
                commandId = msg.commandId, command = msg.command, args = msg.args;
                // Forward to main process via event
                this.emit('command', {
                    commandId: commandId,
                    command: command,
                    args: args,
                    sendResponse: function (responseBody) {
                        ws.send(JSON.stringify(__assign({ type: 'command-response', commandId: commandId }, responseBody)));
                    }
                });
                return [2 /*return*/];
            });
        });
    };
    WiFiSyncService.prototype.getLocalIp = function () {
        var interfaces = os.networkInterfaces();
        for (var _i = 0, _a = Object.keys(interfaces); _i < _a.length; _i++) {
            var name_1 = _a[_i];
            var ifaceEntry = interfaces[name_1];
            if (!ifaceEntry)
                continue;
            for (var _b = 0, ifaceEntry_1 = ifaceEntry; _b < ifaceEntry_1.length; _b++) {
                var iface = ifaceEntry_1[_b];
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    };
    WiFiSyncService.prototype.getConnectUri = function () {
        return "comet-ai://connect?ip=".concat(this.getLocalIp(), "&port=").concat(this.port, "&device=").concat(this.deviceId);
    };
    WiFiSyncService.prototype.stop = function () {
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
    };
    WiFiSyncService.prototype.getPairingCode = function () {
        return this.pairingCode;
    };
    return WiFiSyncService;
}(events_1.EventEmitter));
exports.WiFiSyncService = WiFiSyncService;
var wifiSyncInstance = null;
function getWiFiSync(port) {
    if (!wifiSyncInstance) {
        wifiSyncInstance = new WiFiSyncService(port);
    }
    return wifiSyncInstance;
}
