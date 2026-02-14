import 'package:flutter/material.dart';
import '../services/ai_service.dart';
import '../services/music_service.dart';
import 'package:audio_service/audio_service.dart';

class SettingsPage extends StatefulWidget {
  final MusicService musicService;

  const SettingsPage({super.key, required this.musicService});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage>
    with SingleTickerProviderStateMixin {
  final _aiService = AIService();
  late TabController _tabController;

  final _geminiController = TextEditingController();
  final _openaiController = TextEditingController();
  final _groqController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    await _aiService.loadKeys();
    // In a real app, I'd expose getters for keys to populate fields,
    // but for security we might leave them blank or show masked.
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020205),
      appBar: AppBar(
        title: const Text(
          'Comet Settings',
          style: TextStyle(color: Colors.white),
        ),
        backgroundColor: Colors.transparent,
        iconTheme: const IconThemeData(color: Colors.white),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.cyan[400],
          labelColor: Colors.cyan[400],
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(icon: Icon(Icons.psychology), text: "AI Brain"),
            Tab(icon: Icon(Icons.music_note), text: "Music"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [_buildAISection(), _buildMusicSection()],
      ),
    );
  }

  Widget _buildAISection() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _buildApiKeyField(
          "Gemini 3 Pro / Flash",
          _geminiController,
          AIProvider.gemini,
        ),
        const SizedBox(height: 20),
        _buildApiKeyField(
          "OpenAI (GPT-4)",
          _openaiController,
          AIProvider.openai,
        ),
        const SizedBox(height: 20),
        _buildApiKeyField("Groq Speed", _groqController, AIProvider.groq),

        const SizedBox(height: 30),
        const Text(
          "Model Configuration",
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 10),
        _buildModelSelector(),
        const SizedBox(height: 20),
        const Text(
          "Select Active Provider",
          style: TextStyle(color: Colors.white70),
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<AIProvider>(
          dropdownColor: const Color(0xFF1A1A2E),
          initialValue: AIProvider.gemini, // Should fetch from service
          items: AIProvider.values
              .map(
                (p) => DropdownMenuItem(
                  value: p,
                  child: Text(
                    p.toString().split('.').last.toUpperCase(),
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              )
              .toList(),
          onChanged: (val) {
            if (val != null) {
              _aiService.setProvider(val);
              setState(() {}); // Refresh to show/hide relevant model selector
            }
          },
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
      ],
    );
  }

  Widget _buildModelSelector() {
    // Determine which models to show based on provider
    // Note: In high-level design, we show the current provider's model choice
    // But for better UX, we could show all. Let's stick to current provider.
    // However, the dropdown for provider is below this. Let's fix that order.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_aiService.getModel(AIProvider.gemini).isNotEmpty) ...[
          const Text("Gemini Model", style: TextStyle(color: Colors.white60)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            dropdownColor: const Color(0xFF1A1A2E),
            initialValue: _aiService.getModel(AIProvider.gemini),
            items: const [
              DropdownMenuItem(
                value: "gemini-3-pro",
                child: Text(
                  "Gemini 3 Pro",
                  style: TextStyle(color: Colors.white),
                ),
              ),
              DropdownMenuItem(
                value: "gemini-3-flash",
                child: Text(
                  "Gemini 3 Flash",
                  style: TextStyle(color: Colors.white),
                ),
              ),
              DropdownMenuItem(
                value: "gemini-1.5-flash-8b",
                child: Text(
                  "Gemini 1.5 Flash-8B",
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ],
            onChanged: (val) {
              if (val != null) _aiService.setModel(AIProvider.gemini, val);
            },
            decoration: _minimalInputDecoration(),
          ),
          const SizedBox(height: 16),
        ],
        const Text("OpenAI Model", style: TextStyle(color: Colors.white60)),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          dropdownColor: const Color(0xFF1A1A2E),
          initialValue: _aiService.getModel(AIProvider.openai),
          items: const [
            DropdownMenuItem(
              value: "gpt-4o",
              child: Text(
                "GPT-4o (Omni)",
                style: TextStyle(color: Colors.white),
              ),
            ),
            DropdownMenuItem(
              value: "gpt-4-turbo",
              child: Text("GPT-4 Turbo", style: TextStyle(color: Colors.white)),
            ),
            DropdownMenuItem(
              value: "gpt-4o-mini",
              child: Text("GPT-4o Mini", style: TextStyle(color: Colors.white)),
            ),
          ],
          onChanged: (val) {
            if (val != null) _aiService.setModel(AIProvider.openai, val);
          },
          decoration: _minimalInputDecoration(),
        ),
      ],
    );
  }

  InputDecoration _minimalInputDecoration() {
    return InputDecoration(
      filled: true,
      fillColor: Colors.white.withOpacity(0.05),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    );
  }

  Widget _buildApiKeyField(
    String label,
    TextEditingController controller,
    AIProvider provider,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: "Enter API Key",
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            suffixIcon: IconButton(
              icon: const Icon(Icons.save, color: Colors.cyan),
              onPressed: () {
                _aiService.saveKey(provider, controller.text.trim());
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(const SnackBar(content: Text("Key Saved!")));
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMusicSection() {
    return StreamBuilder<List<MediaItem>>(
      stream: widget.musicService.queue,
      initialData: widget.musicService.queue.value,
      builder: (context, snapshot) {
        final songs = snapshot.data ?? [];
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  const Text(
                    "Local Queue",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.cyan),
                    onPressed: () => widget.musicService.fetchSongs(),
                  ),
                ],
              ),
            ),
            Expanded(
              child: songs.isEmpty
                  ? const Center(
                      child: Text(
                        "No songs found",
                        style: TextStyle(color: Colors.white54),
                      ),
                    )
                  : ListView.builder(
                      itemCount: songs.length,
                      itemBuilder: (context, index) {
                        final song = songs[index];
                        return ListTile(
                          leading: const Icon(
                            Icons.music_note,
                            color: Colors.white54,
                          ),
                          title: Text(
                            song.title,
                            style: const TextStyle(color: Colors.white),
                          ),
                          subtitle: Text(
                            song.artist ?? "Unknown",
                            style: const TextStyle(color: Colors.white54),
                          ),
                          onTap: () {
                            widget.musicService.playAtIndex(index);
                          },
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}
