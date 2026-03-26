/**
 * app/bookings/[id].tsx
 * Captain Booking Detail Screen - Improved Loading + Date Format + Error Handling
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { bookingApi } from "../../services/captainApi";

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  Pending:              { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", icon: "time-outline" },
  Confirmed:            { color: "#0cadab", bg: "#f0fffe", border: "#a5f3fc", icon: "checkmark-circle-outline" },
  "Equipment Dispatched": { color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe", icon: "car-outline" },
  "In Progress":        { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", icon: "play-circle-outline" },
  Completed:            { color: "#8696a0", bg: "#f8fafc", border: "#e2e8f0", icon: "checkmark-done-outline" },
  Cancelled:            { color: "#ef4444", bg: "#fef2f2", border: "#fecaca", icon: "close-circle-outline" },
};

// Format date nicely
const formatEventDate = (dateStr: string) => {
  if (!dateStr) return "Date not available";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { 
    day: "numeric", 
    month: "short", 
    year: "numeric" 
  });
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return "";
  // Assuming time is in HH:mm format
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const bookingId = parseInt(id as string);

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false); // Loading for status/OTP actions

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const res = await bookingApi.getById(bookingId);
      if (res.success && res.data) {
        setBooking(res.data);
      } else {
        Alert.alert("Not Found", "This booking does not exist.");
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
    if (bookingId) fetchBooking();
  }, [bookingId]);

  const callCustomer = () => {
    if (!booking?.user?.phone) {
      Alert.alert("No Phone", "Customer phone number is not available.");
      return;
    }
    Linking.openURL(`tel:${booking.user.phone}`);
  };

  const openGoogleMaps = () => {
    if (!booking?.deliveryLatitude || !booking?.deliveryLongitude) {
      Alert.alert("No Location", "Delivery location is not available.");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.deliveryLatitude},${booking.deliveryLongitude}&travelmode=driving`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open Google Maps"));
  };

  // Handle status update with proper loading
  const handleStatusSelect = async (status: string) => {
    setUpdating(true);
    setShowStatusModal(false);

    try {
      if (status === "Completed") {
        const res = await bookingApi.generateOtp(bookingId);
        if (res.success) {
          Alert.alert("OTP Sent", "6-digit OTP has been sent to the customer.");
          setShowOtpModal(true);
        } else {
          Alert.alert("Failed", res.message || "Could not generate OTP");
        }
      } else {
        const res = await bookingApi.updateStatus(bookingId, status);
        if (res.success) {
          Alert.alert("Success", `Status updated to ${status}`);
          await fetchBooking();
        } else {
          Alert.alert("Not Allowed", 
            res.message || `Cannot change status to ${status} from current state.`);
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to update status";
      Alert.alert("Update Failed", errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  // Verify OTP
  const verifyOtp = async () => {
  if (otp.length !== 6) {
    Alert.alert("Error", "Please enter 6-digit OTP");
    return;
  }

  setUpdating(true);

  try {
    const res = await bookingApi.verifyOtp(bookingId, otp);
    
    if (res.success) {
      Alert.alert("Success", "Delivery verified! Booking marked as Completed.");
      setShowOtpModal(false);
      setOtp("");
      await fetchBooking();
    } else {
      Alert.alert("Incorrect OTP", res.message || "The OTP you entered is wrong. Please try again.");
    }
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || "Incorrect OTP";
    Alert.alert("Incorrect OTP", msg);
  } finally {
    setUpdating(false);
  }
};

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0cadab" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ fontSize: 18, color: "#ef4444" }}>Booking not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: "#0cadab", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#101720" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking #{booking.id}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{booking.status}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Navigate to Delivery */}
        <TouchableOpacity style={styles.mapCard} onPress={openGoogleMaps} activeOpacity={0.9}>
          <LinearGradient colors={["#0cadab", "#0a9998"]} style={styles.mapGradient}>
            <Ionicons name="map" size={32} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.mapTitle}>Navigate to Delivery</Text>
              <Text style={styles.mapSubtitle}>
                {booking.deliveryCity || "Open Google Maps for directions"}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Event Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>EVENT</Text>
          <Text style={styles.eventType}>{booking.eventType}</Text>
          <Text style={styles.eventDate}>
            {formatEventDate(booking.eventDate)} • {formatTime(booking.startTime)} – {formatTime(booking.endTime)} 
            ({booking.durationHours}h)
          </Text>
        </View>

        {/* Customer */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>CUSTOMER</Text>
          <Text style={styles.customerName}>
            {booking.user?.firstName} {booking.user?.lastName}
          </Text>
          <TouchableOpacity style={styles.callRow} onPress={callCustomer}>
            <Ionicons name="call-outline" size={18} color="#0cadab" />
            <Text style={styles.callText}>{booking.user?.phone || "No phone available"}</Text>
          </TouchableOpacity>
        </View>

        {/* Delivery Address */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
          <Text style={styles.address}>
            {booking.deliveryStreet || ""}, {booking.deliveryCity}, {booking.deliveryState}
          </Text>
        </View>

        {/* DJ */}
        {booking.dj && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>DJ ASSIGNED</Text>
            <Text style={styles.djName}>{booking.dj.name}</Text>
          </View>
        )}

        {/* Pricing */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>PAYMENT SUMMARY</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total Amount</Text>
            <Text style={styles.priceValue}>₹{Number(booking.totalAmount || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Payment Status</Text>
            <Text style={{ 
              color: booking.paymentStatus === "Paid" ? "#22c55e" : "#f59e0b", 
              fontWeight: "700" 
            }}>
              {booking.paymentStatus}
            </Text>
          </View>
        </View>

        {/* Special Requests */}
        {booking.specialRequests && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>SPECIAL REQUESTS</Text>
            <Text style={styles.specialText}>{booking.specialRequests}</Text>
          </View>
        )}

        {/* Update Status Button */}
        <TouchableOpacity 
          style={styles.updateStatusBtn} 
          onPress={() => setShowStatusModal(true)}
          disabled={updating}
        >
          <LinearGradient colors={["#0cadab", "#0a9998"]} style={styles.updateStatusBtnGradient}>
            {updating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
                <Text style={styles.updateStatusBtnText}>Update Status</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Status Selection Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
        <View style={modalS.overlay}>
          <View style={modalS.sheet}>
            <View style={modalS.handle} />
            <Text style={modalS.title}>Update Booking Status</Text>

            <View style={modalS.statusGrid}>
              {["Pending", "Confirmed", "Equipment Dispatched", "In Progress", "Completed", "Cancelled"]
                .filter(s => s !== booking.status)
                .map((status) => {
                  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[modalS.statusBtn, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
                      onPress={() => handleStatusSelect(status)}
                      disabled={updating}
                    >
                      <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                      <Text style={[modalS.statusBtnText, { color: cfg.color }]}>{status}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>

            <TouchableOpacity style={modalS.cancelBtn} onPress={() => setShowStatusModal(false)} disabled={updating}>
              <Text style={modalS.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* OTP Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => setShowOtpModal(false)}>
        <View style={modalS.overlay}>
          <View style={modalS.sheet}>
            <View style={modalS.handle} />
            <Text style={modalS.title}>Verify Delivery</Text>
            <Text style={modalS.subtitle}>Enter 6-digit OTP sent to customer</Text>

            <TextInput
              style={modalS.otpInput}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />

            <TouchableOpacity style={modalS.verifyBtn} onPress={verifyOtp} disabled={updating}>
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={modalS.verifyBtnText}>Verify OTP & Complete Delivery</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={modalS.cancelBtn} 
              onPress={() => { setShowOtpModal(false); setOtp(""); }}
              disabled={updating}
            >
              <Text style={modalS.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Global Updating Overlay */}
      {updating && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.updatingText}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// Modal Styles
const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(16,23,32,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "800", color: "#101720", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#8696a0", marginBottom: 24, textAlign: "center" },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    minWidth: "48%",
  },
  statusBtnText: { fontSize: 15, fontWeight: "700" },
  otpInput: {
    borderWidth: 2,
    borderColor: "#0cadab",
    borderRadius: 16,
    padding: 20,
    fontSize: 32,
    textAlign: "center",
    letterSpacing: 14,
    marginBottom: 24,
  },
  verifyBtn: { backgroundColor: "#0cadab", paddingVertical: 18, borderRadius: 16, alignItems: "center" },
  verifyBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { color: "#8696a0", fontWeight: "700" },
});

// Main Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8ff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f3",
  },
  backBtn: { paddingRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#101720", flex: 1 },
  statusPill: { backgroundColor: "#0cadab", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  mapCard: { margin: 16, borderRadius: 16, overflow: "hidden" },
  mapGradient: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },

  mapTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  mapSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.85)" },

  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eef0f3",
  },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#8696a0", marginBottom: 8, letterSpacing: 0.5 },
  eventType: { fontSize: 18, fontWeight: "800", color: "#101720" },
  eventDate: { fontSize: 15, color: "#4b6585", marginTop: 6 },

  customerName: { fontSize: 17, fontWeight: "700", color: "#101720" },
  callRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  callText: { fontSize: 15, color: "#0cadab", fontWeight: "600" },
  address: { fontSize: 14.5, color: "#5a6169", lineHeight: 22 },
  djName: { fontSize: 17, fontWeight: "700", color: "#101720" },

  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  priceLabel: { fontSize: 14, color: "#8696a0" },
  priceValue: { fontSize: 16, fontWeight: "700", color: "#101720" },
  specialText: { fontSize: 14.5, color: "#4b6585", lineHeight: 22 },

  updateStatusBtn: { margin: 16, borderRadius: 16, overflow: "hidden" },
  updateStatusBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    gap: 8,
  },
  updateStatusBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, color: "#8696a0", fontSize: 15 },

  // Global updating overlay
  updatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  updatingText: { color: "#fff", marginTop: 12, fontSize: 16, fontWeight: "600" },
});