import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '@/context/LocationContext';

const { width } = Dimensions.get('window');

export default function LocationLoadingScreen({ onLocationReady }: { onLocationReady: () => void }) {
  const { location, isLoadingLocation, locationError, getCurrentLocation } = useLocation();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!isLoadingLocation && location) {
      // Small delay before showing home screen
      setTimeout(() => {
        onLocationReady();
      }, 500);
    }
  }, [isLoadingLocation, location]);

  const handleRetry = () => {
    getCurrentLocation();
  };

  if (locationError) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="location-outline" size={60} color="#ef4444" />
          </View>
          
          <Text style={styles.errorTitle}>Unable to get location</Text>
          <Text style={styles.errorMessage}>
            We need your location to show nearby DJ equipment
          </Text>

          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#ffffff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.manualButton}
            onPress={onLocationReady}
            activeOpacity={0.8}
          >
            <Text style={styles.manualButtonText}>Enter Location Manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.iconContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <Ionicons name="location" size={60} color="#0cadab" />
        </Animated.View>

        <View style={styles.dotsContainer}>
          <ActivityIndicator size="small" color="#0cadab" />
        </View>

        <Text style={styles.title}>Getting your location</Text>
        <Text style={styles.subtitle}>
          This helps us show you DJ equipment available in your area
        </Text>

        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <View style={styles.footer}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#8696a0" />
        <Text style={styles.footerText}>
          Your location is safe and secure
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0fffe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dotsContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#101720',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#8696a0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#101720',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: '#8696a0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  progressBar: {
    width: width - 80,
    height: 4,
    backgroundColor: '#f0fffe',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    width: '60%',
    height: '100%',
    backgroundColor: '#0cadab',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101720',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  manualButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  manualButtonText: {
    color: '#0cadab',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: '#8696a0',
  },
});