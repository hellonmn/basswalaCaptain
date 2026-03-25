import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { LocationProvider, useLocation } from '@/context/LocationContext';
import LocationLoadingScreen from '@/components/LocationLoadingScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

function RootLayoutContent() {
  const { isLoadingLocation } = useLocation();
  const [showApp, setShowApp] = useState(false);

  // Show loading screen while location is being captured
  if (isLoadingLocation && !showApp) {
    return <LocationLoadingScreen onLocationReady={() => setShowApp(true)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="equipment/[id]" />
      <Stack.Screen name="booking-flow" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <LocationProvider>
          <RootLayoutContent />
        </LocationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}