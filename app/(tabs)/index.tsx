/**
 * Captain Home Screen — Fixed & Dynamic (Safe API handling)
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { captainApi, bookingApi } from "../../services/captainApi";

const { width } = Dimensions.get("window");

export default function CaptainHomeScreen() {
  const [captain, setCaptain] = useState<any>(null);
  const [stats, setStats] = useState([
    { id: "1", label: "Active", value: "0", icon: "musical-notes", color: "#0cadab", bg: "#f0fffe" },
    { id: "2", label: "Completed", value: "0", icon: "checkmark-done", color: "#22c55e", bg: "#f0fdf4" },
    { id: "3", label: "Equipment", value: "0", icon: "hardware-chip", color: "#f59e0b", bg: "#fffbeb" },
    { id: "4", label: "Rating", value: "4.8", icon: "star", color: "#FFC107", bg: "#fffbeb" },
  ]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try to get captain profile
      let captainData = null;
      try {
        const profileRes = await captainApi.getMyProfile();
        if (profileRes?.success) {
          captainData = profileRes.data;
        }
      } catch (e) {
        console.log("getMyProfile not available yet, skipping...");
      }

      if (captainData) {
        setCaptain(captainData);
        setIsOnline(captainData.isActive ?? true);

        const pStats = captainData.stats || captainData;

        setStats([
          { 
            id: "1", 
            label: "Active", 
            value: String(pStats.activeDJs ?? pStats.pendingBookings ?? 0), 
            icon: "musical-notes", 
            color: "#0cadab", 
            bg: "#f0fffe" 
          },
          { 
            id: "2", 
            label: "Completed", 
            value: String(pStats.completedBookings ?? 0), 
            icon: "checkmark-done", 
            color: "#22c55e", 
            bg: "#f0fdf4" 
          },
          { 
            id: "3", 
            label: "Equipment", 
            value: String(pStats.totalEquipment ?? 0), 
            icon: "hardware-chip", 
            color: "#f59e0b", 
            bg: "#fffbeb" 
          },
          { 
            id: "4", 
            label: "Rating", 
            value: (captainData.ratingAverage ?? 4.8).toFixed(1), 
            icon: "star", 
            color: "#FFC107", 
            bg: "#fffbeb" 
          },
        ]);
      }

      // 2. Get Recent Bookings (this usually works)
      try {
        const bookingsRes = await bookingApi.getAll({ limit: 5 });
        const bookingsList = bookingsRes?.success && Array.isArray(bookingsRes.data) 
          ? bookingsRes.data 
          : [];
        setRecentBookings(bookingsList.slice(0, 5));
      } catch (e) {
        console.log("Recent bookings fetch failed");
        setRecentBookings([]);
      }

    } catch (err: any) {
      console.error("Failed to load captain dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleOnline = () => setIsOnline(!isOnline);

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("progress") || s.includes("ongoing")) return "#0cadab";
    if (s.includes("confirmed")) return "#f59e0b";
    if (s.includes("completed")) return "#22c55e";
    return "#8696a0";
  };

  const getStatusBg = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("progress") || s.includes("ongoing")) return "#f0fffe";
    if (s.includes("confirmed")) return "#fffbeb";
    if (s.includes("completed")) return "#f0fdf4";
    return "#f8f9fa";
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0cadab" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  const captainName = captain?.businessName || captain?.user?.firstName || "Captain";
  const avatarUrl = captain?.profilePicture || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(captainName)}&size=200&background=0cadab&color=fff`;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8ff" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LinearGradient colors={["#f4f8ff", "#eef1f9", "#ffffff"]} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0cadab"]} />}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  <View style={[styles.onlineIndicator, !isOnline && styles.offlineIndicator]} />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.greeting}>Partner Dashboard</Text>
                  <Text style={styles.captainName}>{captainName}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#FFC107" />
                    <Text style={styles.ratingText}>{(captain?.ratingAverage ?? 4.8).toFixed(1)}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.notifButton}>
                <Ionicons name="notifications-outline" size={22} color="#101720" />
              </TouchableOpacity>
            </View>

            {/* Online Toggle */}
            <View style={styles.statusToggleContainer}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>You're {isOnline ? "Online" : "Offline"}</Text>
                <Text style={styles.statusSubtext}>
                  {isOnline ? "Accepting bookings" : "Not accepting bookings"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleButton, isOnline && styles.toggleButtonActive]}
                onPress={toggleOnline}
              >
                <View style={[styles.toggleCircle, isOnline && styles.toggleCircleActive]} />
              </TouchableOpacity>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsSection}>
              <View style={styles.statsGrid}>
                {stats.map((stat) => (
                  <TouchableOpacity key={stat.id} style={styles.statCard} activeOpacity={0.8}>
                    <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                      <Ionicons name={stat.icon as any} size={22} color={stat.color} />
                    </View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Recent Bookings */}
            <View style={styles.bookingsSection}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Recent Bookings</Text>
                  <Text style={styles.sectionSub}>Manage your active orders</Text>
                </View>
                <TouchableOpacity style={styles.seeAllBtn}>
                  <Text style={styles.seeAll}>See All</Text>
                  <Ionicons name="arrow-forward" size={12} color="#0cadab" />
                </TouchableOpacity>
              </View>

              {recentBookings.length === 0 ? (
                <View style={styles.emptyBookings}>
                  <Text style={styles.emptyText}>No recent bookings yet</Text>
                </View>
              ) : (
                recentBookings.map((booking) => (
                  <TouchableOpacity key={booking.id} style={styles.bookingCard} activeOpacity={0.9}>
                    <View style={styles.bookingHeader}>
                      <View style={styles.bookingTitleRow}>
                        <Text style={styles.bookingEventName} numberOfLines={1}>
                          {booking.eventType || "Event"}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBg(booking.status) }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                            {booking.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.bookingClient}>
                        {booking.user?.firstName} {booking.user?.lastName}
                      </Text>
                    </View>

                    <View style={styles.bookingDetails}>
                      <View style={styles.bookingDetailRow}>
                        <Ionicons name="calendar-outline" size={15} color="#8696a0" />
                        <Text style={styles.bookingDetailText}>
                          {new Date(booking.eventDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </Text>
                      </View>
                      <View style={styles.bookingDetailRow}>
                        <Ionicons name="location-outline" size={15} color="#8696a0" />
                        <Text style={styles.bookingDetailText} numberOfLines={1}>
                          {booking.deliveryCity || "Jaipur"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bookingFooter}>
                      <View>
                        <Text style={styles.amountLabel}>AMOUNT</Text>
                        <Text style={styles.amountValue}>₹{Number(booking.totalAmount || 0).toLocaleString()}</Text>
                      </View>
                      <TouchableOpacity style={styles.viewDetailsButton}>
                        <Text style={styles.viewDetailsText}>View</Text>
                        <Ionicons name="arrow-forward" size={14} color="#0cadab" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8ff" },
  scrollContent: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#8696a0" },

  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: "#eef0f3" 
  },
  profileSection: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarContainer: { position: "relative" },
  avatar: { width: 52, height: 52, borderRadius: 18 },
  onlineIndicator: { 
    position: "absolute", bottom: 1, right: 1, width: 12, height: 12, 
    borderRadius: 6, backgroundColor: "#22c55e", borderWidth: 2.5, borderColor: "#f4f8ff" 
  },
  offlineIndicator: { backgroundColor: "#8696a0" },
  profileInfo: { marginLeft: 12, flex: 1 },
  greeting: { fontSize: 11, color: "#8696a0", fontWeight: "600", letterSpacing: 0.5 },
  captainName: { fontSize: 18, fontWeight: "800", color: "#101720", marginVertical: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 13, fontWeight: "700", color: "#101720" },
  notifButton: { 
    width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", 
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#eef0f3" 
  },

  statusToggleContainer: { 
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", 
    marginHorizontal: 20, marginTop: 20, marginBottom: 24, padding: 16, 
    backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#eef0f3" 
  },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: 16, fontWeight: "800", color: "#101720" },
  statusSubtext: { fontSize: 12, color: "#8696a0", fontWeight: "500" },
  toggleButton: { width: 54, height: 30, borderRadius: 15, backgroundColor: "#e5e7eb", padding: 2.5 },
  toggleButtonActive: { backgroundColor: "#0cadab" },
  toggleCircle: { width: 25, height: 25, borderRadius: 13, backgroundColor: "#fff" },
  toggleCircleActive: { alignSelf: "flex-end" },

  statsSection: { paddingHorizontal: 20, marginBottom: 24 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { 
    flex: 1, minWidth: (width - 60) / 2, backgroundColor: "#fff", padding: 16, 
    borderRadius: 18, alignItems: "center", borderWidth: 1, borderColor: "#eef0f3" 
  },
  statIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#101720", marginBottom: 2 },
  statLabel: { fontSize: 12, color: "#8696a0", fontWeight: "600" },

  bookingsSection: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#101720", marginBottom: 4 },
  sectionSub: { fontSize: 12, color: "#8696a0", fontWeight: "500" },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  seeAll: { fontSize: 14, fontWeight: "600", color: "#0cadab" },

  bookingCard: { 
    backgroundColor: "#fff", padding: 16, borderRadius: 20, marginBottom: 12, 
    borderWidth: 1, borderColor: "#eef0f3" 
  },
  bookingHeader: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  bookingTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 12 },
  bookingEventName: { fontSize: 16, fontWeight: "800", color: "#101720", flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  bookingClient: { fontSize: 13, color: "#8696a0", fontWeight: "600" },
  bookingDetails: { gap: 8, marginBottom: 14 },
  bookingDetailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bookingDetailText: { fontSize: 13, color: "#5a6169", fontWeight: "500", flex: 1 },
  bookingFooter: { 
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", 
    paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f0f0" 
  },
  amountLabel: { fontSize: 10, color: "#8696a0", fontWeight: "700", marginBottom: 3 },
  amountValue: { fontSize: 20, fontWeight: "800", color: "#0cadab" },
  viewDetailsButton: { 
    flexDirection: "row", alignItems: "center", gap: 4, 
    backgroundColor: "#f0fffe", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 
  },
  viewDetailsText: { fontSize: 13, fontWeight: "700", color: "#0cadab" },

  emptyBookings: { padding: 40, alignItems: "center" },
  emptyText: { color: "#8696a0", fontSize: 14 },

  bottomSpacing: { height: 40 },
});