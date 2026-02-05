// ⚠️ EXPERIMENTAL FEATURE - TEMPORARILY DISABLED
// This feature requires audio packages that are currently disabled for iOS build compatibility
// Packages needed: just_audio, audio_service, on_audio_query
// See: IOS_BUILD_FIX.md for re-enabling instructions

/* DISABLED FOR iOS BUILD FIX
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:audio_service/audio_service.dart';
import '../services/music_service.dart';

class DynamicIsland extends StatefulWidget {
  final MusicService musicService;

  const DynamicIsland({super.key, required this.musicService});

  @override
  State<DynamicIsland> createState() => _DynamicIslandState();
}

class _DynamicIslandState extends State<DynamicIsland>
    with SingleTickerProviderStateMixin {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<MediaItem?>(
      stream: widget.musicService.mediaItem,
      builder: (context, snapshot) {
        final mediaItem = snapshot.data;
        if (mediaItem == null) return const SizedBox.shrink();

        return StreamBuilder<PlaybackState>(
          stream: widget.musicService.playbackState,
          builder: (context, playbackSnapshot) {
            final playing = playbackSnapshot.data?.playing ?? false;

            return SafeArea(
              child: Align(
                alignment: Alignment.topCenter,
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _isExpanded = !_isExpanded;
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOutBack,
                    width: _isExpanded
                        ? MediaQuery.of(context).size.width * 0.92
                        : 120, // Minimal width vs Expanded
                    height: _isExpanded
                        ? 140
                        : 36, // Minimal height vs Expanded
                    margin: const EdgeInsets.only(top: 8),
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(
                        _isExpanded ? 30 : 18,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    padding: EdgeInsets.symmetric(
                      horizontal: _isExpanded ? 20 : 12,
                      vertical: _isExpanded ? 20 : 6,
                    ),
                    child: _isExpanded
                        ? _buildExpandedContent(mediaItem, playing)
                        : _buildMinimalContent(playing),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildMinimalContent(bool isPlaying) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildMiniVisualizer(isPlaying, scale: 0.5),
        const SizedBox(width: 8),
        Icon(
          isPlaying ? LucideIcons.loader : LucideIcons.play,
          color: Colors.cyan,
          size: 14,
        ),
      ],
    );
  }

  Widget _buildExpandedContent(MediaItem item, bool isPlaying) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            // Album Art simulated
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: Colors.white10,
                borderRadius: BorderRadius.circular(12),
                image: item.artUri != null
                    ? DecorationImage(
                        image: NetworkImage(item.artUri.toString()),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: item.artUri == null
                  ? const Icon(Icons.music_note, color: Colors.white54)
                  : null,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.artist ?? 'Artist',
                    style: const TextStyle(color: Colors.white54, fontSize: 13),
                    maxLines: 1,
                  ),
                ],
              ),
            ),
            // Big Visualizer
            _buildMiniVisualizer(isPlaying, scale: 1.0),
          ],
        ),
        const Spacer(),
        // Controls
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            IconButton(
              icon: const Icon(LucideIcons.skipBack, color: Colors.white),
              onPressed: widget.musicService.skipToPrevious,
            ),
            IconButton(
              icon: Icon(
                isPlaying ? LucideIcons.pause : LucideIcons.play,
                color: Colors.white,
                size: 32,
              ),
              onPressed: isPlaying
                  ? widget.musicService.pause
                  : widget.musicService.play,
            ),
            IconButton(
              icon: const Icon(LucideIcons.skipForward, color: Colors.white),
              onPressed: widget.musicService.skipToNext,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMiniVisualizer(bool isPlaying, {double scale = 1.0}) {
    if (!isPlaying) {
      return Container(
        width: 24 * scale,
        height: 24 * scale,
        decoration: const BoxDecoration(
          color: Colors.grey,
          shape: BoxShape.circle,
        ),
      );
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        _bar(15 * scale, Colors.cyan),
        SizedBox(width: 2 * scale),
        _bar(25 * scale, Colors.purpleAccent),
        SizedBox(width: 2 * scale),
        _bar(10 * scale, Colors.cyanAccent),
        SizedBox(width: 2 * scale),
        _bar(20 * scale, Colors.blue),
      ],
    );
  }

  Widget _bar(double height, Color color) {
    return Container(
      width: 4,
      height: height,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }
}
END OF DISABLED CODE */

import 'package:flutter/material.dart';
import '../services/music_service.dart';

// Stub widget to prevent compilation errors
class DynamicIsland extends StatelessWidget {
  final MusicService musicService;

  const DynamicIsland({super.key, required this.musicService});

  @override
  Widget build(BuildContext context) {
    // Return empty widget since music service is disabled
    return const SizedBox.shrink();
  }
}
