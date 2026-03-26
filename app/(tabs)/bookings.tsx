import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { bookingApi } from "../../services/captainApi";


const { width } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────
interface Booking {
  id: number;
  status: string;
  paymentStatus: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  guestCount?: number;
  specialRequests?: string;
  deliveryCity?: string;
  deliveryStreet?: string;
  deliveryState?: string;
  deliveryDistanceKm?: number;
  djFee: number;
  equipmentFee: number;
  deliveryFee: number;
  totalAmount: number;
  captainNotes?: string;
  equipmentItems?: any[];
  createdAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    locationCity?: string;
  };
  dj?: {
    id: number;
    name: string;
    phone?: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  Pending:              { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", icon: "time-outline" },
  Confirmed:            { color: "#0cadab", bg: "#f0fffe", border: "#a5f3fc", icon: "checkmark-circle-outline" },
  "Equipment Dispatched": { color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe", icon: "car-outline" },
  "In Progress":        { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", icon: "play-circle-outline" },
  Completed:            { color: "#8696a0", bg: "#f8fafc", border: "#e2e8f0", icon: "checkmark-done-outline" },
  Cancelled:            { color: "#ef4444", bg: "#fef2f2", border: "#fecaca", icon: "close-circle-outline" },
};

const PAYMENT_CONFIG: Record<string, { color: string; bg: string }> = {
  Pending:       { color: "#f59e0b", bg: "#fffbeb" },
  Paid:          { color: "#22c55e", bg: "#f0fdf4" },
  "Partially Paid": { color: "#6366f1", bg: "#eef2ff" },
  Refunded:      { color: "#8696a0", bg: "#f8fafc" },
};

const fmt = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const fmtTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

// ─── Status Update Modal ──────────────────────────────────────────────────────
const StatusModal = ({
  visible,
  booking,
  onClose,
  onUpdate,
}: {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onUpdate: (status: string, notes?: string) => void;
}) => {
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => { if (!visible) setNotes(""); }, [visible]);

  const handleUpdate = async (status: string) => {
    setUpdating(true);
    onUpdate(status, notes || undefined);
    setUpdating(false);
    onClose();
  };

  if (!booking) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalS.overlay}>
        <View style={modalS.sheet}>
          <View style={modalS.handle} />
          <Text style={modalS.title}>Update Booking Status</Text>
          <Text style={modalS.bookingId}>Booking #{booking.id} · {booking.user?.firstName} {booking.user?.lastName}</Text>

          <TextInput
            style={modalS.notesInput}
            placeholder="Add captain notes (optional)..."
            placeholderTextColor="#8696a0"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <View style={modalS.statusGrid}>
            {bookingApi.STATUSES.filter(s => s !== booking.status).map(status => {
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
              return (
                <TouchableOpacity
                  key={status}
                  style={[modalS.statusBtn, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
                  onPress={() => handleUpdate(status)}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                  <Text style={[modalS.statusBtnText, { color: cfg.color }]}>{status}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={modalS.cancelBtn} onPress={onClose}>
            <Text style={modalS.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Booking Detail Modal ─────────────────────────────────────────────────────
const BookingDetailModal = ({
  visible,
  booking,
  onClose,
  onStatusPress,
  onPaymentUpdate,
}: {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onStatusPress: () => void;
  onPaymentUpdate: (status: string) => void;
}) => {
  if (!booking) return null;

  const sCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.Pending;
  const pCfg = PAYMENT_CONFIG[booking.paymentStatus] || PAYMENT_CONFIG.Pending;

  const Row = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={detailS.row}>
      <Ionicons name={icon as any} size={16} color="#8696a0" style={detailS.rowIcon} />
      <View style={detailS.rowContent}>
        <Text style={detailS.rowLabel}>{label}</Text>
        <Text style={detailS.rowValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={detailS.overlay}>
        <View style={detailS.sheet}>
          <View style={detailS.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={detailS.header}>
              <View style={detailS.headerLeft}>
                <Text style={detailS.eventType}>{booking.eventType}</Text>
                <Text style={detailS.bookingId}>Booking #{booking.id}</Text>
              </View>
              <View style={[detailS.statusBadge, { backgroundColor: sCfg.bg, borderColor: sCfg.border }]}>
                <Ionicons name={sCfg.icon as any} size={13} color={sCfg.color} />
                <Text style={[detailS.statusText, { color: sCfg.color }]}>{booking.status}</Text>
              </View>
            </View>

            {/* Client Info */}
            <View style={detailS.section}>
              <Text style={detailS.sectionTitle}>CLIENT</Text>
              <View style={detailS.clientCard}>
                <View style={detailS.clientAvatar}>
                  <Text style={detailS.clientInitial}>
                    {booking.user?.firstName?.[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <View style={detailS.clientInfo}>
                  <Text style={detailS.clientName}>
                    {booking.user?.firstName} {booking.user?.lastName}
                  </Text>
                  <Text style={detailS.clientPhone}>{booking.user?.phone}</Text>
                </View>
                <TouchableOpacity style={detailS.callBtn}>
                  <Ionicons name="call-outline" size={18} color="#0cadab" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Event Info */}
            <View style={detailS.section}>
              <Text style={detailS.sectionTitle}>EVENT DETAILS</Text>
              <Row icon="calendar-outline" label="Date" value={fmt(booking.eventDate)} />
              <Row icon="time-outline" label="Time" value={`${booking.startTime} – ${booking.endTime} (${booking.durationHours}h)`} />
              {booking.guestCount ? <Row icon="people-outline" label="Guests" value={String(booking.guestCount)} /> : null}
              {booking.deliveryCity ? <Row icon="location-outline" label="Location" value={`${booking.deliveryStreet || ""} ${booking.deliveryCity}`} /> : null}
              {booking.deliveryDistanceKm ? <Row icon="navigate-outline" label="Distance" value={`${booking.deliveryDistanceKm} km`} /> : null}
            </View>

            {/* DJ */}
            {booking.dj ? (
              <View style={detailS.section}>
                <Text style={detailS.sectionTitle}>DJ</Text>
                <Row icon="musical-notes-outline" label="Name" value={booking.dj.name} />
                {booking.dj.phone ? <Row icon="call-outline" label="Phone" value={booking.dj.phone} /> : null}
              </View>
            ) : null}

            {/* Equipment */}
            {booking.equipmentItems && booking.equipmentItems.length > 0 ? (
              <View style={detailS.section}>
                <Text style={detailS.sectionTitle}>EQUIPMENT ({booking.equipmentItems.length} items)</Text>
                {booking.equipmentItems.map((item: any, i: number) => (
                  <View key={i} style={detailS.equipItem}>
                    <Ionicons name="hardware-chip-outline" size={14} color="#0cadab" />
                    <Text style={detailS.equipName}>
                      {item.name} × {item.quantity} ({item.days}d)
                    </Text>
                    <Text style={detailS.equipPrice}>₹{(item.itemTotal || 0).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Pricing */}
            <View style={detailS.section}>
              <Text style={detailS.sectionTitle}>PRICING</Text>
              {booking.djFee > 0 ? <View style={detailS.priceRow}>
                <Text style={detailS.priceLabel}>DJ Fee</Text>
                <Text style={detailS.priceVal}>₹{Number(booking.djFee).toLocaleString()}</Text>
              </View> : null}
              {booking.equipmentFee > 0 ? <View style={detailS.priceRow}>
                <Text style={detailS.priceLabel}>Equipment Fee</Text>
                <Text style={detailS.priceVal}>₹{Number(booking.equipmentFee).toLocaleString()}</Text>
              </View> : null}
              {booking.deliveryFee > 0 ? <View style={detailS.priceRow}>
                <Text style={detailS.priceLabel}>Delivery Fee</Text>
                <Text style={detailS.priceVal}>₹{Number(booking.deliveryFee).toLocaleString()}</Text>
              </View> : null}
              <View style={[detailS.priceRow, detailS.totalRow]}>
                <Text style={detailS.totalLabel}>Total</Text>
                <Text style={detailS.totalVal}>₹{Number(booking.totalAmount).toLocaleString()}</Text>
              </View>
            </View>

            {/* Payment Status */}
            <View style={detailS.section}>
              <Text style={detailS.sectionTitle}>PAYMENT</Text>
              <View style={detailS.paymentRow}>
                <View style={[detailS.payBadge, { backgroundColor: pCfg.bg }]}>
                  <Text style={[detailS.payBadgeText, { color: pCfg.color }]}>{booking.paymentStatus}</Text>
                </View>
                <View style={detailS.payBtns}>
                  {["Paid", "Partially Paid", "Refunded"].map(s => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => onPaymentUpdate(s)}
                      style={[detailS.payBtn, booking.paymentStatus === s && detailS.payBtnActive]}
                    >
                      <Text style={[detailS.payBtnText, booking.paymentStatus === s && detailS.payBtnTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Special Requests */}
            {booking.specialRequests ? (
              <View style={detailS.section}>
                <Text style={detailS.sectionTitle}>SPECIAL REQUESTS</Text>
                <Text style={detailS.specialReq}>{booking.specialRequests}</Text>
              </View>
            ) : null}

            {/* Notes */}
            {booking.captainNotes ? (
              <View style={detailS.section}>
                <Text style={detailS.sectionTitle}>CAPTAIN NOTES</Text>
                <Text style={detailS.specialReq}>{booking.captainNotes}</Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={detailS.actions}>
              <TouchableOpacity style={detailS.updateBtn} onPress={onStatusPress} activeOpacity={0.8}>
                <LinearGradient colors={["#0cadab", "#0a9998"]} style={detailS.updateBtnGrad}>
                  <Ionicons name="swap-horizontal-outline" size={16} color="#fff" />
                  <Text style={detailS.updateBtnText}>Update Status</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={detailS.closeBtn} onPress={onClose}>
                <Text style={detailS.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Booking Card ─────────────────────────────────────────────────────────────
const BookingCard = ({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) => {
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.Pending;
  const pCfg = PAYMENT_CONFIG[booking.paymentStatus] || PAYMENT_CONFIG.Pending;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.cardEvent}>{booking.eventType}</Text>
          <Text style={styles.cardId}>#{booking.id}</Text>
        </View>
        <View style={[styles.cardStatus, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
          <Text style={[styles.cardStatusText, { color: cfg.color }]}>{booking.status}</Text>
        </View>
      </View>

      {/* Client */}
      <View style={styles.cardRow}>
        <Ionicons name="person-outline" size={14} color="#8696a0" />
        <Text style={styles.cardRowText}>
          {booking.user?.firstName} {booking.user?.lastName}
        </Text>
        <Text style={styles.cardPhone}>{booking.user?.phone}</Text>
      </View>

      {/* Date & Location */}
      <View style={styles.cardRow}>
        <Ionicons name="calendar-outline" size={14} color="#8696a0" />
        <Text style={styles.cardRowText}>{fmt(booking.eventDate)} · {booking.startTime}</Text>
      </View>

      {booking.deliveryCity ? (
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={14} color="#8696a0" />
          <Text style={styles.cardRowText} numberOfLines={1}>{booking.deliveryCity}</Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardAmountLabel}>TOTAL</Text>
          <Text style={styles.cardAmount}>₹{Number(booking.totalAmount).toLocaleString()}</Text>
        </View>
        <View style={styles.cardFooterRight}>
          <View style={[styles.payBadge, { backgroundColor: pCfg.bg }]}>
            <Text style={[styles.payBadgeText, { color: pCfg.color }]}>{booking.paymentStatus}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#c4c9d0" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const router = useRouter();

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const LIMIT = 20;
  const ALL_STATUSES = ["All", ...bookingApi.STATUSES];

  const fetchBookings = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const params: any = { page: currentPage, limit: LIMIT };
      if (selectedStatus !== "All") params.status = selectedStatus;

      const res = await bookingApi.getAll(params);
      console.log("response:", res);
      if (res.success) {
        const newData = res.data || [];
        setTotalCount(res.count || 0);
        setHasMore(currentPage < (res.totalPages || 1));
        setBookings(prev => reset ? newData : [...prev, ...newData]);
        if (!reset) setPage(p => p + 1);
      }
    } catch (err: any) {
      console.error("Bookings fetch error:", err.response?.data || err.message);
      console.error("Status:", err.response?.status);
      console.error("Full error:", err);

      let msg = err.message || "Failed to fetch bookings";
      if (err.response?.status === 403) {
        msg = err.response.data?.message || "Access denied. Please complete captain profile or re-login.";
        Alert.alert("Access Denied", msg);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, selectedStatus]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setBookings([]);
    fetchBookings(true);
  }, [selectedStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchBookings(true);
  };

  const handleStatusUpdate = async (status: string, notes?: string) => {
    if (!selectedBooking) return;
    try {
      const res = await bookingApi.updateStatus(selectedBooking.id, status, notes);
      if (res.success) {
        setBookings(prev =>
          prev.map(b => b.id === selectedBooking.id
            ? { ...b, status, captainNotes: notes || b.captainNotes }
            : b)
        );
        setSelectedBooking(prev => prev ? { ...prev, status, captainNotes: notes || prev.captainNotes } : null);
        Alert.alert("Updated", `Status changed to ${status}`);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update status");
    }
  };

  const handlePaymentUpdate = async (paymentStatus: string) => {
    if (!selectedBooking) return;
    try {
      const res = await bookingApi.updatePayment(selectedBooking.id, { paymentStatus: paymentStatus as any });
      if (res.success) {
        setBookings(prev =>
          prev.map(b => b.id === selectedBooking.id ? { ...b, paymentStatus } : b)
        );
        setSelectedBooking(prev => prev ? { ...prev, paymentStatus } : null);
        Alert.alert("Updated", `Payment status: ${paymentStatus}`);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update payment");
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="calendar-outline" size={40} color="#c4c9d0" />
      </View>
      <Text style={styles.emptyTitle}>No bookings yet</Text>
      <Text style={styles.emptySub}>
        {selectedStatus === "All"
          ? "Your bookings will appear here"
          : `No ${selectedStatus} bookings`}
      </Text>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8ff" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LinearGradient colors={["#f4f8ff", "#eef1f9", "#ffffff"]} style={{ flex: 1 }}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>Bookings</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCount}</Text>
            </View>
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {ALL_STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setSelectedStatus(s)}
                style={[styles.filterChip, selectedStatus === s && styles.filterChipActive]}
                activeOpacity={0.8}
              >
                {s !== "All" && (
                  <View style={[
                    styles.filterDot,
                    { backgroundColor: STATUS_CONFIG[s]?.color || "#8696a0" },
                    selectedStatus !== s && { opacity: 0.5 }
                  ]} />
                )}
                <Text style={[styles.filterChipText, selectedStatus === s && styles.filterChipTextActive]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* List */}
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#0cadab" />
            </View>
          ) : (
            <FlatList
              data={bookings}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <BookingCard
                  booking={item}
                  onPress={() => {
                    router.push(`/bookings/${item.id}`);   // Opens full screen
                  }}
                />
              )}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={styles.listContent}
              onEndReached={() => { if (hasMore && !loading) fetchBookings(); }}
              onEndReachedThreshold={0.3}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0cadab" />
              }
              ListFooterComponent={
                hasMore && bookings.length > 0
                  ? <ActivityIndicator size="small" color="#0cadab" style={{ marginVertical: 16 }} />
                  : null
              }
            />
          )}
        </LinearGradient>
      </SafeAreaView>

      <BookingDetailModal
        visible={showDetail}
        booking={selectedBooking}
        onClose={() => setShowDetail(false)}
        onStatusPress={() => {
          setShowDetail(false);
          setShowStatusModal(true);
        }}
        onPaymentUpdate={handlePaymentUpdate}
      />

      <StatusModal
        visible={showStatusModal}
        booking={selectedBooking}
        onClose={() => setShowStatusModal(false)}
        onUpdate={handleStatusUpdate}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8ff" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f3",
    gap: 10,
  },
  topBarTitle: { fontSize: 26, fontWeight: "800", color: "#101720", letterSpacing: -0.5, flex: 1 },
  countBadge: {
    backgroundColor: "#0cadab",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { fontSize: 13, fontWeight: "800", color: "#fff" },

  filterScroll: { maxHeight: 52 },
  filterContent: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eef0f3",
  },
  filterChipActive: { backgroundColor: "#101720", borderColor: "#101720" },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "#8696a0" },
  filterChipTextActive: { color: "#fff" },

  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 120, gap: 10 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eef0f3",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardTopLeft: { flex: 1 },
  cardEvent: { fontSize: 16, fontWeight: "800", color: "#101720", letterSpacing: -0.3 },
  cardId: { fontSize: 12, color: "#8696a0", fontWeight: "500", marginTop: 2 },
  cardStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardStatusText: { fontSize: 11, fontWeight: "800" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 5 },
  cardRowText: { fontSize: 13, color: "#5a6169", fontWeight: "500", flex: 1 },
  cardPhone: { fontSize: 12, color: "#0cadab", fontWeight: "600" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cardAmountLabel: { fontSize: 9, color: "#8696a0", fontWeight: "700", letterSpacing: 0.5, marginBottom: 2 },
  cardAmount: { fontSize: 18, fontWeight: "800", color: "#0cadab", letterSpacing: -0.4 },
  cardFooterRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  payBadgeText: { fontSize: 11, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "#f4f8ff", justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#eef0f3", marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#101720", letterSpacing: -0.3 },
  emptySub: { fontSize: 14, color: "#8696a0", fontWeight: "500", textAlign: "center" },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(16,23,32,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "800", color: "#101720", marginBottom: 4, letterSpacing: -0.4 },
  bookingId: { fontSize: 13, color: "#8696a0", fontWeight: "500", marginBottom: 16 },
  notesInput: {
    borderWidth: 1, borderColor: "#eef0f3", borderRadius: 14,
    padding: 14, fontSize: 14, color: "#101720", marginBottom: 16,
    minHeight: 80, textAlignVertical: "top",
  },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  statusBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, minWidth: (width - 72) / 2,
  },
  statusBtnText: { fontSize: 13, fontWeight: "700" },
  cancelBtn: {
    backgroundColor: "#f4f8ff", borderRadius: 14, paddingVertical: 14,
    alignItems: "center", borderWidth: 1, borderColor: "#eef0f3",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: "#8696a0" },
});

const detailS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(16,23,32,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 12, maxHeight: "92%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb", alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  headerLeft: { flex: 1 },
  eventType: { fontSize: 22, fontWeight: "800", color: "#101720", letterSpacing: -0.5 },
  bookingId: { fontSize: 13, color: "#8696a0", fontWeight: "500", marginTop: 3 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: "800" },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: "#8696a0", letterSpacing: 1,
    textTransform: "uppercase", marginBottom: 10,
  },

  clientCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f8fafc", borderRadius: 14, padding: 12,
  },
  clientAvatar: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: "#0cadab", justifyContent: "center", alignItems: "center",
  },
  clientInitial: { fontSize: 18, fontWeight: "800", color: "#fff" },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: "700", color: "#101720" },
  clientPhone: { fontSize: 13, color: "#0cadab", fontWeight: "600", marginTop: 2 },
  callBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#f0fffe", justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#a5f3fc",
  },

  row: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  rowIcon: { marginRight: 10, marginTop: 1 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 11, color: "#8696a0", fontWeight: "600", marginBottom: 2 },
  rowValue: { fontSize: 14, color: "#101720", fontWeight: "600" },

  equipItem: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  equipName: { flex: 1, fontSize: 13, color: "#5a6169", fontWeight: "500" },
  equipPrice: { fontSize: 13, fontWeight: "700", color: "#101720" },

  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  priceLabel: { fontSize: 13, color: "#8696a0", fontWeight: "500" },
  priceVal: { fontSize: 13, color: "#101720", fontWeight: "600" },
  totalRow: {
    marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#eef0f3",
  },
  totalLabel: { fontSize: 15, color: "#101720", fontWeight: "700" },
  totalVal: { fontSize: 18, color: "#0cadab", fontWeight: "800", letterSpacing: -0.4 },

  paymentRow: { gap: 10 },
  payBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: "flex-start" },
  payBadgeText: { fontSize: 13, fontWeight: "700" },
  payBtns: { flexDirection: "row", gap: 8 },
  payBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "#f4f8ff", borderWidth: 1, borderColor: "#eef0f3",
  },
  payBtnActive: { backgroundColor: "#0cadab", borderColor: "#0cadab" },
  payBtnText: { fontSize: 12, fontWeight: "700", color: "#8696a0" },
  payBtnTextActive: { color: "#fff" },

  specialReq: {
    fontSize: 14, color: "#5a6169", fontWeight: "500", lineHeight: 22,
    backgroundColor: "#f8fafc", borderRadius: 12, padding: 12,
  },

  actions: { gap: 10, marginTop: 8, paddingBottom: 20 },
  updateBtn: { borderRadius: 16, overflow: "hidden" },
  updateBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14,
  },
  updateBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  closeBtn: {
    backgroundColor: "#f4f8ff", borderRadius: 16, paddingVertical: 14,
    alignItems: "center", borderWidth: 1, borderColor: "#eef0f3",
  },
  closeBtnText: { fontSize: 15, fontWeight: "700", color: "#8696a0" },
});