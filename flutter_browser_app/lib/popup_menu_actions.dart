import 'package:flutter_browser/util.dart';

class PopupMenuActions {
  // ignore: constant_identifier_names
  static const String OPEN_NEW_WINDOW = "Open New Window";
  // ignore: constant_identifier_names
  static const String SAVE_WINDOW = "Save Window";
  // ignore: constant_identifier_names
  static const String SAVED_WINDOWS = "Saved Windows";
  // ignore: constant_identifier_names
  static const String NEW_TAB = "New tab";
  // ignore: constant_identifier_names
  static const String NEW_INCOGNITO_TAB = "New incognito tab";
  // ignore: constant_identifier_names
  static const String FAVORITES = "Favorites";
  // ignore: constant_identifier_names
  static const String HISTORY = "History";
  // ignore: constant_identifier_names
  static const String WEB_ARCHIVES = "Web Archives";
  // ignore: constant_identifier_names
  static const String SHARE = "Share";
  // ignore: constant_identifier_names
  static const String FIND_ON_PAGE = "Find on page";
  // ignore: constant_identifier_names
  static const String DESKTOP_MODE = "Desktop mode";
  // ignore: constant_identifier_names
  static const String SETTINGS = "Settings";
  // ignore: constant_identifier_names
  static const String DEVELOPERS = "Developers";
  // ignore: constant_identifier_names
  static const String INAPPWEBVIEW_PROJECT = "InAppWebView Project";
  // ignore: constant_identifier_names
  static const String AI_ASSISTANT = "AI Assistant";
  // ignore: constant_identifier_names
  static const String SYNC_WITH_DESKTOP = "Sync with Desktop";
  // ignore: constant_identifier_names
  static const String ANALYZE_PAGE = "Analyze Page with AI";
  // ignore: constant_identifier_names
  static const String OCR_SCAN = "OCR Scan Page";
  // ignore: constant_identifier_names
  static const String EXTRACT_DOM = "Extract Page Content";

  static List<String> get choices {
    if (Util.isMobile()) {
      return [
        NEW_TAB,
        NEW_INCOGNITO_TAB,
        AI_ASSISTANT,
        SYNC_WITH_DESKTOP,
        FAVORITES,
        HISTORY,
        WEB_ARCHIVES,
        SHARE,
        FIND_ON_PAGE,
        ANALYZE_PAGE,
        OCR_SCAN,
        EXTRACT_DOM,
        SETTINGS,
        DEVELOPERS,
        INAPPWEBVIEW_PROJECT,
      ];
    }
    return [
      OPEN_NEW_WINDOW,
      SAVE_WINDOW,
      SAVED_WINDOWS,
      NEW_TAB,
      NEW_INCOGNITO_TAB,
      AI_ASSISTANT,
      SYNC_WITH_DESKTOP,
      FAVORITES,
      HISTORY,
      WEB_ARCHIVES,
      SHARE,
      FIND_ON_PAGE,
      ANALYZE_PAGE,
      OCR_SCAN,
      EXTRACT_DOM,
      SETTINGS,
      DEVELOPERS,
      INAPPWEBVIEW_PROJECT,
    ];
  }
}
