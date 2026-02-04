import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/foundation.dart';

class SyncService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseDatabase _db = FirebaseDatabase.instance;
  
  User? _user;
  List<Map<String, dynamic>> _bookmarks = [];
  List<Map<String, dynamic>> _history = [];
  
  User? get user => _user;
  List<Map<String, dynamic>> get bookmarks => _bookmarks;
  List<Map<String, dynamic>> get history => _history;

  SyncService() {
    _auth.authStateChanges().listen((user) {
      _user = user;
      if (user != null) {
        _startSyncing();
      } else {
        _stopSyncing();
      }
      notifyListeners();
    });
  }

  void _startSyncing() {
    if (_user == null) return;
    
    // Listen for Bookmarks
    _db.ref('bookmarks/${_user!.uid}').onValue.listen((event) {
      final data = event.snapshot.value as Map<dynamic, dynamic>?;
      if (data != null) {
        _bookmarks = data.values.map((e) => Map<String, dynamic>.from(e)).toList();
        notifyListeners();
      }
    });

    // Listen for History
    _db.ref('history/${_user!.uid}').orderByChild('timestamp').limitToLast(50).onValue.listen((event) {
      final data = event.snapshot.value as Map<dynamic, dynamic>?;
      if (data != null) {
        _history = data.values.map((e) => Map<String, dynamic>.from(e)).toList();
        notifyListeners();
      }
    });
  }

  void _stopSyncing() {
    _bookmarks = [];
    _history = [];
  }

  // P2P Logic Stubs (WebRTC Integration)
  Future<void> connectToDevice(String deviceId) async {
    // Signaling via Firebase Realtime DB (matches Desktop logic)
    print('Attempting P2P connection to $deviceId...');
  }
}
