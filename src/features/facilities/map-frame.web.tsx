import { StyleSheet, View } from 'react-native';

export function MapFrame({ url }: { url: string }) {
  return (
    <View style={styles.container}>
      <iframe
        title="Interactive OpenStreetMap"
        src={url}
        style={{ border: 0, width: '100%', height: '100%' }}
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
});
