import 'dart:async';
import 'package:flutter/services.dart';

class ClipboardMonitor {
  static final ClipboardMonitor _instance = ClipboardMonitor._internal();
  factory ClipboardMonitor() => _instance;
  ClipboardMonitor._internal();

  final StreamController<String> _clipboardController = StreamController<String>.broadcast();
  Stream<String> get clipboardStream => _clipboardController.stream;
  
  Timer? _pollingTimer;
  String? _lastClipboardContent;
  bool _isMonitoring = false;

  void startMonitoring({Duration interval = const Duration(seconds: 2)}) {
    if (_isMonitoring) return;
    _isMonitoring = true;
    
    _pollingTimer = Timer.periodic(interval, (timer) async {
      try {
        final data = await Clipboard.getData(Clipboard.kTextPlain);
        final text = data?.text;
        if (text != null && text.isNotEmpty && text != _lastClipboardContent) {
          _lastClipboardContent = text;
          _clipboardController.add(text);
        }
      } catch (e) {
        // Clipboard access might fail
      }
    });
  }

  void stopMonitoring() {
    _isMonitoring = false;
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  void dispose() {
    stopMonitoring();
    _clipboardController.close();
  }
}
