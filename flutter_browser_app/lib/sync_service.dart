import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:firebase_database/firebase_database.dart';
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
      ]
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
      _dataChannel!.send(RTCDataChannelMessage(jsonEncode({
        'type': 'clipboard-sync',
        'text': text,
      })));
    }
  }

  void sendHistory(Map data) {
    if (isConnected && _dataChannel != null) {
      _dataChannel!.send(RTCDataChannelMessage(jsonEncode({
        'type': 'history-sync',
        'data': data,
      })));
    }
  }
}
