import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'sync_service.dart';
import 'package:lucide_icons/lucide_icons.dart';

class TabsPanel extends StatelessWidget {
  const TabsPanel({super.key});

  @override
  Widget build(BuildContext context) {
    final sync = Provider.of<SyncService>(context);

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Color(0xFF020205),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(32),
          topRight: Radius.circular(32),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'COLLECTIONS',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2,
                  color: Colors.white24,
                ),
              ),
              IconButton(
                icon: const Icon(LucideIcons.x, size: 20, color: Colors.white24),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // Sync Information
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.cyan.withOpacity(0.05),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.cyan.withOpacity(0.1)),
            ),
            child: Row(
              children: [
                Icon(LucideIcons.refreshCw, size: 18, color: Colors.cyan[400]),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        sync.user != null ? 'Cloud Sync Active' : 'Offline Mode',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      Text(
                        sync.user?.email ?? 'Sign in on desktop to sync',
                        style: const TextStyle(color: Colors.white38, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 32),
          const Text(
            'DESKTOP HISTORY',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.5,
              color: Colors.white10,
            ),
          ),
          const SizedBox(height: 16),
          
          Expanded(
            child: sync.history.isEmpty 
              ? const Center(child: Text('No desktop activity synced', style: TextStyle(color: Colors.white10)))
              : ListView.builder(
                  itemCount: sync.history.length,
                  itemBuilder: (context, index) {
                    final item = sync.history[index];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.03),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(LucideIcons.globe, size: 16, color: Colors.white24),
                      ),
                      title: Text(
                        item['title'] ?? 'Untitled',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white70),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text(
                        item['url'] ?? '',
                        style: const TextStyle(fontSize: 11, color: Colors.white24),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: () {
                        // Load in browser
                        Navigator.pop(context, item['url']);
                      },
                    );
                  },
                ),
          ),
        ],
      ),
    );
  }
}
