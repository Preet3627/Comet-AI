class URLPredictor {
  static const List<String> popularDomains = [
    'google.com',
    'youtube.com',
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'wikipedia.org',
    'amazon.com',
    'reddit.com',
    'github.com',
    'netflix.com',
    'linkedin.com',
    'apple.com',
    'microsoft.com',
    'openai.com',
    'gemini.google.com',
    'claude.ai',
    'stackoverflow.com',
    'flutter.dev',
    'dart.dev',
  ];

  static List<String> getPredictions(String input) {
    if (input.isEmpty) return [];

    final lowerInput = input.toLowerCase();

    // Exact matches or starts with
    final matches = popularDomains
        .where((domain) => domain.startsWith(lowerInput))
        .toList();

    // Substring matches if few startsWith matches
    if (matches.length < 5) {
      final substringMatches = popularDomains
          .where((domain) =>
              !domain.startsWith(lowerInput) && domain.contains(lowerInput))
          .toList();
      matches.addAll(substringMatches);
    }

    return matches.take(5).toList();
  }
}
