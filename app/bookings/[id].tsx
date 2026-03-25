/**
 * app/(captain)/bookings/[id].tsx
 * Full-screen Booking Detail with Live Map (like Swiggy/Zomato captain view)
 */

import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { bookingApi } from "../../services/captainApi";

const { width, height } = Dimensions.get("window");

export default function BookingDetailMapScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const bookingId = parseInt(id as string);

  const mapRef = useRef<MapView>(null);

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [captainLocation, setCaptainLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get Captain's Live Location
  const getCaptainLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCaptainLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (err) {
      console.error("Location error:", err);
    }
  };

  // Fetch single booking details
  const fetchBooking = async () => {
    try {
      setLoading(true);
      const res = await bookingApi.getById(bookingId);

      if (res.success) {
        setBooking(res.data);
      } else {
        Alert.alert("Error", "Booking not found");
        router.back();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load booking");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
      getCaptainLocation();
    }
  }, [bookingId]);

  // Focus map on delivery location
  const focusMap = () => {
    if (!booking?.deliveryLatitude || !booking?.deliveryLongitude || !mapRef.current) return;

    mapRef.current.animateToRegion({
      latitude: booking.deliveryLatitude,
      longitude: booking.deliveryLongitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    }, 1200);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0cadab" />
        <Text style={styles.loadingText}>Loading delivery details...</Text>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Booking not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#0cadab", marginTop: 10 }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const deliveryLat = booking.deliveryLatitude;
  const deliveryLng = booking.deliveryLongitude;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#101720" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery #{booking.id}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{booking.status}</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: deliveryLat || 26.9124,
            longitude: deliveryLng || 75.7873,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {/* Captain Location */}
          {captainLocation && (
            <Marker
              coordinate={captainLocation}
              title="You (Captain)"
              pinColor="#22c55e"
            />
          )}

          {/* Customer Delivery Location */}
          {deliveryLat && deliveryLng && (
            <Marker
              coordinate={{ latitude: deliveryLat, longitude: deliveryLng }}
              title="Customer Location"
              description={`${booking.deliveryStreet || ""}, ${booking.deliveryCity}`}
              pinColor="#ef4444"
            />
          )}

          {/* Route Line */}
          {captainLocation && deliveryLat && deliveryLng && (
            <Polyline
              coordinates={[
                captainLocation,
                { latitude: deliveryLat, longitude: deliveryLng },
              ]}
              strokeColor="#0cadab"
              strokeWidth={5}
              lineDashPattern={[1, 4]}
            />
          )}
        </MapView>
      </View>

      {/* Details Card */}
      <View style={styles.detailsCard}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>EVENT DETAILS</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#0cadab" />
            <Text style={styles.infoText}>
              {booking.eventDate} • {booking.startTime} - {booking.endTime}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#0cadab" />
            <Text style={styles.infoText}>
              {booking.deliveryStreet}, {booking.deliveryCity}, {booking.deliveryState}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>CUSTOMER</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#0cadab" />
            <Text style={styles.infoText}>
              {booking.user?.firstName} {booking.user?.lastName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#0cadab" />
            <Text style={styles.infoText}>{booking.user?.phone}</Text>
          </View>

          <Text style={styles.sectionTitle}>DJ</Text>
          <View style={styles.infoRow}>
            <Ionicons name="musical-notes-outline" size={18} color="#0cadab" />
            <Text style={styles.infoText}>{booking.dj?.name || "N/A"}</Text>
          </View>

          <Text style={styles.sectionTitle}>PAYMENT</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Amount</Text>
            <Text style={styles.infoValue}>₹{Number(booking.totalAmount).toLocaleString()}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.callBtn}>
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.callBtnText}>Call Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.updateBtn} onPress={() => Alert.alert("Update Status", "Feature coming soon")}>
              <Ionicons name="swap-horizontal" size={20} color="#fff" />
              <Text style={styles.updateBtnText}>Update Status</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8ff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f3",
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#101720", flex: 1 },
  statusBadge: {
    backgroundColor: "#0cadab",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  mapContainer: { flex: 1 },
  map: { width: "100%", height: "100%" },

  detailsCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.45,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 15,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8696a0",
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f4",
  },
  infoText: { fontSize: 15, color: "#374151", flex: 1 },
  infoLabel: { fontSize: 14, color: "#8696a0", flex: 1 },
  infoValue: { fontSize: 15, fontWeight: "700", color: "#101720" },

  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  callBtn: {
    flex: 1,
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  callBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  updateBtn: {
    flex: 1,
    backgroundColor: "#0cadab",
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  updateBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#8696a0" },
});