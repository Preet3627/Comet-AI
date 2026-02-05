// ⚠️ EXPERIMENTAL FEATURE - TEMPORARILY DISABLED
// This feature requires audio packages that are currently disabled for iOS build compatibility
// Packages needed: just_audio, audio_service, on_audio_query
// See: IOS_BUILD_FIX.md for re-enabling instructions

/* DISABLED FOR iOS BUILD FIX
import 'package:just_audio/just_audio.dart';
import 'package:audio_service/audio_service.dart';
import 'package:on_audio_query/on_audio_query.dart';

class MusicService extends BaseAudioHandler with QueueHandler, SeekHandler {
  final AudioPlayer _player = AudioPlayer();
  final OnAudioQuery _audioQuery = OnAudioQuery();

  List<SongModel> _rawSongs = [];

  // Expose current song via the standard Stream from BaseAudioHandler
  MediaItem? get currentSong => mediaItem.value;

  // Internal getter for safety if needed, but primary interaction should be via streams
  List<MediaItem> get currentQueue => queue.value;

  MusicService() {
    _init();
  }

  Future<void> _init() async {
    // Broadcast playback events
    _player.playbackEventStream.listen((event) {
      final playing = _player.playing;
      playbackState.add(
        playbackState.value.copyWith(
          controls: [
            MediaControl.skipToPrevious,
            if (playing) MediaControl.pause else MediaControl.play,
            MediaControl.skipToNext,
          ],
          systemActions: const {MediaAction.seek},
          androidCompactActionIndices: const [0, 1, 2],
          processingState: const {
            ProcessingState.idle: AudioProcessingState.idle,
            ProcessingState.loading: AudioProcessingState.loading,
            ProcessingState.buffering: AudioProcessingState.buffering,
            ProcessingState.ready: AudioProcessingState.ready,
            ProcessingState.completed: AudioProcessingState.completed,
          }[_player.processingState]!,
          playing: playing,
          updatePosition: _player.position,
          bufferedPosition: _player.bufferedPosition,
          speed: _player.speed,
          queueIndex: _player.currentIndex,
        ),
      );
    });

    _player.durationStream.listen((duration) {
      final index = _player.currentIndex;
      final newQueue = queue.value;
      if (index != null && index < newQueue.length) {
        final oldMediaItem = newQueue[index];
        final newMediaItem = oldMediaItem.copyWith(duration: duration);
        newQueue[index] = newMediaItem;
        queue.add(newQueue);
        mediaItem.add(newMediaItem);
      }
    });

    _player.currentIndexStream.listen((index) {
      if (index != null &&
          queue.value.isNotEmpty &&
          index < queue.value.length) {
        mediaItem.add(queue.value[index]);
      }
    });

    _player.processingStateStream.listen((state) {
      if (state == ProcessingState.completed) {
        skipToNext();
      }
    });

    await fetchSongs();
  }

  Future<void> fetchSongs() async {
    if (await _audioQuery.permissionsRequest()) {
      _rawSongs = await _audioQuery.querySongs(
        sortType: null,
        orderType: OrderType.ASC_OR_SMALLER,
        uriType: UriType.EXTERNAL,
        ignoreCase: true,
      );

      final mediaItems = _rawSongs
          .map(
            (song) => MediaItem(
              id: song.uri ?? '',
              album: song.album ?? "Unknown Album",
              title: song.title,
              artist: song.artist ?? "Unknown Artist",
              duration: Duration(milliseconds: song.duration ?? 0),
              artUri: Uri.parse(
                "content://media/external/audio/albumart/${song.albumId}",
              ),
            ),
          )
          .toList();

      // Update queue in AudioService
      queue.add(mediaItems);

      if (mediaItems.isNotEmpty) {
        try {
          // Set audio source
          await _player.setAudioSource(
            ConcatenatingAudioSource(
              children: mediaItems
                  .map((item) => AudioSource.uri(Uri.parse(item.id)))
                  .toList(),
            ),
          );
        } catch (e) {
          print("Error setting audio source: $e");
        }
      }
    }
  }

  @override
  Future<void> play() => _player.play();

  @override
  Future<void> pause() => _player.pause();

  @override
  Future<void> skipToNext() => _player.seekToNext();

  @override
  Future<void> skipToPrevious() => _player.seekToPrevious();

  @override
  Future<void> seek(Duration position) => _player.seek(position);

  // Custom method to play specific index
  Future<void> playAtIndex(int index) async {
    if (index >= 0 && index < queue.value.length) {
      await _player.seek(Duration.zero, index: index);
      play();
    }
  }
}
END OF DISABLED CODE */

// Stub class to prevent compilation errors
class MusicService {
  // Placeholder - music features temporarily disabled
  static const bool isAvailable = false;

  void play() {
    print('⚠️ Music service is temporarily disabled. See IOS_BUILD_FIX.md');
  }

  void pause() {
    print('⚠️ Music service is temporarily disabled. See IOS_BUILD_FIX.md');
  }

  void skipToNext() {
    print('⚠️ Music service is temporarily disabled. See IOS_BUILD_FIX.md');
  }

  void skipToPrevious() {
    print('⚠️ Music service is temporarily disabled. See IOS_BUILD_FIX.md');
  }
}
