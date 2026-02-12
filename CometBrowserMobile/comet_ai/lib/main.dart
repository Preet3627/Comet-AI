import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:audio_service/audio_service.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'l10n/app_localizations.dart';

import 'browser_page.dart';
import 'sync_service.dart';
import 'services/ai_service.dart';
import 'services/music_service.dart';
import 'widgets/dynamic_island.dart';

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

  // Init Audio Service
  final musicService = await AudioService.init(
    builder: () => MusicService(),
    config: const AudioServiceConfig(
      androidNotificationChannelId: 'com.comet.browser.audio',
      androidNotificationChannelName: 'Comet Music Playback',
      androidNotificationOngoing: true,
      androidStopForegroundOnPause: true,
    ),
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SyncService()),
        Provider<MusicService>.value(value: musicService),
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
        return Stack(children: [child!, const DynamicIsland()]);
      },
      home: const BrowserPage(),
    );
  }
}
