import React, { useState, useRef, useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Search,
  Layers,
  ShieldCheck,
  Zap
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const DEFAULT_URL = 'http://10.0.2.2:3000'; // Change to production URL when available

function AppContent() {
  const isDarkMode = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState(DEFAULT_URL);
  const [inputValue, setInputValue] = useState(DEFAULT_URL);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const webViewRef = useRef<WebView>(null);

  // Animations
  const topBarAnim = useRef(new Animated.Value(0)).current;
  const bottomBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(topBarAnim, { toValue: 1, useNativeDriver: true }),
      Animated.spring(bottomBarAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGo = () => {
    let targetUrl = inputValue.trim();
    if (!targetUrl.startsWith('http')) {
      if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
        targetUrl = `https://${targetUrl}`;
      } else {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
      }
    }
    setUrl(targetUrl);
    setInputValue(targetUrl);
  };

  const theme = {
    bg: isDarkMode ? '#050505' : '#ffffff',
    surface: isDarkMode ? '#121212' : '#f8f8f8',
    text: isDarkMode ? '#ffffff' : '#000000',
    accent: '#00ffff',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Animated Header */}
        <Animated.View style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            backgroundColor: theme.bg,
            borderBottomColor: theme.border,
            transform: [{ translateY: topBarAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }]
          }
        ]}>
          <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
            <ShieldCheck size={16} color={theme.accent} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleGo}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Search or enter URL"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
            />
            {loading && <ActivityIndicator size="small" color={theme.accent} style={{ marginLeft: 8 }} />}
          </View>
        </Animated.View>

        {/* WebView Container */}
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={styles.webView}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
            onNavigationStateChange={(navState) => {
              setInputValue(navState.url);
            }}
          />
          {progress < 1 && progress > 0 && (
            <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} />
          )}
        </View>

        {/* Animated Floating Bottom Nav */}
        <Animated.View style={[
          styles.bottomNav,
          {
            paddingBottom: insets.bottom + 10,
            backgroundColor: theme.bg,
            borderTopColor: theme.border,
            transform: [{ translateY: bottomBarAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }]
          }
        ]}>
          <TouchableOpacity onPress={() => webViewRef.current?.goBack()} style={styles.navButton}>
            <ArrowLeft size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => webViewRef.current?.goForward()} style={styles.navButton}>
            <ArrowRight size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setUrl(DEFAULT_URL)}
            style={[styles.homeButton, { shadowColor: theme.accent }]}
          >
            <Zap size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => webViewRef.current?.reload()} style={styles.navButton}>
            <RotateCw size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton}>
            <Layers size={22} color={theme.text} />
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 15,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  searchBar: {
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '500',
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    height: 2,
    zIndex: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  homeButton: {
    width: 54,
    height: 54,
    backgroundColor: '#00ffff',
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
});
