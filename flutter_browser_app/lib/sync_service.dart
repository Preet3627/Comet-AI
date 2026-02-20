import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  DatabaseReference? _signalRef;
  RTCPeerConnection? _peerConnection;
  RTCDataChannel? _dataChannel;
  bool isConnected = false;
  String? userId;
  String? deviceId;
  String? remoteDeviceId;

  final StreamController<String> _clipboardController =
      StreamController<String>.broadcast();
  Stream<String> get onClipboardSynced => _clipboardController.stream;

  final StreamController<Map> _historyController =
      StreamController<Map>.broadcast();
  Stream<Map> get onHistorySynced => _historyController.stream;

  Future<void> initialize(String userId, {String? customDeviceId}) async {
    this.userId = userId;
    if (customDeviceId != null) {
      this.deviceId = customDeviceId;
    } else {
      try {
        final dir = await getApplicationDocumentsDirectory();
        final file = File('${dir.path}/device_id.txt');
        if (await file.exists()) {
          this.deviceId = await file.readAsString();
        } else {
          this.deviceId = const Uuid().v4();
          await file.writeAsString(this.deviceId!);
        }
      } catch (e) {
        print('[Sync] Error loading/saving device ID: $e');
        this.deviceId = const Uuid().v4();
      }
    }
    print('[Sync] Initialized for user: $userId, device: $deviceId');
  }

  Future<void> connect(String targetDeviceId) async {
    this.remoteDeviceId = targetDeviceId;
    _signalRef = FirebaseDatabase.instance.ref('p2p_signals/$userId/$deviceId');

    _signalRef!.onValue.listen((event) {
      if (event.snapshot.value != null) {
        _handleSignal(event.snapshot.value as Map);
      }
    });

    await _setupPeerConnection();

    // Create an offer to start connection
    _dataChannel = await _peerConnection!.createDataChannel(
      'sync-channel',
      RTCDataChannelInit(),
    );
    _setupDataChannel();

    RTCSessionDescription offer = await _peerConnection!.createOffer();
    await _peerConnection!.setLocalDescription(offer);
    _sendSignal({'sdp': offer.toMap()});
  }

  Future<void> _setupPeerConnection() async {
    final Map<String, dynamic> configuration = {
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
        {'urls': 'stun:stun1.l.google.com:19302'},
      ],
    };

    _peerConnection = await createPeerConnection(configuration);

    _peerConnection!.onIceCandidate = (candidate) {
      _sendSignal({'candidate': candidate.toMap()});
    };

    _peerConnection!.onDataChannel = (channel) {
      _dataChannel = channel;
      _setupDataChannel();
    };

    _peerConnection!.onConnectionState = (state) {
      print('[Sync] Peer Connection State: $state');
    };
  }

  void _setupDataChannel() {
    if (_dataChannel == null) return;

    _dataChannel!.onMessage = (data) {
      _handleMessage(data.text);
    };
    _dataChannel!.onDataChannelState = (state) {
      isConnected = state == RTCDataChannelState.RTCDataChannelOpen;
      print('[Sync] Data Channel State: $state');
    };
  }

  String? _lastSentClipboard;

  void _handleMessage(String text) {
    try {
      final msg = jsonDecode(text);
      if (msg['type'] == 'clipboard-sync') {
        _lastSentClipboard = msg['text'];
        Clipboard.setData(ClipboardData(text: msg['text']));
        _clipboardController.add(msg['text']);
        print('[Sync] Clipboard synced: ${msg['text']}');
      } else if (msg['type'] == 'history-sync') {
        _historyController.add(msg['data']);
        print('[Sync] History synced');
      }
    } catch (e) {
      print('[Sync] Error handling message: $e');
    }
  }

  void _handleSignal(Map data) {
    if (data['sender'] == deviceId) return;

    final signal = data['signal'];
    if (signal['sdp'] != null) {
      _peerConnection!
          .setRemoteDescription(
        RTCSessionDescription(signal['sdp']['sdp'], signal['sdp']['type']),
      )
          .then((_) {
        if (signal['sdp']['type'] == 'offer') {
          _peerConnection!.createAnswer().then((answer) {
            _peerConnection!.setLocalDescription(answer);
            _sendSignal({'sdp': answer.toMap()});
          });
        }
      });
    } else if (signal['candidate'] != null) {
      _peerConnection!.addCandidate(
        RTCIceCandidate(
          signal['candidate']['candidate'],
          signal['candidate']['sdpMid'],
          signal['candidate']['sdpMLineIndex'],
        ),
      );
    }
  }

  void _sendSignal(Map signal) {
    if (userId == null || remoteDeviceId == null) return;
    FirebaseDatabase.instance.ref('p2p_signals/$userId/$remoteDeviceId').set({
      'signal': signal,
      'sender': deviceId,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
  }

  void sendClipboard(String text) {
    if (text == _lastSentClipboard) return;
    _lastSentClipboard = text;
    if (isConnected && _dataChannel != null) {
      _dataChannel!.send(
        RTCDataChannelMessage(
          jsonEncode({'type': 'clipboard-sync', 'text': text}),
        ),
      );
    }
  }

  void sendHistory(Map data) {
    if (isConnected && _dataChannel != null) {
      _dataChannel!.send(
        RTCDataChannelMessage(
          jsonEncode({'type': 'history-sync', 'data': data}),
        ),
      );
    }
  }

  // Desktop connection via WiFi
  WebSocket? _desktopSocket;
  String? _desktopIp;
  int? _desktopPort;
  bool isConnectedToDesktop = false;

  // UDP Discovery
  RawDatagramSocket? _discoverySocket;
  final StreamController<Map<String, dynamic>> _discoveredDevicesController =
      StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get onDeviceDiscovered =>
      _discoveredDevicesController.stream;
  final Set<String> _discoveredDeviceIds = {};

  final StreamController<Map> _commandResponseController =
      StreamController<Map>.broadcast();
  Stream<Map> get onCommandResponse => _commandResponseController.stream;

  Future<void> startDiscovery() async {
    _discoveredDeviceIds.clear();
    try {
      _discoverySocket =
          await RawDatagramSocket.bind(InternetAddress.anyIPv4, 3005);
      _discoverySocket!.listen((RawSocketEvent event) {
        if (event == RawSocketEvent.read) {
          Datagram? dg = _discoverySocket!.receive();
          if (dg != null) {
            try {
              String message = utf8.decode(dg.data);
              Map<String, dynamic> data = jsonDecode(message);
              if (data['type'] == 'comet-ai-beacon') {
                String? deviceId = data['deviceId'];
                if (deviceId != null &&
                    !_discoveredDeviceIds.contains(deviceId)) {
                  _discoveredDeviceIds.add(deviceId);
                  _discoveredDevicesController.add({
                    'deviceId': deviceId,
                    'deviceName': data['deviceName'] ?? 'Unknown Desktop',
                    'ip': dg.address.address,
                    'port': data['port'] ?? 3004,
                  });
                }
              }
            } catch (e) {
              print('[Sync] Error parsing discovery beacon: $e');
            }
          }
        }
      });
      print('[Sync] UDP discovery started on port 3005');
    } catch (e) {
      print('[Sync] Failed to start UDP discovery: $e');
    }
  }

  void stopDiscovery() {
    _discoverySocket?.close();
    _discoverySocket = null;
    print('[Sync] UDP discovery stopped');
  }

  Future<void> connectToDesktop(String ip, int port, String deviceId,
      {String? pairingCode}) async {
    try {
      _desktopIp = ip;
      _desktopPort = port;
      remoteDeviceId = deviceId;

      // Connect via WebSocket
      _desktopSocket = await WebSocket.connect('ws://$ip:$port')
          .timeout(const Duration(seconds: 5));

      final completer = Completer<void>();

      // Listen for messages
      _desktopSocket!.listen(
        (data) {
          try {
            final msg = jsonDecode(data);
            if (msg['type'] == 'handshake-ack' &&
                msg['authenticated'] == true) {
              if (!completer.isCompleted) completer.complete();
            } else if (msg['type'] == 'error' && msg['code'] == 'AUTH_FAILED') {
              if (!completer.isCompleted)
                completer.completeError('AUTH_FAILED');
            }
          } catch (_) {}
          _handleDesktopMessage(data);
        },
        onDone: () {
          isConnectedToDesktop = false;
          if (!completer.isCompleted) completer.completeError('Disconnected');
        },
        onError: (error) {
          isConnectedToDesktop = false;
          if (!completer.isCompleted) completer.completeError(error);
        },
      );

      // Send handshake
      _desktopSocket!.add(
        jsonEncode({
          'type': 'handshake',
          'deviceId': this.deviceId,
          'platform': 'mobile',
          'pairingCode': pairingCode,
        }),
      );

      // Wait for authentication response
      await completer.future.timeout(const Duration(seconds: 10));

      isConnectedToDesktop = true;
      print('[Sync] Connected and Authenticated to desktop at $ip:$port');
    } catch (e) {
      _desktopSocket?.close();
      _desktopSocket = null;
      isConnectedToDesktop = false;
      print('[Sync] Failed to connect to desktop: $e');
      rethrow;
    }
  }

  void _handleDesktopMessage(dynamic data) {
    try {
      final msg = jsonDecode(data);

      if (msg['type'] == 'command-response') {
        _commandResponseController.add(msg);
        print('[Sync] Command response received: ${msg['output']}');
      } else if (msg['type'] == 'clipboard-sync') {
        _lastSentClipboard = msg['text'];
        Clipboard.setData(ClipboardData(text: msg['text']));
        _clipboardController.add(msg['text']);
      } else if (msg['type'] == 'error' && msg['code'] == 'AUTH_FAILED') {
        isConnectedToDesktop = false;
        print('[Sync] Authentication failed: ${msg['message']}');
      }
    } catch (e) {
      print('[Sync] Error handling desktop message: $e');
    }
  }

  /// Send a command to execute on the desktop
  Future<Map?> executeOnDesktop(
    String command, {
    Map<String, dynamic>? args,
  }) async {
    if (!isConnectedToDesktop || _desktopSocket == null) {
      throw Exception('Not connected to desktop');
    }

    final commandId = const Uuid().v4();

    _desktopSocket!.add(
      jsonEncode({
        'type': 'execute-command',
        'commandId': commandId,
        'command': command,
        'args': args ?? {},
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      }),
    );

    // Wait for response (with timeout)
    try {
      final response = await onCommandResponse
          .firstWhere(
            (msg) => msg['commandId'] == commandId,
            orElse: () => {'error': 'Timeout'},
          )
          .timeout(const Duration(seconds: 30));

      return response;
    } catch (e) {
      print('[Sync] Command execution failed: $e');
      return {'error': e.toString()};
    }
  }

  /// Send a prompt to be executed on desktop (for AI features)
  Future<Map?> sendPromptToDesktop(String prompt, {String? model}) async {
    return executeOnDesktop('ai-prompt', args: {
      'prompt': prompt,
      'model': model,
    });
  }

  /// Disconnect from desktop
  void disconnectFromDesktop() {
    _desktopSocket?.close();
    _desktopSocket = null;
    isConnectedToDesktop = false;
    _desktopIp = null;
    _desktopPort = null;
    stopDiscovery();
    print('[Sync] Disconnected from desktop');
  }

  /// Get current connection info
  Map<String, dynamic> getConnectionInfo() {
    return {
      'isConnected': isConnectedToDesktop,
      'desktopIp': _desktopIp,
      'desktopPort': _desktopPort,
      'remoteDeviceId': remoteDeviceId,
    };
  }
}
