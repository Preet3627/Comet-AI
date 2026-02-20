import 'dart:convert';
import 'dart:ui';
import 'dart:io';

import 'dart:async';
import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_browser/app_bar/url_info_popup.dart';
import 'package:flutter_browser/custom_image.dart';
import 'package:flutter_browser/main.dart';
import 'package:flutter_browser/models/browser_model.dart';
import 'package:flutter_browser/models/favorite_model.dart';
import 'package:flutter_browser/models/web_archive_model.dart';
import 'package:flutter_browser/models/webview_model.dart';
import 'package:flutter_browser/pages/developers/main.dart';
import 'package:flutter_browser/pages/settings/main.dart';
import 'package:flutter_browser/tab_popup_menu_actions.dart';
import 'package:flutter_browser/util.dart';
import 'package:flutter_font_icons/flutter_font_icons.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import 'package:flutter_browser/pages/ai_chat_page.dart';
import 'package:flutter_browser/pages/agent_chat_page.dart';
import 'package:flutter_browser/pages/comet_agent_service.dart';
import 'package:flutter_browser/url_predictor.dart';
import 'package:flutter_browser/pages/connect_desktop_page.dart';
import '../animated_flutter_browser_logo.dart';
import '../custom_popup_dialog.dart';
import '../custom_popup_menu_item.dart';
import '../models/window_model.dart';
import '../popup_menu_actions.dart';
import '../project_info_popup.dart';
import '../webview_tab.dart';

class WebViewTabAppBar extends StatefulWidget {
  final void Function()? showFindOnPage;

  const WebViewTabAppBar({super.key, this.showFindOnPage});

  @override
  State<WebViewTabAppBar> createState() => _WebViewTabAppBarState();
}

