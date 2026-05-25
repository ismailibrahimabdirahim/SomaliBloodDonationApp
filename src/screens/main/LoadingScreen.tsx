import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Skeleton from '../../components/Skeleton';

export default function LoadingScreen({ message = 'Connecting to services...' }) {
  return (
    <View style={styles.container}>
      <View style={styles.skeletonContainer}>
        <Skeleton width={100} height={100} borderRadius={50} style={{ marginBottom: 24 }} />
        <Skeleton width="70%" height={20} style={{ marginBottom: 12 }} />
        <Skeleton width="50%" height={14} style={{ marginBottom: 40 }} />
        <View style={{ width: '100%', gap: 12 }}>
          <Skeleton width="100%" height={60} borderRadius={16} />
          <Skeleton width="100%" height={60} borderRadius={16} />
        </View>
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  skeletonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  subtext: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
