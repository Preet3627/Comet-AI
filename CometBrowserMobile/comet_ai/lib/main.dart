import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'browser_page.dart';
import 'package:provider/provider.dart';
import 'sync_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set immersive mode for Android
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF020205),
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  runApp(
    ChangeNotifierProvider(
      create: (_) => SyncService(),
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
      home: const BrowserPage(),
    );
  }
}
