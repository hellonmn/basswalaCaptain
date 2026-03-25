import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  area?: string;
}

interface LocationContextType {
  location: LocationData | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  requestLocationPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<void>;
  setManualLocation: (location: LocationData) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    setIsLoadingLocation(true);
    const hasPermission = await requestLocationPermission();
    
    if (hasPermission) {
      await getCurrentLocation();
    } else {
      setLocationError('Location permission denied');
      // Set default location even if permission denied
      setDefaultLocation();
      setIsLoadingLocation(false);
    }
  };

  const setDefaultLocation = () => {
    // Default location (Jaipur, Rajasthan)
    setLocation({
      latitude: 26.9124,
      longitude: 75.7873,
      address: 'Jaipur, Rajasthan',
      city: 'Jaipur',
      area: 'Rajasthan',
    });
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        setLocationError('Permission to access location was denied');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationError('Error requesting location permission');
      return false;
    }
  };

  const reverseGeocodeWithTimeout = async (
    latitude: number,
    longitude: number,
    timeoutMs: number = 3000
  ): Promise<Location.LocationGeocodedAddress[] | null> => {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Geocoding timeout')), timeoutMs);
      });

      // Race between geocoding and timeout
      const result = await Promise.race([
        Location.reverseGeocodeAsync({ latitude, longitude }),
        timeoutPromise
      ]);

      return result as Location.LocationGeocodedAddress[];
    } catch (error) {
      console.log('Geocoding failed or timed out:', error);
      return null;
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      setLocationError(null);

      console.log('Getting current position...');

      // Get current position with timeout
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 0,
      });

      const { latitude, longitude } = position.coords;
      console.log('Position obtained:', latitude, longitude);

      // Try reverse geocoding with timeout (3 seconds)
      const addressResponse = await reverseGeocodeWithTimeout(latitude, longitude, 3000);

      if (addressResponse && addressResponse.length > 0) {
        const address = addressResponse[0];
        const locationData: LocationData = {
          latitude,
          longitude,
          address: `${address.name || ''} ${address.street || ''}`.trim() || 'Current Location',
          city: address.city || address.subregion || 'Unknown City',
          area: address.district || address.subregion || address.city || 'Unknown Area',
        };

        console.log('Location with address:', locationData);
        setLocation(locationData);
      } else {
        // Geocoding failed or timed out, use coordinates only
        console.log('Using location without address');
        setLocation({
          latitude,
          longitude,
          address: 'Current Location',
          city: 'Your Location',
          area: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Failed to get your location');
      
      // Set default location as fallback
      setDefaultLocation();
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const setManualLocation = (newLocation: LocationData) => {
    setLocation(newLocation);
    setLocationError(null);
  };

  const value = {
    location,
    isLoadingLocation,
    locationError,
    requestLocationPermission,
    getCurrentLocation,
    setManualLocation,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};