class _WebViewTabAppBarState extends State<WebViewTabAppBar>
    with SingleTickerProviderStateMixin {
  TextEditingController? _searchController = TextEditingController();
  FocusNode? _focusNode;
  List<String> _suggestions = [];
  OverlayEntry? _overlayEntry;
  final LayerLink _layerLink = LayerLink();
  Timer? _debounceTimer;

  GlobalKey tabInkWellKey = GlobalKey();

  Duration customPopupDialogTransitionDuration = const Duration(
    milliseconds: 300,
  );
  CustomPopupDialogPageRoute? route;

  OutlineInputBorder outlineBorder = const OutlineInputBorder(
    borderSide: BorderSide(color: Colors.transparent, width: 0.0),
    borderRadius: BorderRadius.all(Radius.circular(50.0)),
  );

  bool shouldSelectText = true;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    _focusNode?.addListener(() async {
      if (_focusNode != null && _focusNode!.hasFocus) {
        _showSuggestionsOverlay();
      } else {
        _hideSuggestionsOverlay();
      }

      if (_focusNode != null &&
          !_focusNode!.hasFocus &&
          _searchController != null &&
          _searchController!.text.isEmpty) {
        final windowModel = Provider.of<WindowModel>(context, listen: false);
        final webViewModel = windowModel.getCurrentTab()?.webViewModel;
        var webViewController = webViewModel?.webViewController;
        _searchController!.text =
            (await webViewController?.getUrl())?.toString() ?? "";
      }
    });
  }

  @override
  void dispose() {
    _focusNode?.dispose();
    _focusNode = null;
    _searchController?.dispose();
    _searchController = null;
    _debounceTimer?.cancel();
    super.dispose();
  }

  int _prevTabIndex = -1;

  @override
  Widget build(BuildContext context) {
    return Selector<WebViewModel, ({WebUri? item1, int? item2})>(
      selector: (context, webViewModel) =>
          (item1: webViewModel.url, item2: webViewModel.tabIndex),
      builder: (context, record, child) {
        if (_prevTabIndex != record.item2) {
          _searchController?.text = record.item1?.toString() ?? '';
          _prevTabIndex = record.item2 ?? _prevTabIndex;
          _focusNode?.unfocus();
        } else {
          if (record.item1 == null) {
            _searchController?.text = "";
          }
          if (record.item1 != null &&
              _focusNode != null &&
              !_focusNode!.hasFocus) {
            _searchController?.text = record.item1.toString();
          }
        }

        Widget? leading = _buildAppBarHomePageWidget();

        return Selector<WebViewModel, bool>(
          selector: (context, webViewModel) => webViewModel.isIncognitoMode,
          builder: (context, isIncognitoMode, child) {
            final browserModel =
                Provider.of<BrowserModel>(context, listen: false);
            final windowModel =
                Provider.of<WindowModel>(context, listen: false);
            final settings = browserModel.getSettings();
            final isVibrant = settings.theme == "Vibrant";

            return PreferredSize(
              preferredSize: const Size.fromHeight(80),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: const BoxDecoration(color: Colors.transparent),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(30),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                    child: Container(
                      height: 60,
                      decoration: BoxDecoration(
                        color: isVibrant
                            ? Colors.white.withOpacity(0.1)
                            : Colors.black.withOpacity(0.8),
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(
                          color: isVibrant
                              ? Colors.white.withOpacity(0.2)
                              : Colors.white.withOpacity(0.05),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          const SizedBox(width: 4),
                          _buildModernLeading(settings),
                          Expanded(
                            child: Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 4),
                              child: _buildSearchTextField(),
                            ),
                          ),
                          _buildModernActions(windowModel, browserModel),
                          const SizedBox(width: 8),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget? _buildAppBarHomePageWidget() {
    var browserModel = Provider.of<BrowserModel>(context, listen: true);
    var settings = browserModel.getSettings();

    var webViewModel = Provider.of<WebViewModel>(context, listen: true);

    if (Util.isMobile() && !settings.homePageEnabled) {
      return null;
    }

    final children = <Widget>[];
    if (Util.isDesktop()) {
      children.addAll([
        IconButton(
          icon: const Icon(Icons.arrow_back, size: 20),
          constraints: const BoxConstraints(
            maxWidth: 30,
            minWidth: 30,
            maxHeight: 30,
            minHeight: 30,
          ),
          padding: EdgeInsets.zero,
          onPressed: () async {
            webViewModel.webViewController?.goBack();
          },
        ),
        IconButton(
          icon: const Icon(Icons.arrow_forward, size: 20),
          constraints: const BoxConstraints(
            maxWidth: 30,
            minWidth: 30,
            maxHeight: 30,
            minHeight: 30,
          ),
          padding: EdgeInsets.zero,
          onPressed: () async {
            webViewModel.webViewController?.goForward();
          },
        ),
        IconButton(
          icon: const Icon(Icons.refresh, size: 20),
          constraints: const BoxConstraints(
            maxWidth: 30,
            minWidth: 30,
            maxHeight: 30,
            minHeight: 30,
          ),
          padding: EdgeInsets.zero,
          onPressed: () async {
            webViewModel.webViewController?.reload();
          },
        ),
      ]);
    }
    if (settings.homePageEnabled || Util.isDesktop()) {
      children.add(
        IconButton(
          icon: const Icon(Icons.home, size: 20),
          constraints: const BoxConstraints(
            maxWidth: 30,
            minWidth: 30,
            maxHeight: 30,
            minHeight: 30,
          ),
          padding: EdgeInsets.zero,
          onPressed: () {
            if (webViewModel.webViewController != null) {
              var url = settings.homePageEnabled &&
                      settings.customUrlHomePage.isNotEmpty
                  ? WebUri(settings.customUrlHomePage)
                  : WebUri(settings.searchEngine.url);
              webViewModel.webViewController?.loadUrl(
                urlRequest: URLRequest(url: url),
              );
            } else {
              addNewTab();
            }
          },
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 5),
      child: Row(children: children),
    );
  }

  Widget _buildSearchTextField() {
    final browserModel = Provider.of<BrowserModel>(context, listen: true);
    final settings = browserModel.getSettings();

    final webViewModel = Provider.of<WebViewModel>(context, listen: true);

    return CompositedTransformTarget(
      link: _layerLink,
      child: TextField(
        onChanged: (value) {
          _debounceTimer?.cancel();
          _debounceTimer = Timer(const Duration(milliseconds: 400), () {
            if (mounted && _searchController?.text == value) {
              setState(() {
                _suggestions = URLPredictor.getPredictions(value);
              });
              _updateOverlay();
            }
          });
        },
        onSubmitted: (value) {
          _onSubmitted(value);
        },
        onTap: () {
          if (!shouldSelectText ||
              _searchController == null ||
              _searchController!.text.isEmpty) {
            return;
          }
          shouldSelectText = false;
          _searchController!.selection = TextSelection(
            baseOffset: 0,
            extentOffset: _searchController!.text.length,
          );
        },
        onTapOutside: (event) {
          shouldSelectText = true;
        },
        keyboardType: TextInputType.url,
        focusNode: _focusNode,
        autofocus: false,
        controller: _searchController,
        textInputAction: TextInputAction.go,
        textAlign: TextAlign.center,
        decoration: InputDecoration(
          hintText: "Search or enter address",
          hintStyle: TextStyle(
            color: Colors.white.withOpacity(0.3),
            fontSize: 14.0,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
        ),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 14.0,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildModernLeading(BrowserSettings settings) {
    final webViewModel = Provider.of<WebViewModel>(context, listen: true);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          constraints: const BoxConstraints(maxWidth: 40),
          icon: const Icon(Icons.auto_awesome,
              color: Color(0xFF00E5FF), size: 20),
          onPressed: () => _showAgentDialog(),
        ),
        if (!Util.isMobile()) ...[
          IconButton(
            constraints: const BoxConstraints(maxWidth: 36),
            icon: const Icon(Icons.arrow_back_ios_new,
                size: 14, color: Colors.white70),
            onPressed: () => webViewModel.webViewController?.goBack(),
          ),
          IconButton(
            constraints: const BoxConstraints(maxWidth: 36),
            icon: const Icon(Icons.arrow_forward_ios,
                size: 14, color: Colors.white70),
            onPressed: () => webViewModel.webViewController?.goForward(),
          ),
        ],
      ],
    );
  }

  Widget _buildModernActions(
      WindowModel windowModel, BrowserModel browserModel) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (!Util.isMobile())
          IconButton(
            constraints: const BoxConstraints(maxWidth: 36),
            icon: const Icon(Icons.refresh, size: 18, color: Colors.white70),
            onPressed: () {
              final webViewModel =
                  Provider.of<WebViewModel>(context, listen: false);
              webViewModel.webViewController?.reload();
            },
          ),
        _buildCircularAction(Icons.add, () => addNewTab()),
        const SizedBox(width: 8),
        _buildTabsCountAction(windowModel, browserModel),
        const SizedBox(width: 4),
        _buildMoreAction(),
      ],
    );
  }

  Widget _buildCircularAction(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: Colors.white70, size: 20),
      ),
    );
  }

  Widget _buildTabsCountAction(
      WindowModel windowModel, BrowserModel browserModel) {
    return GestureDetector(
      onTap: () async {
        if (windowModel.webViewTabs.isNotEmpty) {
          var webViewModel = windowModel.getCurrentTab()?.webViewModel;
          if (webViewModel != null) {
            webViewModel.screenshot = await webViewModel.webViewController
                ?.takeScreenshot(
                  screenshotConfiguration: ScreenshotConfiguration(
                    compressFormat: CompressFormat.JPEG,
                    quality: 20,
                  ),
                )
                .timeout(const Duration(milliseconds: 1000),
                    onTimeout: () => null);
          }
          browserModel.showTabScroller = true;
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.white24, width: 1.5),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          windowModel.webViewTabs.length.toString(),
          style: const TextStyle(
              color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildMoreAction() {
    return PopupMenuButton<String>(
      icon: const Icon(Icons.more_vert, color: Colors.white70),
      onSelected: _popupMenuChoiceAction,
      itemBuilder: (context) => PopupMenuActions.choices
          .map((choice) => PopupMenuItem(
                value: choice,
                child: Text(choice),
              ))
          .toList(),
    );
  }

  void _showAgentDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: AlertDialog(
          backgroundColor: Colors.black.withOpacity(0.8),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(32),
              side: const BorderSide(color: Colors.white12)),
          title: const Text("Comet Neural Agent",
              style:
                  TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
          content: TextField(
            controller: controller,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: "Issue a command...",
              hintStyle: TextStyle(color: Colors.white24),
              filled: true,
              fillColor: Colors.white.withOpacity(0.05),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none),
            ),
            onSubmitted: (val) {
              Navigator.pop(context);
              Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (c) => FullScreenAIChat(initialMessage: val)));
            },
          ),
        ),
      ),
    );
  }

  List<Widget> _buildActionsMenu() {
    final browserModel = Provider.of<BrowserModel>(context, listen: true);
    final windowModel = Provider.of<WindowModel>(context, listen: true);
    final settings = browserModel.getSettings();

    return [
      settings.homePageEnabled ? const SizedBox(width: 10.0) : Container(),
      Util.isDesktop()
          ? null
          : InkWell(
              key: tabInkWellKey,
              onLongPress: () {
                final RenderBox? box = tabInkWellKey.currentContext!
                    .findRenderObject() as RenderBox?;
                if (box == null) {
                  return;
                }

                Offset position = box.localToGlobal(Offset.zero);

                showMenu(
                  context: context,
                  position: RelativeRect.fromLTRB(
                    position.dx,
                    position.dy + box.size.height,
                    box.size.width,
                    0,
                  ),
                  items: TabPopupMenuActions.choices.map((tabPopupMenuAction) {
                    IconData? iconData;
                    switch (tabPopupMenuAction) {
                      case TabPopupMenuActions.CLOSE_TABS:
                        iconData = Icons.cancel;
                        break;
                      case TabPopupMenuActions.NEW_TAB:
                        iconData = Icons.add;
                        break;
                      case TabPopupMenuActions.NEW_INCOGNITO_TAB:
                        iconData = MaterialCommunityIcons.incognito;
                        break;
                    }

                    return PopupMenuItem<String>(
                      value: tabPopupMenuAction,
                      child: Row(
                        children: [
                          Icon(iconData, color: Colors.black),
                          Container(
                            padding: const EdgeInsets.only(left: 10.0),
                            child: Text(tabPopupMenuAction),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ).then((value) {
                  switch (value) {
                    case TabPopupMenuActions.CLOSE_TABS:
                      windowModel.closeAllTabs();
                      break;
                    case TabPopupMenuActions.NEW_TAB:
                      addNewTab();
                      break;
                    case TabPopupMenuActions.NEW_INCOGNITO_TAB:
                      addNewIncognitoTab();
                      break;
                  }
                });
              },
              onTap: () async {
                if (windowModel.webViewTabs.isNotEmpty) {
                  var webViewModel = windowModel.getCurrentTab()?.webViewModel;
                  var webViewController = webViewModel?.webViewController;

                  if (View.of(context).viewInsets.bottom > 0.0) {
                    SystemChannels.textInput.invokeMethod('TextInput.hide');
                    if (FocusManager.instance.primaryFocus != null) {
                      FocusManager.instance.primaryFocus!.unfocus();
                    }
                    if (webViewController != null) {
                      await webViewController.evaluateJavascript(
                        source: "document.activeElement.blur();",
                      );
                    }
                    await Future.delayed(const Duration(milliseconds: 300));
                  }

                  if (webViewModel != null && webViewController != null) {
                    webViewModel.screenshot = await webViewController
                        .takeScreenshot(
                          screenshotConfiguration: ScreenshotConfiguration(
                            compressFormat: CompressFormat.JPEG,
                            quality: 20,
                          ),
                        )
                        .timeout(
                          const Duration(milliseconds: 1500),
                          onTimeout: () => null,
                        );
                  }

                  browserModel.showTabScroller = true;
                }
              },
              child: Container(
                margin: const EdgeInsets.only(
                  left: 10.0,
                  top: 15.0,
                  right: 10.0,
                  bottom: 15.0,
                ),
                decoration: BoxDecoration(
                  border: Border.all(width: 2.0),
                  shape: BoxShape.rectangle,
                  borderRadius: BorderRadius.circular(5.0),
                ),
                constraints: const BoxConstraints(minWidth: 25.0),
                child: Center(
                  child: Text(
                    windowModel.webViewTabs.length.toString(),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14.0,
                    ),
                  ),
                ),
              ),
            ),
      const SizedBox.square(dimension: 5),
      PopupMenuButton<String>(
        icon: const Icon(Icons.more_vert),
        position: PopupMenuPosition.under,
        onSelected: _popupMenuChoiceAction,
        itemBuilder: (popupMenuContext) {
          var items = [
            CustomPopupMenuItem<String>(
              enabled: true,
              isIconButtonRow: true,
              child: StatefulBuilder(
                builder: (statefulContext, setState) {
                  var browserModel = Provider.of<BrowserModel>(
                    statefulContext,
                    listen: true,
                  );
                  var webViewModel = Provider.of<WebViewModel>(
                    statefulContext,
                    listen: true,
                  );

                  var isFavorite = false;
                  FavoriteModel? favorite;

                  if (webViewModel.url != null &&
                      webViewModel.url!.toString().isNotEmpty) {
                    favorite = FavoriteModel(
                      url: webViewModel.url,
                      title: webViewModel.title ?? "",
                      favicon: webViewModel.favicon,
                    );
                    isFavorite = browserModel.containsFavorite(favorite);
                  }

                  var children = <Widget>[];

                  if (Util.isIOS() || Util.isMacOS() || Util.isWindows()) {
                    children.add(
                      SizedBox(
                        width: 35.0,
                        child: IconButton(
                          padding: const EdgeInsets.all(0.0),
                          icon: const Icon(
                            Icons.arrow_back,
                            color: Colors.black,
                          ),
                          onPressed: () {
                            webViewModel.webViewController?.goBack();
                            Navigator.pop(popupMenuContext);
                          },
                        ),
                      ),
                    );
                  }

                  children.addAll([
                    SizedBox(
                      width: 35.0,
                      child: IconButton(
                        padding: const EdgeInsets.all(0.0),
                        icon: const Icon(
                          Icons.arrow_forward,
                          color: Colors.black,
                        ),
                        onPressed: () {
                          webViewModel.webViewController?.goForward();
                          Navigator.pop(popupMenuContext);
                        },
                      ),
                    ),
                    SizedBox(
                      width: 35.0,
                      child: IconButton(
                        padding: const EdgeInsets.all(0.0),
                        icon: Icon(
                          isFavorite ? Icons.star : Icons.star_border,
                          color: Colors.black,
                        ),
                        onPressed: () {
                          setState(() {
                            if (favorite != null) {
                              if (!browserModel.containsFavorite(favorite)) {
                                browserModel.addFavorite(favorite);
                              } else if (browserModel.containsFavorite(
                                favorite,
                              )) {
                                browserModel.removeFavorite(favorite);
                              }
                            }
                          });
                        },
                      ),
                    ),
                    SizedBox(
                      width: 35.0,
                      child: IconButton(
                        padding: const EdgeInsets.all(0.0),
                        icon: const Icon(
                          Icons.file_download,
                          color: Colors.black,
                        ),
                        onPressed: () async {
                          Navigator.pop(popupMenuContext);
                          if (webViewModel.url != null &&
                              webViewModel.url!.scheme.startsWith("http")) {
                            var url = webViewModel.url;
                            if (url == null) {
                              return;
                            }

                            String webArchivePath =
                                "$WEB_ARCHIVE_DIR${Platform.pathSeparator}${url.scheme}-${url.host}${url.path.replaceAll("/", "-")}${DateTime.now().microsecondsSinceEpoch}.${Util.isAndroid() ? WebArchiveFormat.MHT.toValue() : WebArchiveFormat.WEBARCHIVE.toValue()}";

                            String? savedPath = (await webViewModel
                                .webViewController
                                ?.saveWebArchive(
                              filePath: webArchivePath,
                              autoname: false,
                            ));

                            var webArchiveModel = WebArchiveModel(
                              url: url,
                              path: savedPath,
                              title: webViewModel.title,
                              favicon: webViewModel.favicon,
                              timestamp: DateTime.now(),
                            );

                            if (savedPath != null) {
                              browserModel.addWebArchive(
                                url.toString(),
                                webArchiveModel,
                              );
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      "${webViewModel.url} saved offline!",
                                    ),
                                  ),
                                );
                              }
                              browserModel.save();
                            } else {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text("Unable to save!"),
                                  ),
                                );
                              }
                            }
                          }
                        },
                      ),
                    ),
                    SizedBox(
                      width: 35.0,
                      child: IconButton(
                        padding: const EdgeInsets.all(0.0),
                        icon: const Icon(
                          Icons.info_outline,
                          color: Colors.black,
                        ),
                        onPressed: () async {
                          Navigator.pop(popupMenuContext);

                          await route?.completed;
                          showUrlInfo();
                        },
                      ),
                    ),
                    SizedBox(
                      width: 35.0,
                      child: IconButton(
                        padding: const EdgeInsets.all(0.0),
                        icon: const Icon(
                          MaterialCommunityIcons.cellphone_screenshot,
                          color: Colors.black,
                        ),
                        onPressed: () async {
                          Navigator.pop(popupMenuContext);

                          await route?.completed;

                          takeScreenshotAndShow();
                        },
                      ),
                    ),
                    SizedBox(
                      width: 35.0,
                      child: IconButton(
                        padding: const EdgeInsets.all(0.0),
                        icon: const Icon(Icons.refresh, color: Colors.black),
                        onPressed: () {
                          webViewModel.webViewController?.reload();
                          Navigator.pop(popupMenuContext);
                        },
                      ),
                    ),
                  ]);

                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    mainAxisSize: MainAxisSize.max,
                    children: children,
                  );
                },
              ),
            ),
          ];

          items.addAll(
            PopupMenuActions.choices.map((choice) {
              switch (choice) {
                case PopupMenuActions.OPEN_NEW_WINDOW:
                  return CustomPopupMenuItem<String>(
                    enabled: true,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [Text(choice), const Icon(Icons.open_in_new)],
                    ),
                  );
                case PopupMenuActions.SAVE_WINDOW:
                  return CustomPopupMenuItem<String>(
                    enabled: true,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        Selector<WindowModel, bool>(
                          selector: (context, windowModel) =>
                              windowModel.shouldSave,
                          builder: (context, value, child) {
                            return Icon(
                              value
                                  ? Icons.check_box
                                  : Icons.check_box_outline_blank,
                              color: Colors.black,
                            );
                          },
                        ),
                      ],
                    ),
                  );
                case PopupMenuActions.SAVED_WINDOWS:
                  return CustomPopupMenuItem<String>(
                    enabled: true,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [Text(choice), const Icon(Icons.window)],
                    ),
                  );
                case PopupMenuActions.NEW_TAB:
                  return CustomPopupMenuItem<String>(
                    enabled: true,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        const Icon(Icons.add, color: Colors.black),
                      ],
                    ),
                  );
                case PopupMenuActions.NEW_INCOGNITO_TAB:
                  return CustomPopupMenuItem<String>(
                    enabled: true,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        const Icon(
                          MaterialCommunityIcons.incognito,
                          color: Colors.black,
                        ),
                      ],
                    ),
                  );
                case PopupMenuActions.FAVORITES:
                  return CustomPopupMenuItem<String>(
                    enabled: true,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        const Icon(Icons.star, color: Colors.yellow),
                      ],
                    ),
                  );
                case PopupMenuActions.WEB_ARCHIVES:
                  return CustomPopupMenuItem<String>(
                    enabled: true,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        const Icon(Icons.offline_pin, color: Colors.blue),
                      ],
                    ),
                  );
                case PopupMenuActions.DESKTOP_MODE:
                  return CustomPopupMenuItem<String>(
                    enabled: windowModel.getCurrentTab() != null,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        Selector<WebViewModel, bool>(
                          selector: (context, webViewModel) =>
                              webViewModel.isDesktopMode,
                          builder: (context, value, child) {
                            return Icon(
                              value
                                  ? Icons.check_box
                                  : Icons.check_box_outline_blank,
                              color: Colors.black,
                            );
                          },
                        ),
                      ],
                    ),
                  );
                case PopupMenuActions.HISTORY:
                  return CustomPopupMenuItem<String>(
                    enabled: windowModel.getCurrentTab() != null,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        const Icon(Icons.history, color: Colors.black),
                      ],
                    ),
                  );
                case PopupMenuActions.SHARE:
                  return CustomPopupMenuItem<String>(
                    enabled: windowModel.getCurrentTab() != null,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        const Icon(Ionicons.logo_whatsapp, color: Colors.green),
                      ],
                    ),
                  );
                case PopupMenuActions.SETTINGS:
                  return CustomPopupMenuItem<String>(
                    enabled: true,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        const Icon(Icons.settings, color: Colors.grey),
                      ],
                    ),
                  );
                case PopupMenuActions.DEVELOPERS:
                  return CustomPopupMenuItem<String>(
                    enabled: windowModel.getCurrentTab() != null,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        const Icon(Icons.developer_mode, color: Colors.black),
                      ],
                    ),
                  );
                case PopupMenuActions.FIND_ON_PAGE:
                  return CustomPopupMenuItem<String>(
                    enabled: windowModel.getCurrentTab() != null,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        const Icon(Icons.search, color: Colors.black),
                      ],
                    ),
                  );
                case PopupMenuActions.AI_ASSISTANT:
                  return CustomPopupMenuItem<String>(
                    enabled: windowModel.getCurrentTab() != null,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        const Icon(
                          Icons.auto_awesome,
                          color: Color(0xFF00E5FF),
                        ),
                      ],
                    ),
                  );
                case PopupMenuActions.SYNC_WITH_DESKTOP:
                  return CustomPopupMenuItem<String>(
                    enabled: true,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        const Icon(Icons.sync, color: Colors.blue),
                      ],
                    ),
                  );
                case PopupMenuActions.INAPPWEBVIEW_PROJECT:
                  return CustomPopupMenuItem<String>(
                    enabled: true,
                    value: choice,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(choice),
                        Container(
                          padding: const EdgeInsets.only(right: 6),
                          child: const AnimatedFlutterBrowserLogo(size: 12.5),
                        ),
                      ],
                    ),
                  );
                default:
                  return CustomPopupMenuItem<String>(
                    value: choice,
                    child: Text(choice),
                  );
              }
            }).toList(),
          );

          return items;
        },
      ),
    ].whereNotNull().toList();
  }

  void _popupMenuChoiceAction(String choice) async {
    var currentWebViewModel = Provider.of<WebViewModel>(context, listen: false);

    switch (choice) {
      case PopupMenuActions.OPEN_NEW_WINDOW:
        openNewWindow();
        break;
      case PopupMenuActions.SAVE_WINDOW:
        setShouldSave();
        break;
      case PopupMenuActions.SAVED_WINDOWS:
        showSavedWindows();
        break;
      case PopupMenuActions.NEW_TAB:
        addNewTab();
        break;
      case PopupMenuActions.NEW_INCOGNITO_TAB:
        addNewIncognitoTab();
        break;
      case PopupMenuActions.FAVORITES:
        showFavorites();
        break;
      case PopupMenuActions.HISTORY:
        showHistory();
        break;
      case PopupMenuActions.WEB_ARCHIVES:
        showWebArchives();
        break;
      case PopupMenuActions.FIND_ON_PAGE:
        var isFindInteractionEnabled =
            currentWebViewModel.settings?.isFindInteractionEnabled ?? false;
        var findInteractionController =
            currentWebViewModel.findInteractionController;
        if ((Util.isIOS() || Util.isMacOS()) &&
            isFindInteractionEnabled &&
            findInteractionController != null) {
          await findInteractionController.presentFindNavigator();
        } else if (widget.showFindOnPage != null) {
          widget.showFindOnPage!();
        }
        break;
      case PopupMenuActions.SHARE:
        share();
        break;
      case PopupMenuActions.AI_ASSISTANT:
        _showAIAssistant();
        break;
      case PopupMenuActions.SYNC_WITH_DESKTOP:
        _showSyncDialog();
        break;
      case PopupMenuActions.DESKTOP_MODE:
        toggleDesktopMode();
        break;
      case PopupMenuActions.DEVELOPERS:
        Future.delayed(const Duration(milliseconds: 300), () {
          goToDevelopersPage();
        });
        break;
      case PopupMenuActions.SETTINGS:
        Future.delayed(const Duration(milliseconds: 300), () {
          goToSettingsPage();
        });
        break;
      case PopupMenuActions.INAPPWEBVIEW_PROJECT:
        Future.delayed(const Duration(milliseconds: 300), () {
          openProjectPopup();
        });
        break;
    }
  }

  void addNewTab({WebUri? url}) {
    final browserModel = Provider.of<BrowserModel>(context, listen: false);
    final windowModel = Provider.of<WindowModel>(context, listen: false);
    final settings = browserModel.getSettings();

    url ??= settings.homePageEnabled && settings.customUrlHomePage.isNotEmpty
        ? WebUri(settings.customUrlHomePage)
        : WebUri(settings.searchEngine.url);

    windowModel.addTab(
      WebViewTab(
        key: GlobalKey(),
        webViewModel: WebViewModel(url: url),
      ),
    );
  }

  void addNewIncognitoTab({WebUri? url}) {
    final browserModel = Provider.of<BrowserModel>(context, listen: false);
    final windowModel = Provider.of<WindowModel>(context, listen: false);
    final settings = browserModel.getSettings();

    url ??= settings.homePageEnabled && settings.customUrlHomePage.isNotEmpty
        ? WebUri(settings.customUrlHomePage)
        : WebUri(settings.searchEngine.url);

    windowModel.addTab(
      WebViewTab(
        key: GlobalKey(),
        webViewModel: WebViewModel(url: url, isIncognitoMode: true),
      ),
    );
  }

  void showSavedWindows() {
    showDialog(
      context: context,
      builder: (context) {
        final browserModel = Provider.of<BrowserModel>(context, listen: true);

        return AlertDialog(
          contentPadding: const EdgeInsets.all(0.0),
          content: SizedBox(
            width: double.maxFinite,
            child: StatefulBuilder(
              builder: (context, setState) {
                return FutureBuilder(
                  future: browserModel.getWindows(),
                  builder: (context, snapshot) {
                    final savedWindows = (snapshot.data ?? []);
                    savedWindows.sortBy((e) => e.updatedTime);
                    return ListView(
                      children: savedWindows.map((window) {
                        return ListTile(
                          title: Text(
                            window.name.isNotEmpty ? window.name : window.id,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          onTap: () async {
                            await browserModel.openWindow(window);
                            setState(() {
                              Navigator.pop(context);
                            });
                          },
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: <Widget>[
                              IconButton(
                                icon: const Icon(Icons.close, size: 20.0),
                                onPressed: () async {
                                  await browserModel.removeWindow(window);
                                  setState(() {
                                    if (savedWindows.isEmpty ||
                                        savedWindows.length == 1) {
                                      Navigator.pop(context);
                                    }
                                  });
                                },
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    );
                  },
                );
              },
            ),
          ),
        );
      },
    );
  }

  void showFavorites() {
    showDialog(
      context: context,
      builder: (context) {
        var browserModel = Provider.of<BrowserModel>(context, listen: true);

        return AlertDialog(
          contentPadding: const EdgeInsets.all(0.0),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView(
              children: browserModel.favorites.map((favorite) {
                var url = favorite.url;
                var faviconUrl = favorite.favicon != null
                    ? favorite.favicon!.url
                    : WebUri("${url?.origin ?? ""}/favicon.ico");

                return ListTile(
                  leading: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      // CachedNetworkImage(
                      //   placeholder: (context, url) =>
                      //       CircularProgressIndicator(),
                      //   imageUrl: faviconUrl,
                      //   height: 30,
                      // )
                      CustomImage(
                        url: faviconUrl,
                        maxWidth: 30.0,
                        height: 30.0,
                      ),
                    ],
                  ),
                  title: Text(
                    favorite.title ?? favorite.url?.toString() ?? "",
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    favorite.url?.toString() ?? "",
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  isThreeLine: true,
                  onTap: () {
                    setState(() {
                      addNewTab(url: favorite.url);
                      Navigator.pop(context);
                    });
                  },
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      IconButton(
                        icon: const Icon(Icons.close, size: 20.0),
                        onPressed: () {
                          setState(() {
                            browserModel.removeFavorite(favorite);
                            if (browserModel.favorites.isEmpty) {
                              Navigator.pop(context);
                            }
                          });
                        },
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        );
      },
    );
  }

  void showHistory() {
    showDialog(
      context: context,
      builder: (context) {
        var webViewModel = Provider.of<WebViewModel>(context, listen: true);

        return AlertDialog(
          contentPadding: const EdgeInsets.all(0.0),
          content: FutureBuilder(
            future: webViewModel.webViewController?.getCopyBackForwardList(),
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                return Container();
              }

              WebHistory history = snapshot.data as WebHistory;
              return SizedBox(
                width: double.maxFinite,
                child: ListView(
                  children: history.list?.reversed.map((historyItem) {
                        var url = historyItem.url;

                        return ListTile(
                          leading: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: <Widget>[
                              // CachedNetworkImage(
                              //   placeholder: (context, url) =>
                              //       CircularProgressIndicator(),
                              //   imageUrl: (url?.origin ?? "") + "/favicon.ico",
                              //   height: 30,
                              // )
                              CustomImage(
                                url: WebUri("${url?.origin ?? ""}/favicon.ico"),
                                maxWidth: 30.0,
                                height: 30.0,
                              ),
                            ],
                          ),
                          title: Text(
                            historyItem.title ?? url.toString(),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            url?.toString() ?? "",
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          isThreeLine: true,
                          onTap: () {
                            webViewModel.webViewController?.goTo(
                              historyItem: historyItem,
                            );
                            Navigator.pop(context);
                          },
                        );
                      }).toList() ??
                      <Widget>[],
                ),
              );
            },
          ),
        );
      },
    );
  }

  void showWebArchives() async {
    showDialog(
      context: context,
      builder: (context) {
        var browserModel = Provider.of<BrowserModel>(context, listen: true);
        var webArchives = browserModel.webArchives;

        var listViewChildren = <Widget>[];
        webArchives.forEach((key, webArchive) {
          var path = webArchive.path;
          // String fileName = path.substring(path.lastIndexOf('/') + 1);

          var url = webArchive.url;

          listViewChildren.add(
            ListTile(
              leading: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  // CachedNetworkImage(
                  //   placeholder: (context, url) => CircularProgressIndicator(),
                  //   imageUrl: (url?.origin ?? "") + "/favicon.ico",
                  //   height: 30,
                  // )
                  CustomImage(
                    url: WebUri("${url?.origin ?? ""}/favicon.ico"),
                    maxWidth: 30.0,
                    height: 30.0,
                  ),
                ],
              ),
              title: Text(
                webArchive.title ?? url?.toString() ?? "",
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Text(
                url?.toString() ?? "",
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: IconButton(
                icon: const Icon(Icons.delete),
                onPressed: () async {
                  setState(() {
                    browserModel.removeWebArchive(webArchive);
                    browserModel.save();
                  });
                },
              ),
              isThreeLine: true,
              onTap: () {
                if (path != null) {
                  final windowModel = Provider.of<WindowModel>(
                    context,
                    listen: false,
                  );
                  windowModel.addTab(
                    WebViewTab(
                      key: GlobalKey(),
                      webViewModel: WebViewModel(url: WebUri("file://$path")),
                    ),
                  );
                }
                Navigator.pop(context);
              },
            ),
          );
        });

        return AlertDialog(
          contentPadding: const EdgeInsets.all(0.0),
          content: Builder(
            builder: (context) {
              return SizedBox(
                width: double.maxFinite,
                child: ListView(children: listViewChildren),
              );
            },
          ),
        );
      },
    );
  }

  void share() {
    final windowModel = Provider.of<WindowModel>(context, listen: false);
    final webViewModel = windowModel.getCurrentTab()?.webViewModel;
    final url = webViewModel?.url;
    if (url != null) {
      Share.share(url.toString(), subject: webViewModel?.title);
    }
  }

  void openNewWindow() {
    final browserModel = Provider.of<BrowserModel>(context, listen: false);
    browserModel.openWindow(null);
  }

  void setShouldSave() {
    final windowModel = Provider.of<WindowModel>(context, listen: false);
    windowModel.shouldSave = !windowModel.shouldSave;
  }

  void toggleDesktopMode() async {
    final windowModel = Provider.of<WindowModel>(context, listen: false);
    final webViewModel = windowModel.getCurrentTab()?.webViewModel;
    final webViewController = webViewModel?.webViewController;

    final currentWebViewModel = Provider.of<WebViewModel>(
      context,
      listen: false,
    );

    if (webViewController != null) {
      webViewModel?.isDesktopMode = !webViewModel.isDesktopMode;
      currentWebViewModel.isDesktopMode = webViewModel?.isDesktopMode ?? false;

      final currentSettings = await webViewController.getSettings();
      if (currentSettings != null) {
        currentSettings.preferredContentMode =
            webViewModel?.isDesktopMode ?? false
                ? UserPreferredContentMode.DESKTOP
                : UserPreferredContentMode.RECOMMENDED;
        await webViewController.setSettings(settings: currentSettings);
      }
      await webViewController.reload();
    }
  }

  void showUrlInfo() {
    var webViewModel = Provider.of<WebViewModel>(context, listen: false);
    var url = webViewModel.url;
    if (url == null || url.toString().isEmpty) {
      return;
    }

    route = CustomPopupDialog.show(
      context: context,
      transitionDuration: customPopupDialogTransitionDuration,
      builder: (context) {
        return UrlInfoPopup(
          route: route!,
          transitionDuration: customPopupDialogTransitionDuration,
          onWebViewTabSettingsClicked: () {
            goToSettingsPage();
          },
        );
      },
    );
  }

  void goToDevelopersPage() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const DevelopersPage()),
    );
  }

  void goToSettingsPage() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SettingsPage()),
    );
  }

  void openProjectPopup() {
    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      pageBuilder: (context, animation, secondaryAnimation) {
        return const ProjectInfoPopup();
      },
      transitionDuration: const Duration(milliseconds: 300),
    );
  }

  void takeScreenshotAndShow() async {
    var webViewModel = Provider.of<WebViewModel>(context, listen: false);
    var screenshot = await webViewModel.webViewController?.takeScreenshot();

    if (screenshot != null) {
      var dir = await getApplicationDocumentsDirectory();
      File file = File(
        "${dir.path}/screenshot_${DateTime.now().microsecondsSinceEpoch}.png",
      );
      await file.writeAsBytes(screenshot);

      await showDialog(
        context: context,
        builder: (context) {
          return AlertDialog(
            content: Image.memory(screenshot),
            actions: <Widget>[
              ElevatedButton(
                child: const Text("Share"),
                onPressed: () async {
                  await Share.shareXFiles([XFile(file.path)]);
                },
              ),
            ],
          );
        },
      );

      file.delete();
    }
  }

  void _showAIAssistant() {
    final windowModel = Provider.of<WindowModel>(context, listen: false);
    final webViewModel = windowModel.getCurrentTab()?.webViewModel;
    final webViewController = webViewModel?.webViewController;

    if (webViewController == null) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF1E1E1E),
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 10),
              Container(
                width: 40,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(5),
                ),
              ),
              const Padding(
                padding: EdgeInsets.all(20.0),
                child: Text(
                  "Comet AI Intelligence",
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF00E5FF),
                  ),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.summarize, color: Colors.blue),
                title: const Text("Summarize Page"),
                subtitle: const Text("Get a quick overview of this content"),
                onTap: () {
                  Navigator.pop(context);
                  _runAIAction("summarize");
                },
              ),
              ListTile(
                leading: const Icon(Icons.psychology, color: Colors.orange),
                title: const Text("Explain Content"),
                subtitle: const Text("Deep dive analysis of the current page"),
                onTap: () {
                  Navigator.pop(context);
                  _runAIAction("explain");
                },
              ),
              ListTile(
                leading: const Icon(Icons.translate, color: Colors.green),
                title: const Text("Translate & Simplify"),
                subtitle: const Text("Make the content easier to read"),
                onTap: () {
                  Navigator.pop(context);
                  _runAIAction("simplify");
                },
              ),
              ListTile(
                leading: const Icon(Icons.touch_app, color: Color(0xFFD500F9)),
                title: const Text("Smart Click"),
                subtitle: const Text("Tell the agent what to click on screen"),
                onTap: () {
                  Navigator.pop(context);
                  _showClickDialog();
                },
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  void _runAIAction(String action) async {
    final browserModel = Provider.of<BrowserModel>(context, listen: false);
    final settings = browserModel.getSettings();
    final windowModel = Provider.of<WindowModel>(context, listen: false);
    final webViewModel = windowModel.getCurrentTab()?.webViewModel;
    final webViewController = webViewModel?.webViewController;

    if (webViewController == null) return;

    final isGemini = settings.geminiModel.toLowerCase().contains('gemini');
    final apiKey = isGemini ? settings.geminiApiKey : settings.claudeApiKey;

    if (apiKey.isEmpty) {
      _showErrorSnackBar(
          "API Key required for AI actions. Please set it in Settings.");
      return;
    }

    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
      ),
    );

    try {
      final agent = CometAgentService(
        apiKey: apiKey,
        model: settings.geminiModel,
        webViewController: webViewController,
      );

      String result = "";
      if (action == "summarize") {
        final text = await webViewController.evaluateJavascript(
            source: "document.body.innerText");
        result = await agent.summarizePage(text.toString());
      } else if (action == "explain") {
        final text = await webViewController.evaluateJavascript(
            source: "document.body.innerText");
        result = await agent.performOneShotAction(
            "Explain the main concepts of this page: $text");
      } else if (action == "simplify") {
        final text = await webViewController.evaluateJavascript(
            source: "document.body.innerText");
        result = await agent.performOneShotAction(
            "Simplify this content for easy reading: $text");
      }

      if (mounted) Navigator.pop(context); // Hide loading

      _showAIResultDialog(
        "${action[0].toUpperCase()}${action.substring(1)}",
        result,
      );
    } catch (e) {
      if (mounted) Navigator.pop(context); // Hide loading
      _showErrorSnackBar("AI Action failed: $e");
    }
  }

  void _showClickDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text("Smart Click",
            style: TextStyle(color: Color(0xFF00E5FF))),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            hintText: "E.g., click the login button",
            hintStyle: TextStyle(color: Colors.white24),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _executeSmartClick(controller.text);
            },
            child: const Text("Execute"),
          ),
        ],
      ),
    );
  }

  void _executeSmartClick(String goal) async {
    final browserModel = Provider.of<BrowserModel>(context, listen: false);
    final settings = browserModel.getSettings();
    final webViewModel = Provider.of<WebViewModel>(context, listen: false);
    final webViewController = webViewModel.webViewController;

    if (webViewController == null) return;

    final isGemini = settings.geminiModel.toLowerCase().contains('gemini');
    final apiKey = isGemini ? settings.geminiApiKey : settings.claudeApiKey;

    if (apiKey.isEmpty) {
      _showErrorSnackBar("API Key required.");
      return;
    }

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
          child: CircularProgressIndicator(color: Color(0xFFD500F9))),
    );

    try {
      final screenshot = await webViewController.takeScreenshot();
      if (screenshot == null) throw Exception("Could not capture screen");
      final base64Image = base64Encode(screenshot);

      final agent = CometAgentService(
        apiKey: apiKey,
        model: settings.geminiModel,
        webViewController: webViewController,
      );

      final analysis = await agent.analyzeForClick(goal, base64Image);

      if (mounted) Navigator.pop(context); // Hide loading

      if (analysis['point'] != null) {
        final x = (analysis['point']['x'] as num).toDouble();
        final y = (analysis['point']['y'] as num).toDouble();

        // Execute click using javascript
        await webViewController.evaluateJavascript(source: """
          var el = document.elementFromPoint($x, $y);
          if (el) {
            el.click();
            el.focus();
          }
        """);

        _showSuccessSnackBar("Clicked: ${analysis['description'] ?? 'Target'}");
      } else {
        _showErrorSnackBar(
            "Could not identify target: ${analysis['explanation']}");
      }
    } catch (e) {
      if (mounted) Navigator.pop(context);
      _showErrorSnackBar("Smart Click failed: $e");
    }
  }

  void _showAIResultDialog(String title, String content) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: Text(title, style: const TextStyle(color: Color(0xFF00E5FF))),
        content: SingleChildScrollView(
          child: Text(content,
              style: const TextStyle(
                  color: Colors.white70, fontSize: 14, height: 1.5)),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Close")),
        ],
      ),
    );
  }

  void _showErrorSnackBar(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red),
    );
  }

  void _showSuccessSnackBar(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: const Color(0xFF00FF88)),
    );
  }

  void _showSyncDialog() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const ConnectDesktopPage()),
    );
  }

  void _onSubmitted(String value) {
    if (value.isEmpty) return;
    final browserModel = Provider.of<BrowserModel>(context, listen: false);
    final settings = browserModel.getSettings();
    final webViewModel = Provider.of<WebViewModel>(context, listen: false);

    var url = WebUri(value.trim());
    if (Util.isLocalizedContent(url) ||
        (url.isValidUri && url.toString().split(".").length > 1)) {
      url = url.scheme.isEmpty ? WebUri("https://$url") : url;
    } else {
      url = WebUri(settings.searchEngine.searchUrl + value);
    }

    if (webViewModel.webViewController != null) {
      if (value.startsWith('>>')) {
        // Double arrow -> Autonomous Browser Agent
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) =>
                AgentChatPage(initialTask: value.substring(2).trim()),
          ),
        );
      } else if (value.startsWith('>')) {
        // Single arrow -> Desktop Control Chat
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) =>
                FullScreenAIChat(initialMessage: value.substring(1).trim()),
          ),
        );
      } else {
        webViewModel.webViewController?.loadUrl(
          urlRequest: URLRequest(url: url),
        );
      }
    } else {
      addNewTab(url: url);
      webViewModel.url = url;
    }
    _hideSuggestionsOverlay();
    _focusNode?.unfocus();
  }

  void _showSuggestionsOverlay() {
    _overlayEntry = _createOverlayEntry();
    Overlay.of(context).insert(_overlayEntry!);
  }

  void _hideSuggestionsOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  void _updateOverlay() {
    _overlayEntry?.markNeedsBuild();
  }

  OverlayEntry _createOverlayEntry() {
    RenderBox? renderBox = context.findRenderObject() as RenderBox?;
    var size = renderBox?.size ?? Size.zero;

    return OverlayEntry(
      builder: (context) => Positioned(
        width: size.width - 100,
        child: CompositedTransformFollower(
          link: _layerLink,
          showWhenUnlinked: false,
          offset: const Offset(40.0, 42.0),
          child: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(12),
            color: const Color(0xFF1E1E1E),
            child: Container(
              constraints: const BoxConstraints(maxHeight: 250),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border:
                    Border.all(color: const Color(0xFF00E5FF).withOpacity(0.3)),
              ),
              child: _suggestions.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(10.0),
                      child: Text("No suggestions",
                          style:
                              TextStyle(color: Colors.white38, fontSize: 12)),
                    )
                  : ListView.builder(
                      padding: EdgeInsets.zero,
                      shrinkWrap: true,
                      itemCount: _suggestions.length,
                      itemBuilder: (context, index) {
                        final suggestion = _suggestions[index];
                        return ListTile(
                          dense: true,
                          leading: const Icon(Icons.link,
                              color: Color(0xFF00E5FF), size: 18),
                          title: Text(suggestion,
                              style: const TextStyle(
                                  color: Colors.white, fontSize: 14)),
                          onTap: () {
                            _searchController?.text = suggestion;
                            _onSubmitted(suggestion);
                          },
                        );
                      },
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
