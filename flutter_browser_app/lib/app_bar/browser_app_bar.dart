import 'package:flutter/material.dart';
import 'package:flutter_browser/app_bar/desktop_app_bar.dart';
import 'package:flutter_browser/app_bar/find_on_page_app_bar.dart';
import 'package:flutter_browser/app_bar/webview_tab_app_bar.dart';
import 'package:flutter_browser/util.dart';
import 'package:provider/provider.dart';
import 'package:flutter_browser/models/webview_model.dart';

class BrowserAppBar extends StatefulWidget implements PreferredSizeWidget {
  BrowserAppBar({super.key});

  @override
  State<BrowserAppBar> createState() => _BrowserAppBarState();

  @override
  Size get preferredSize =>
      Size.fromHeight(Util.isMobile() ? 100.0 : 90.0);
}

class _BrowserAppBarState extends State<BrowserAppBar> {
  bool _isFindingOnPage = false;

  @override
  Widget build(BuildContext context) {
    return Consumer<WebViewModel>(
      builder: (context, webViewModel, child) {
        bool isVisible = webViewModel.isAppBarVisible;
        double height = Util.isMobile() ? 100.0 : 90.0;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          height: isVisible ? height : 0,
          clipBehavior: Clip.hardEdge,
          decoration: const BoxDecoration(color: Colors.transparent),
          child: _buildAppBarContent(context),
        );
      },
    );
  }

  Widget _buildAppBarContent(BuildContext context) {
    final List<Widget> children = [];

    if (Util.isDesktop()) {
      children.add(const DesktopAppBar());
    }

    children.add(_isFindingOnPage
        ? FindOnPageAppBar(
            hideFindOnPage: () {
              setState(() {
                _isFindingOnPage = false;
              });
            },
          )
        : WebViewTabAppBar(
            showFindOnPage: () {
              setState(() {
                _isFindingOnPage = true;
              });
            },
          ));

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
  }
}
