import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

// Mock data
const captainData = {
  name: "Rahul Sharma",
  rating: 4.9,
  totalRatings: 342,
  avatar: "https://ui-avatars.com/api/?name=Rahul+Sharma&size=200&background=0cadab&color=fff",
  isOnline: true,
};

const earningsData = {
  today: 4500,
  thisWeek: 28500,
  thisMonth: 95000,
  pending: 12000,
};

const statsData = [
  { id: "1", label: "Active", value: "8", icon: "musical-notes", color: "#0cadab", bg: "#f0fffe" },
  { id: "2", label: "Completed", value: "156", icon: "checkmark-done", color: "#22c55e", bg: "#f0fdf4" },
  { id: "3", label: "Equipment", value: "24", icon: "hardware-chip", color: "#f59e0b", bg: "#fffbeb" },
  { id: "4", label: "Rating", value: "4.9", icon: "star", color: "#FFC107", bg: "#fffbeb" },
];

const recentBookings = [
  {
    id: "1",
    eventName: "Wedding Reception",
    clientName: "Priya Mehta",
    date: "Today, 6:00 PM",
    location: "Malviya Nagar, Jaipur",
    status: "ongoing",
    amount: 15000,
    equipmentCount: 5,
  },
  {
    id: "2",
    eventName: "Birthday Party",
    clientName: "Amit Kumar",
    date: "Tomorrow, 7:00 PM",
    location: "Vaishali Nagar, Jaipur",
    status: "upcoming",
    amount: 8500,
    equipmentCount: 3,
  },
  {
    id: "3",
    eventName: "Corporate Event",
    clientName: "Tech Solutions Pvt Ltd",
    date: "Dec 25, 5:00 PM",
    location: "C-Scheme, Jaipur",
    status: "upcoming",
    amount: 25000,
    equipmentCount: 8,
  },
];

const quickActions = [
  { id: "1", label: "Add\nEquipment", icon: "add-circle-outline", color: "#0cadab", bg: "#f0fffe" },
  { id: "2", label: "My\nInventory", icon: "list-outline", color: "#22c55e", bg: "#f0fdf4" },
  { id: "3", label: "Earnings", icon: "wallet-outline", color: "#f59e0b", bg: "#fffbeb" },
  { id: "4", label: "Support", icon: "headset-outline", color: "#6366f1", bg: "#eef2ff" },
];

