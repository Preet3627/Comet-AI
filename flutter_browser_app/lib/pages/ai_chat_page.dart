import 'package:flutter/material.dart';
import '../sync_service.dart';

class FullScreenAIChat extends StatefulWidget {
  final String initialMessage;
  const FullScreenAIChat({Key? key, required this.initialMessage})
      : super(key: key);

  @override
  State<FullScreenAIChat> createState() => _FullScreenAIChatState();
}

class _FullScreenAIChatState extends State<FullScreenAIChat> {
  String _statusMessage = "Connecting to Neural Core...";
  String? _response;
  bool _isProcessing = true;

  @override
  void initState() {
    super.initState();
    _processQuery();
  }

  Future<void> _processQuery() async {
    final syncService = SyncService();

    if (!syncService.isConnectedToDesktop) {
      setState(() {
        _statusMessage = "Error: Desktop Connection Required";
        _response =
            "Please connect to the Comet-AI Desktop application to enable AI features and desktop control.";
        _isProcessing = false;
      });
      return;
    }

    setState(() {
      _statusMessage = "Desktop Found. Executing Command...";
    });

    try {
      final result =
          await syncService.sendPromptToDesktop(widget.initialMessage);
      setState(() {
        if (result != null && result['error'] != null) {
          _statusMessage = "Process Failed";
          _response = "Error: ${result['error']}";
        } else {
          _statusMessage = "Task Completed Successfully";
          _response = result?['output'] ??
              "Command executed. Check desktop for results.";
        }
        _isProcessing = false;
      });
    } catch (e) {
      setState(() {
        _statusMessage = "Connection Error";
        _response = "Failed to communicate with desktop: $e";
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title:
            const Text("Comet-AI Chat", style: TextStyle(fontFamily: 'Outfit')),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.black,
              const Color(0xFF1A0033),
              const Color(0xFF001A33),
            ],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildGlowingIcon(),
                const SizedBox(height: 30),
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [Color(0xFF00E5FF), Color(0xFFD500F9)],
                  ).createShader(bounds),
                  child: const Text(
                    "Comet-AI Intelligence",
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      fontFamily: 'Outfit',
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  _statusMessage,
                  style: TextStyle(
                    color: _isProcessing
                        ? const Color(0xFF00E5FF)
                        : Colors.white54,
                    fontSize: 16,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 30),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 30),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: const Color(0xFF00E5FF).withOpacity(0.3)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        "Query: ${widget.initialMessage}",
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                      if (_response != null) ...[
                        const Divider(height: 30, color: Colors.white24),
                        Text(
                          _response!,
                          style: const TextStyle(
                              color: Colors.white70, fontSize: 15),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 40),
                if (_isProcessing)
                  const CircularProgressIndicator(color: Color(0xFFD500F9))
                else ...[
                  _buildInfoRow(
                      Icons.desktop_windows, "Desktop Control Active"),
                  _buildInfoRow(Icons.security, "Secure Sandboxed Execution"),
                  const SizedBox(height: 30),
                  ElevatedButton.icon(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.check),
                    label: const Text("Done"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD500F9),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 30, vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(30)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGlowingIcon() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF00E5FF)
                .withOpacity(0.5 * (_isProcessing ? 0.8 : 0.4)),
            blurRadius: 30,
            spreadRadius: 10,
          ),
        ],
      ),
      child: const Icon(Icons.auto_awesome, size: 80, color: Color(0xFF00E5FF)),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: const Color(0xFFD500F9), size: 20),
          const SizedBox(width: 12),
          Text(text,
              style: const TextStyle(color: Colors.white54, fontSize: 14)),
        ],
      ),
    );
  }
}
