import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';

export function MapFrame({ url }: { url: string }) {
  return (
    <View style={styles.container}>
      <WebView
        accessibilityLabel="Interactive OpenStreetMap"
        applicationNameForUserAgent="Milebud/1.0 (+https://github.com/PrajjvalMehra/Milebud)"
        cacheEnabled
        renderError={() => (
          <View style={styles.error}>
            <ThemedText>Map unavailable. Check your connection.</ThemedText>
          </View>
        )}
        source={{ uri: url }}
        style={styles.map}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    overflow: 'hidden',
    borderRadius: 16,
  },
  map: {
    flex: 1,
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
});