export default function CaptainHomeScreen() {
  const [isOnline, setIsOnline] = useState(captainData.isOnline);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing": return "#0cadab";
      case "upcoming": return "#f59e0b";
      case "completed": return "#22c55e";
      default: return "#8696a0";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "ongoing": return "#f0fffe";
      case "upcoming": return "#fffbeb";
      case "completed": return "#f0fdf4";
      default: return "#f8f9fa";
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8ff" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LinearGradient
          colors={["#f4f8ff", "#eef1f9", "#ffffff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: captainData.avatar }} style={styles.avatar} />
                  <View style={[styles.onlineIndicator, !isOnline && styles.offlineIndicator]} />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.greeting}>Partner Dashboard</Text>
                  <Text style={styles.captainName}>{captainData.name}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#FFC107" />
                    <Text style={styles.ratingText}>{captainData.rating}</Text>
                    <Text style={styles.ratingCount}>({captainData.totalRatings})</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.notifButton}>
                <Ionicons name="notifications-outline" size={22} color="#101720" />
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Online Status Toggle */}
            <View style={styles.statusToggleContainer}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>You're {isOnline ? "Online" : "Offline"}</Text>
                <Text style={styles.statusSubtext}>
                  {isOnline ? "Accepting bookings" : "Not accepting bookings"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleButton, isOnline && styles.toggleButtonActive]}
                onPress={() => setIsOnline(!isOnline)}
                activeOpacity={0.7}
              >
                <View style={[styles.toggleCircle, isOnline && styles.toggleCircleActive]} />
              </TouchableOpacity>
            </View>

            {/* Earnings Card */}
            <View style={styles.earningsSection}>
              <Text style={styles.sectionTitle}>Today's Earnings</Text>
              <LinearGradient
                colors={["#0cadab", "#0a9998"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.earningsCard}
              >
                <View style={styles.earningsHeader}>
                  <View>
                    <Text style={styles.earningsLabel}>TOTAL EARNED TODAY</Text>
                    <Text style={styles.earningsAmount}>₹{earningsData.today.toLocaleString()}</Text>
                  </View>
                  <View style={styles.earningsIcon}>
                    <Ionicons name="wallet-outline" size={28} color="#ffffff" />
                  </View>
                </View>

                <View style={styles.earningsGrid}>
                  <View style={styles.earningsItem}>
                    <Text style={styles.earningsItemLabel}>This Week</Text>
                    <Text style={styles.earningsItemValue}>₹{earningsData.thisWeek.toLocaleString()}</Text>
                  </View>
                  <View style={styles.earningsDivider} />
                  <View style={styles.earningsItem}>
                    <Text style={styles.earningsItemLabel}>This Month</Text>
                    <Text style={styles.earningsItemValue}>₹{earningsData.thisMonth.toLocaleString()}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.withdrawButton}>
                  <Text style={styles.withdrawButtonText}>Withdraw ₹{earningsData.pending.toLocaleString()}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#0cadab" />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsSection}>
              <View style={styles.statsGrid}>
                {statsData.map((stat) => (
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

            {/* Quick Actions */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.quickActionButton}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: action.bg }]}>
                      <Ionicons name={action.icon as any} size={24} color={action.color} />
                    </View>
                    <Text style={styles.quickActionLabel}>{action.label}</Text>
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

              {recentBookings.map((booking) => (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.bookingCard}
                  activeOpacity={0.9}
                >
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingTitleRow}>
                      <Text style={styles.bookingEventName} numberOfLines={1}>
                        {booking.eventName}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusBg(booking.status) }
                      ]}>
                        <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                          {booking.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.bookingClient}>{booking.clientName}</Text>
                  </View>

                  <View style={styles.bookingDetails}>
                    <View style={styles.bookingDetailRow}>
                      <Ionicons name="calendar-outline" size={15} color="#8696a0" />
                      <Text style={styles.bookingDetailText}>{booking.date}</Text>
                    </View>
                    <View style={styles.bookingDetailRow}>
                      <Ionicons name="location-outline" size={15} color="#8696a0" />
                      <Text style={styles.bookingDetailText} numberOfLines={1}>
                        {booking.location}
                      </Text>
                    </View>
                    <View style={styles.bookingDetailRow}>
                      <Ionicons name="hardware-chip-outline" size={15} color="#8696a0" />
                      <Text style={styles.bookingDetailText}>{booking.equipmentCount} items</Text>
                    </View>
                  </View>

                  <View style={styles.bookingFooter}>
                    <View>
                      <Text style={styles.amountLabel}>AMOUNT</Text>
                      <Text style={styles.amountValue}>₹{booking.amount.toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity style={styles.viewDetailsButton}>
                      <Text style={styles.viewDetailsText}>View</Text>
                      <Ionicons name="arrow-forward" size={14} color="#0cadab" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
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

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f3",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#e5e7eb",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2.5,
    borderColor: "#f4f8ff",
  },
  offlineIndicator: {
    backgroundColor: "#8696a0",
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  greeting: {
    fontSize: 11,
    color: "#8696a0",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  captainName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#101720",
    marginVertical: 1,
    letterSpacing: -0.3,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#101720",
  },
  ratingCount: {
    fontSize: 12,
    color: "#8696a0",
    fontWeight: "500",
  },
  notifButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "#eef0f3",
  },
  notificationBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#0cadab",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },

  // Status Toggle
  statusToggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eef0f3",
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#101720",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statusSubtext: {
    fontSize: 12,
    color: "#8696a0",
    fontWeight: "500",
  },
  toggleButton: {
    width: 54,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e5e7eb",
    padding: 2.5,
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#0cadab",
  },
  toggleCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#fff",
  },
  toggleCircleActive: {
    alignSelf: "flex-end",
  },

  // Earnings Section
  earningsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#101720",
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  earningsCard: {
    padding: 20,
    borderRadius: 22,
    shadowColor: "#0cadab",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  earningsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  earningsLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  earningsIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  earningsGrid: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  earningsItem: {
    flex: 1,
  },
  earningsDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  earningsItemLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "600",
    marginBottom: 5,
  },
  earningsItemValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  withdrawButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  withdrawButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0cadab",
  },

  // Stats Grid
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eef0f3",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#101720",
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: "#8696a0",
    fontWeight: "600",
  },

  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eef0f3",
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#101720",
    textAlign: "center",
    lineHeight: 14,
  },

  // Bookings
  bookingsSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionSub: {
    fontSize: 12,
    color: "#8696a0",
    fontWeight: "500",
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0cadab",
  },
  bookingCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eef0f3",
  },
  bookingHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  bookingTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 12,
  },
  bookingEventName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#101720",
    flex: 1,
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  bookingClient: {
    fontSize: 13,
    color: "#8696a0",
    fontWeight: "600",
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 14,
  },
  bookingDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bookingDetailText: {
    fontSize: 13,
    color: "#5a6169",
    fontWeight: "500",
    flex: 1,
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  amountLabel: {
    fontSize: 10,
    color: "#8696a0",
    fontWeight: "700",
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0cadab",
    letterSpacing: -0.5,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fffe",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0cadab",
  },

  bottomSpacing: {
    height: 20,
  },
});