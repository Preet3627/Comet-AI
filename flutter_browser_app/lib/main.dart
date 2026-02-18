import 'dart:io';
import 'dart:async';
import 'package:flutter/services.dart';

import 'package:context_menus/context_menus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_browser/models/browser_model.dart';
import 'package:flutter_browser/models/webview_model.dart';
import 'package:flutter_browser/models/window_model.dart';
import 'package:flutter_browser/util.dart';
import 'package:flutter_downloader/flutter_downloader.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:window_manager_plus/window_manager_plus.dart';
import 'package:path/path.dart' as p;
import 'package:firebase_core/firebase_core.dart';
import 'sync_service.dart';

import 'browser.dart';
import 'pages/comet_home_page.dart';
import 'pages/splash_screen.dart';
import 'pages/connect_desktop_page.dart';
import 'pages/settings/main.dart';
import 'pages/bookmarks_page.dart';
import 'package:google_fonts/google_fonts.dart';

// ignore: non_constant_identifier_names
late final String WEB_ARCHIVE_DIR;
// ignore: non_constant_identifier_names
late final double TAB_VIEWER_BOTTOM_OFFSET_1;
// ignore: non_constant_identifier_names
late final double TAB_VIEWER_BOTTOM_OFFSET_2;
// ignore: non_constant_identifier_names
late final double TAB_VIEWER_BOTTOM_OFFSET_3;
// ignore: constant_identifier_names
const double TAB_VIEWER_TOP_OFFSET_1 = 0.0;
// ignore: constant_identifier_names
const double TAB_VIEWER_TOP_OFFSET_2 = 10.0;
// ignore: constant_identifier_names
const double TAB_VIEWER_TOP_OFFSET_3 = 20.0;
// ignore: constant_identifier_names
const double TAB_VIEWER_TOP_SCALE_TOP_OFFSET = 250.0;
// ignore: constant_identifier_names
const double TAB_VIEWER_TOP_SCALE_BOTTOM_OFFSET = 230.0;

WebViewEnvironment? webViewEnvironment;
Database? db;

int windowId = 0;
String? windowModelId;

void main(List<String> args) async {
  WidgetsFlutterBinding.ensureInitialized();

  if (Util.isDesktop()) {
    windowId = args.isNotEmpty ? int.tryParse(args[0]) ?? 0 : 0;
    windowModelId = args.length > 1 ? args[1] : null;
    await WindowManagerPlus.ensureInitialized(windowId);
  }

  final appDocumentsDir = await getApplicationDocumentsDirectory();

  if (Util.isDesktop()) {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  }
  db = await databaseFactory.openDatabase(
    p.join(appDocumentsDir.path, "databases", "myDb.db"),
    options: OpenDatabaseOptions(
      version: 1,
      singleInstance: false,
      onCreate: (Database db, int version) async {
        await db.execute(
          'CREATE TABLE browser (id INTEGER PRIMARY KEY, json TEXT)',
        );
        await db.execute(
          'CREATE TABLE windows (id TEXT PRIMARY KEY, json TEXT)',
        );
      },
    ),
  );

  if (Util.isDesktop()) {
    WindowOptions windowOptions = WindowOptions(
      center: true,
      backgroundColor: Colors.transparent,
      titleBarStyle:
          Util.isWindows() ? TitleBarStyle.normal : TitleBarStyle.hidden,
      minimumSize: const Size(1280, 720),
      size: const Size(1280, 720),
    );
    WindowManagerPlus.current.waitUntilReadyToShow(windowOptions, () async {
      if (!Util.isWindows()) {
        await WindowManagerPlus.current.setAsFrameless();
        await WindowManagerPlus.current.setHasShadow(true);
      }
      await WindowManagerPlus.current.show();
      await WindowManagerPlus.current.focus();
    });
  }

  WEB_ARCHIVE_DIR = (await getApplicationSupportDirectory()).path;

  TAB_VIEWER_BOTTOM_OFFSET_1 = 150.0;
  TAB_VIEWER_BOTTOM_OFFSET_2 = 160.0;
  TAB_VIEWER_BOTTOM_OFFSET_3 = 170.0;

  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.windows) {
    final availableVersion = await WebViewEnvironment.getAvailableVersion();
    assert(
      availableVersion != null,
      'Failed to find an installed WebView2 Runtime or non-stable Microsoft Edge installation.',
    );

    webViewEnvironment = await WebViewEnvironment.create(
      settings: WebViewEnvironmentSettings(userDataFolder: 'comet_ai'),
    );
  }

  if (Util.isMobile()) {
    await FlutterDownloader.initialize(debug: kDebugMode);
  }

  if (Util.isMobile()) {
    await Permission.camera.request();
    await Permission.microphone.request();
    await Permission.storage.request();
  }

  try {
    // Attempt Firebase init (will use native config if present, or error out)
    await Firebase.initializeApp();
    await SyncService().initialize('comet-default-user');

    // Start clipboard monitoring
    Timer.periodic(const Duration(seconds: 3), (timer) async {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      if (data?.text != null) {
        SyncService().sendClipboard(data!.text!);
      }
    });
  } catch (e) {
    print('[Sync] Firebase/Sync initialization error: $e');
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => BrowserModel()),
        ChangeNotifierProvider(create: (context) => WebViewModel()),
        ChangeNotifierProxyProvider<WebViewModel, WindowModel>(
          update: (context, webViewModel, windowModel) {
            windowModel!.setCurrentWebViewModel(webViewModel);
            return windowModel;
          },
          create: (BuildContext context) => WindowModel(id: null),
        ),
      ],
      child: const CometAIApp(),
    ),
  );
}

