import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'dart:ui';
import 'tabs_panel.dart';
import 'visualizer.dart';
import 'features_overlay.dart';

import 'package:provider/provider.dart';
import 'services/music_service.dart';
import 'pages/settings_page.dart';
import 'sync_service.dart';

class BrowserPage extends StatefulWidget {
  const BrowserPage({super.key});

  @override
  State<BrowserPage> createState() => _BrowserPageState();
}

class _BrowserPageState extends State<BrowserPage> {
  late final WebViewController _controller;
  final TextEditingController _urlController = TextEditingController(
    text: 'https://www.google.com',
  );
  bool _isLoading = false;
  double _progress = 0;

  static const platform = MethodChannel('com.example.comet_ai/browser');

  static const List<String> _topSites = [
    'google.com',
    'youtube.com',
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'wikipedia.org',
    'reddit.com',
    'amazon.com',
    'netflix.com',
    'linkedin.com',
    'openai.com',
  ];

  @override
  void initState() {
    super.initState();

    // Setup MethodChannel Listener for Deep Links
    platform.setMethodCallHandler((call) async {
      if (call.method == 'openUrl') {
        final String? url = call.arguments as String?;
        if (url != null) {
          _controller.loadRequest(Uri.parse(url));
        }
      } else if (call.method == 'processText') {
        final String? text = call.arguments as String?;
        if (text != null && mounted) {
          _showAIActionDialog(text);
        }
      }
    });

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            setState(() {
              _progress = progress / 100;
            });
          },
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
              _urlController.text = url;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
          },
          onWebResourceError: (WebResourceError error) {},
          onNavigationRequest: (NavigationRequest request) {
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse('https://www.google.com'));
  }

  void _loadUrl() {
    String url = _urlController.text.trim();
    if (!url.startsWith('http')) {
      if (url.contains('.') && !url.contains(' ')) {
        url = 'https://$url';
      } else {
        url = 'https://www.google.com/search?q=${Uri.encodeComponent(url)}';
      }
    }
    _controller.loadRequest(Uri.parse(url));
    FocusScope.of(context).unfocus();
  }

  Future<void> _addToHomeScreen() async {
    final url = await _controller.currentUrl();
    final title = await _controller.getTitle();
    if (url != null && title != null) {
      try {
        await platform.invokeMethod('createShortcut', {
          'url': url,
          'title': title,
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Shortcut created on Home Screen')),
          );
        }
      } catch (e) {
        debugPrint("Error creating shortcut: $e");
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020205),
      body: Stack(
        children: [
          // Background Glows
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.cyan.withOpacity(0.2),
              ),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 100, sigmaY: 100),
                child: Container(color: Colors.transparent),
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            left: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.purpleAccent.withOpacity(0.15),
              ),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
                child: Container(color: Colors.transparent),
              ),
            ),
          ),

          // Main Content
          SafeArea(
            child: Column(
              children: [
                // Top Bar (Address Bar)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  child: Row(
                    children: [
                      _buildGlassButton(
                        icon: LucideIcons.settings,
                        onTap: () {
                          final musicService = Provider.of<MusicService>(
                            context,
                            listen: false,
                          );
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  SettingsPage(musicService: musicService),
                            ),
                          );
                        },
                      ),
                      const SizedBox(width: 12),
                      _buildGlassButton(
                        icon: Icons.add_to_home_screen,
                        onTap: () {
                          _addToHomeScreen();
                        },
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          height: 48,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.1),
                            ),
                          ),
                          child: Row(
                            children: [
                              const SizedBox(width: 4),
                              Consumer<SyncService>(
                                builder: (context, syncService, _) {
                                  if (syncService.user?.photoURL != null) {
                                    return Padding(
                                      padding: const EdgeInsets.only(
                                        left: 8.0,
                                        right: 4.0,
                                      ),
                                      child: CircleAvatar(
                                        radius: 10,
                                        backgroundImage: NetworkImage(
                                          syncService.user!.photoURL!,
                                        ),
                                      ),
                                    );
                                  }
                                  return Padding(
                                    padding: const EdgeInsets.only(
                                      left: 8.0,
                                      right: 4.0,
                                    ),
                                    child: Icon(
                                      LucideIcons.shieldCheck,
                                      size: 18,
                                      color: Colors.cyan[400],
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: LayoutBuilder(
                                  builder: (context, constraints) {
                                    return Autocomplete<String>(
                                      optionsBuilder:
                                          (TextEditingValue textEditingValue) {
                                            if (textEditingValue.text.isEmpty) {
                                              return const Iterable<
                                                String
                                              >.empty();
                                            }
                                            final history =
                                                Provider.of<SyncService>(
                                                      context,
                                                      listen: false,
                                                    ).history
                                                    .map(
                                                      (e) => e['url'] as String,
                                                    )
                                                    .toList();

                                            final allSites = {
                                              ..._topSites,
                                              ...history,
                                            }.toList();

                                            return allSites.where((
                                              String option,
                                            ) {
                                              return option.contains(
                                                textEditingValue.text
                                                    .toLowerCase(),
                                              );
                                            });
                                          },
                                      onSelected: (String selection) {
                                        _urlController.text = selection;
                                        _loadUrl();
                                      },
                                      fieldViewBuilder:
                                          (
                                            context,
                                            textEditingController,
                                            focusNode,
                                            onFieldSubmitted,
                                          ) {
                                            // Sync internal controller with our _urlController
                                            // Note: reusing _urlController for Autocomplete is tricky, standard practice
                                            // is to let Autocomplete manage it or sync.
                                            // Here we will use the Autocomplete's controller to drive the UI but sync changes to _urlController manually if needed,
                                            // OR just replace _urlController usage with this one.
                                            // For simplicity in this diff, we bind to the provided controller.

                                            return TextField(
                                              controller: textEditingController,
                                              focusNode: focusNode,
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 14,
                                                fontWeight: FontWeight.w500,
                                              ),
                                              decoration: const InputDecoration(
                                                border: InputBorder.none,
                                                hintText: 'Search or enter URL',
                                                hintStyle: TextStyle(
                                                  color: Colors.white24,
                                                ),
                                                contentPadding: EdgeInsets.only(
                                                  bottom: 12,
                                                ), // Align vertically
                                              ),
                                              onSubmitted: (val) {
                                                _urlController.text = val;
                                                _loadUrl();
                                              },
                                              onChanged: (val) =>
                                                  _urlController.text = val,
                                            );
                                          },
                                      optionsViewBuilder:
                                          (context, onSelected, options) {
                                            return Align(
                                              alignment: Alignment.topLeft,
                                              child: Material(
                                                color: const Color(0xFF0D0D15),
                                                elevation: 4.0,
                                                borderRadius:
                                                    BorderRadius.circular(16),
                                                child: Container(
                                                  width: constraints.maxWidth,
                                                  constraints:
                                                      const BoxConstraints(
                                                        maxHeight: 250,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    border: Border.all(
                                                      color: Colors.white
                                                          .withOpacity(0.1),
                                                    ),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          16,
                                                        ),
                                                    color: const Color(
                                                      0xFF0D0D15,
                                                    ),
                                                  ),
                                                  child: ListView.builder(
                                                    padding: EdgeInsets.zero,
                                                    itemCount: options.length,
                                                    itemBuilder:
                                                        (
                                                          BuildContext context,
                                                          int index,
                                                        ) {
                                                          final String option =
                                                              options.elementAt(
                                                                index,
                                                              );
                                                          return ListTile(
                                                            leading: const Icon(
                                                              Icons.history,
                                                              size: 16,
                                                              color: Colors
                                                                  .white38,
                                                            ),
                                                            title: Text(
                                                              option,
                                                              style:
                                                                  const TextStyle(
                                                                    color: Colors
                                                                        .white70,
                                                                  ),
                                                            ),
                                                            onTap: () {
                                                              onSelected(
                                                                option,
                                                              );
                                                            },
                                                          );
                                                        },
                                                  ),
                                                ),
                                              ),
                                            );
                                          },
                                    );
                                  },
                                ),
                              ),
                              if (_isLoading)
                                Padding(
                                  padding: const EdgeInsets.only(right: 12),
                                  child: SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.cyan[400]!,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // WebView
                Expanded(
                  child: Stack(
                    children: [
                      WebViewWidget(controller: _controller),
                      if (_progress < 1.0)
                        Positioned(
                          top: 0,
                          left: 0,
                          right: 0,
                          child: LinearProgressIndicator(
                            value: _progress,
                            backgroundColor: Colors.transparent,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.cyan[400]!,
                            ),
                            minHeight: 2,
                          ),
                        ),
                    ],
                  ),
                ),

                // Bottom Navigation
                Container(
                  padding: EdgeInsets.only(
                    top: 15,
                    bottom: MediaQuery.of(context).padding.bottom + 10,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF020205),
                    border: Border(
                      top: BorderSide(color: Colors.white.withOpacity(0.05)),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildNavIcon(
                        LucideIcons.arrowLeft,
                        onTap: () async {
                          if (await _controller.canGoBack()) {
                            _controller.goBack();
                          }
                        },
                      ),
                      _buildNavIcon(
                        LucideIcons.arrowRight,
                        onTap: () async {
                          if (await _controller.canGoForward()) {
                            _controller.goForward();
                          }
                        },
                      ),
                      _buildCenterButton(),
                      _buildNavIcon(
                        LucideIcons.sparkles,
                        color: Colors.amber[400],
                        onTap: () {
                          _showAISummary();
                        },
                      ),
                      _buildNavIcon(
                        LucideIcons.rotateCw,
                        onTap: () => _controller.reload(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showAIActionDialog(String text) async {
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF0D0D15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text(
          "Comet AI Actions",
          style: TextStyle(color: Colors.white),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              "Selected Text: \"${text.length > 50 ? '${text.substring(0, 50)}...' : text}\"",
              style: const TextStyle(color: Colors.white54),
            ),
            const SizedBox(height: 20),
            _actionTile(LucideIcons.fileText, "Summarize", () {
              Navigator.pop(context);
              _showAISummaryOverlay(
                "Summary: ${text.split(' ').take(5).join(' ')}...",
              );
            }),
            _actionTile(LucideIcons.mail, "Write Email Reply", () {
              Navigator.pop(context);
              _showAISummaryOverlay(
                "Draft: Dear Sender,\n\nRegarding '$text', I would like to say...",
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _actionTile(IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: Colors.cyan),
      title: Text(label, style: const TextStyle(color: Colors.white)),
      onTap: onTap,
    );
  }

  void _showAISummaryOverlay(String content) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (c) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Color(0xFF0D0D15),
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Text(content, style: const TextStyle(color: Colors.white)),
      ),
    );
  }

  void _showAISummary() async {
    final url = await _controller.currentUrl();
    if (url == null) return;

    String aiInsight;
    try {
      final String result = await platform.invokeMethod('analyzeWebPage', {
        'url': url,
      });
      aiInsight = result;
    } on PlatformException catch (e) {
      aiInsight = "Failed to get insight: '${e.message}'.";
    }

    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: const Color(0xFF0D0D15),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(LucideIcons.sparkles, color: Colors.amber[400], size: 24),
                const SizedBox(width: 12),
                const Text(
                  'COMET AI INSIGHT',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.star, color: Colors.cyan),
                  onPressed: () {
                    showModalBottomSheet(
                      context: context,
                      builder: (c) => const FeaturesOverlay(),
                    );
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),
            const SizedBox(height: 100, child: Visualizer()),
            const SizedBox(height: 24),
            Expanded(
              child: SingleChildScrollView(
                child: Text(
                  aiInsight,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                    height: 1.6,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: Colors.cyan[400],
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(
                child: Text(
                  'FULL ANALYTICS',
                  style: TextStyle(
                    color: Colors.black,
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGlassButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Icon(icon, size: 20, color: Colors.cyan[400]),
      ),
    );
  }

  Widget _buildNavIcon(
    IconData icon, {
    Color? color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Icon(
        icon,
        size: 24,
        color: color ?? Colors.white.withOpacity(0.6),
      ),
    );
  }

  Widget _buildCenterButton() {
    return GestureDetector(
      onTap: () async {
        final url = await showModalBottomSheet<String>(
          context: context,
          backgroundColor: Colors.transparent,
          isScrollControlled: true,
          builder: (context) =>
              const FractionallySizedBox(heightFactor: 0.8, child: TabsPanel()),
        );
        if (url != null && mounted) {
          _controller.loadRequest(Uri.parse(url));
        }
      },
      child: Container(
        width: 56,
        height: 56,
        margin: const EdgeInsets.only(top: -40),
        decoration: BoxDecoration(
          color: Colors.cyan[400],
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.cyan[400]!.withOpacity(0.4),
              blurRadius: 20,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: const Icon(LucideIcons.layers, color: Colors.black, size: 28),
      ),
    );
  }
}
