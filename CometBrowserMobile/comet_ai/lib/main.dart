import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
// import 'package:audio_service/audio_service.dart'; // DISABLED FOR iOS BUILD FIX
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'l10n/app_localizations.dart';

import 'browser_page.dart';
import 'sync_service.dart';
import 'services/ai_service.dart';
// import 'services/music_service.dart'; // DISABLED FOR iOS BUILD FIX
import 'widgets/dynamic_island.dart';

// Global Services
// Global Services

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set immersive mode for Android
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF020205),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // Init AI Service
  await AIService().loadKeys();

  // Init Notifications
  final flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
  const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
  const initSettings = InitializationSettings(android: androidSettings);
  await flutterLocalNotificationsPlugin.initialize(
    settings: initSettings,
    onDidReceiveNotificationResponse: (NotificationResponse response) async {
      // Handle notification response
      debugPrint('Notification received: ${response.payload}');
    },
  );

  // Init Audio Service - TEMPORARILY DISABLED FOR iOS BUILD FIX
  // See: IOS_BUILD_FIX.md for re-enabling instructions
  // final musicService = MusicService();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SyncService()),

        // DISABLED FOR iOS BUILD FIX
        // Provide stub MusicService (audio features temporarily disabled)
        // Provider<MusicService>.value(value: musicService),
      ],
      child: const CometApp(),
    ),
  );
}

class CometApp extends StatelessWidget {
  const CometApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Comet Browser',
      debugShowCheckedModeBanner: false,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en'), // English
        Locale('hi'), // Hindi
        Locale('gu'), // Gujarati
      ],
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: Colors.cyan[400],
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.cyan[400]!,
          brightness: Brightness.dark,
          surface: const Color(0xFF020205),
        ),
        useMaterial3: true,
      ),
      builder: (context, child) {
        // Overlay Dynamic Island
        return Stack(
          children: [
            child!,
            const DynamicIsland(),
            // musicService disabled for iOS build fix
          ],
        );
      },
      home: const BrowserPage(),
    );
  }
}