class CometAIApp extends StatefulWidget {
  const CometAIApp({super.key});

  @override
  State<CometAIApp> createState() => _CometAIAppState();
}

class _CometAIAppState extends State<CometAIApp> with WindowListener {
  // https://github.com/pichillilorenzo/window_manager_plus/issues/5
  late final AppLifecycleListener? _appLifecycleListener;

  @override
  void initState() {
    super.initState();

    if (Util.isDesktop()) {
      WindowManagerPlus.current.addListener(this);

      // https://github.com/pichillilorenzo/window_manager_plus/issues/5
      if (WindowManagerPlus.current.id > 0 && Platform.isMacOS) {
        _appLifecycleListener = AppLifecycleListener(
          onStateChange: _handleStateChange,
        );
      }
    }
  }

  void _handleStateChange(AppLifecycleState state) {
    // https://github.com/pichillilorenzo/window_manager_plus/issues/5
    if (WindowManagerPlus.current.id > 0 &&
        Platform.isMacOS &&
        state == AppLifecycleState.hidden) {
      SchedulerBinding.instance.handleAppLifecycleStateChanged(
        AppLifecycleState.inactive,
      );
    }
  }

  @override
  void dispose() {
    if (Util.isDesktop()) {
      WindowManagerPlus.current.removeListener(this);
    }
    _appLifecycleListener?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final materialApp = MaterialApp(
      title: 'Comet-AI',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark,
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: Colors.black,
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00E5FF), // Cyan
          secondary: Color(0xFFD500F9), // Purple
          surface: Color(0xFF121212),
          background: Colors.black,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
        ),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme),
      ),
      theme: ThemeData(
        visualDensity: VisualDensity.adaptivePlatformDensity,
        scaffoldBackgroundColor: Colors.black,
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/home': (context) => const CometHomePage(),
        '/connect-desktop': (context) => const ConnectDesktopPage(),
        '/browser': (context) => const Browser(),
        '/settings': (context) => const SettingsPage(),
      },
    );

    return Util.isMobile()
        ? materialApp
        : ContextMenuOverlay(child: materialApp);
  }

  @override
  void onWindowFocus([int? windowId]) {
    setState(() {});
    if (Util.isDesktop() && !Util.isWindows()) {
      WindowManagerPlus.current.setMovable(false);
    }
  }

  @override
  void onWindowBlur([int? windowId]) {
    if (Util.isDesktop() && !Util.isWindows()) {
      WindowManagerPlus.current.setMovable(true);
    }
  }
}
