/**
 * app/wallet/refund.tsx  —  Request a Refund
 *
 * Flow:
 *   1. Loads the user's bookings that have a payment (completed / cancelled)
 *   2. User selects a booking → selects a reason → submits
 *   3. Calls apiService.initiateRefund(paymentId, { reason })
 *   4. Shows confirmation screen with estimated timeline
 *
 * Eligibility:
 *   • Booking status: Cancelled  → full refund eligible
 *   • Booking status: Completed  → partial refund (disputes)
 *   • Only bookings with a valid transactionId / paymentId
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService } from "../../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveAmount(raw: any): number {
  const n = Number(raw) || 0;
  return n > 10000 ? Math.round(n / 100) : n;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return "—"; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RefundableBooking {
  id: string | number;
  djName: string;
  eventType: string;
  eventDate: string;
  amount: number;             // booking fee paid
  paymentId: string;          // razorpay payment ID
  status: "cancelled" | "completed";
  refundEligibility: "full" | "partial";
}

const REASONS = [
  "DJ cancelled the booking",
  "Event was cancelled by me",
  "DJ did not show up",
  "Service quality was poor",
  "Duplicate payment made",
  "Wrong amount charged",
  "Technical issue during booking",
  "Other",
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{
      width: w as any, height: h, borderRadius: r, backgroundColor: "#e5e7eb",
      opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }),
    }} />
  );
}

// ─── Booking Card (Selectable) ────────────────────────────────────────────────

function BookingCard({
  booking, selected, onSelect,
}: {
  booking: RefundableBooking;
  selected: boolean;
  onSelect: () => void;
}) {
  const isCancelled = booking.status === "cancelled";

  return (
    <TouchableOpacity
      style={[s.bookingCard, selected && s.bookingCardOn]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      {/* Selection circle */}
      <View style={[s.selectCircle, selected && s.selectCircleOn]}>
        {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>

      <View style={{ flex: 1 }}>
        <View style={s.cardTopRow}>
          <Text style={s.cardName} numberOfLines={1}>{booking.djName}</Text>
          <View style={[s.eligBadge,
            { backgroundColor: isCancelled ? "#fef2f2" : "#fffbeb",
              borderColor:      isCancelled ? "#fecaca"  : "#fde68a" }]}>
            <Text style={[s.eligBadgeText,
              { color: isCancelled ? "#dc2626" : "#d97706" }]}>
              {isCancelled ? "Full Refund" : "Partial"}
            </Text>
          </View>
        </View>

        <Text style={s.cardMeta}>
          {booking.eventType} · {booking.eventDate}
        </Text>

        <View style={s.cardAmtRow}>
          <View style={[s.statusDot, { backgroundColor: isCancelled ? "#ef4444" : "#f59e0b" }]} />
          <Text style={s.cardStatus}>{isCancelled ? "Cancelled" : "Completed"}</Text>
          <Text style={s.cardAmt}>₹{booking.amount.toLocaleString("en-IN")} paid</Text>
        </View>

        <Text style={s.paymentIdText} numberOfLines={1}>
          Txn: {booking.paymentId.slice(-14)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessView({ booking, onDone }: {
  booking: RefundableBooking; onDone: () => void;
}) {
  const scale = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.spring(scale, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }).start();
  }, []);
  return (
    <View style={sv.root}>
      <Animated.View style={[sv.iconWrap, { transform: [{ scale }] }]}>
        <LinearGradient colors={["#8b5cf6","#7c3aed"]} style={sv.iconCircle}>
          <Ionicons name="checkmark" size={44} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Text style={sv.title}>Refund Requested!</Text>
      <Text style={sv.sub}>
        Your refund of{" "}
        <Text style={{ fontWeight: "800", color: "#101720" }}>
          ₹{booking.amount.toLocaleString("en-IN")}
        </Text>{" "}
        for <Text style={{ fontWeight: "700" }}>{booking.djName}</Text> has been submitted.
      </Text>

      {/* Timeline */}
      <View style={sv.timeline}>
        {[
          { label: "Request Submitted",     sub: "Just now",          done: true  },
          { label: "Under Review",           sub: "Within 2–4 hours",  done: false },
          { label: "Refund Processed",       sub: "1–3 business days", done: false },
          { label: "Credit to Source",       sub: "3–5 business days", done: false },
        ].map((step, i, arr) => (
          <View key={step.label} style={sv.timelineItem}>
            <View style={sv.timelineLeft}>
              <View style={[sv.timelineDot, step.done && sv.timelineDotDone]}>
                {step.done && <Ionicons name="checkmark" size={10} color="#fff" />}
              </View>
              {i < arr.length - 1 && <View style={sv.timelineLine} />}
            </View>
            <View style={sv.timelineRight}>
              <Text style={[sv.timelineLabel, step.done && { color: "#8b5cf6" }]}>{step.label}</Text>
              <Text style={sv.timelineSub}>{step.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={sv.noteCard}>
        <Ionicons name="information-circle-outline" size={16} color="#0cadab" />
        <Text style={sv.noteText}>
          Refunds are credited to the original payment method. UPI refunds typically arrive faster than card refunds.
        </Text>
      </View>

      <TouchableOpacity style={sv.doneBtn} onPress={onDone} activeOpacity={0.88}>
        <Text style={sv.doneBtnText}>Back to Wallet</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Step = "select" | "reason" | "confirm" | "success";

export default function RefundScreen() {
  const router = useRouter();

  const [bookings,      setBookings]      = useState<RefundableBooking[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState<RefundableBooking | null>(null);
  const [reason,        setReason]        = useState("");
  const [customReason,  setCustomReason]  = useState("");
  const [step,          setStep]          = useState<Step>("select");
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiService.getMyBookings({ limit: 100 });
      const list: any[] = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];

      const eligible: RefundableBooking[] = list
        .filter(b => {
          const st = (b.status ?? "").toLowerCase();
          const hasPayment = !!(b.transactionId ?? b.razorpay_payment_id ?? b.paymentId);
          return (st === "cancelled" || st === "canceled" || st === "completed") && hasPayment;
        })
        .map(b => {
          const st = (b.status ?? "").toLowerCase();
          const dj = b.dj ?? b.djProfile ?? b.djDetails ?? null;
          return {
            id:               b.id,
            djName:           dj?.name ?? b.djName ?? "DJ",
            eventType:        b.eventType ?? b.eventDetails?.eventType ?? "Event",
            eventDate:        fmtDate(b.eventDate ?? b.eventDetails?.eventDate ?? ""),
            amount:           resolveAmount(b.totalAmount ?? b.basePrice ?? b.eventDetails?.basePrice ?? 0),
            paymentId:        b.transactionId ?? b.razorpay_payment_id ?? b.paymentId ?? "",
            status:           (st === "cancelled" || st === "canceled") ? "canceled" as any : "completed",
            refundEligibility: (st === "cancelled" || st === "canceled") ? "full" : "partial",
          } as RefundableBooking;
        });

      setBookings(eligible);
    } catch (err) {
      console.error("Refund load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSubmit = async () => {
    if (!selected) return;
    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!finalReason) { setError("Please describe the reason for refund."); return; }

    setError(""); setSubmitting(true);
    try {
      await apiService.initiateRefund(selected.paymentId, {
        amount: selected.refundEligibility === "full" ? selected.amount : undefined,
        reason: finalReason,
      });
      setStep("success");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Refund request failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step: select booking ────────────────────────────────────────────────────
  if (step === "success" && selected) {
    return (
      <SafeAreaView style={s.root} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f4f8ff" />
        <SuccessView booking={selected} onDone={() => router.replace("/wallet" as any)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8ff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn}
          onPress={() => { if (step === "reason" || step === "confirm") setStep("select"); else router.back(); }}
          activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#101720" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>
            {step === "select"  ? "Request Refund"   :
             step === "reason"  ? "Reason for Refund" :
             "Confirm Refund"}
          </Text>
          <Text style={s.headerSub}>
            {step === "select" ? "Select the booking to refund" :
             step === "reason" ? "Help us understand the issue" :
             "Review before submitting"}
          </Text>
        </View>
        {/* Step dots */}
        <View style={s.stepDots}>
          {(["select","reason","confirm"] as Step[]).map(st => (
            <View key={st} style={[s.stepDot,
              step === st          && s.stepDotActive,
              (step === "reason" && st === "select") && s.stepDotDone,
              (step === "confirm" && (st === "select" || st === "reason")) && s.stepDotDone,
            ]} />
          ))}
        </View>
      </View>

      {/* ── Step 1: Select booking ── */}
      {step === "select" && (
        <>
          {loading ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
              {[1,2,3].map(i => (
                <View key={i} style={[s.bookingCard, { gap: 10 }]}>
                  <Skel w="60%" h={16} r={5} />
                  <Skel w="40%" h={12} r={4} />
                  <Skel w="50%" h={12} r={4} />
                </View>
              ))}
            </ScrollView>
          ) : bookings.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="checkmark-circle-outline" size={36} color="#0cadab" />
              </View>
              <Text style={s.emptyTitle}>No refunds available</Text>
              <Text style={s.emptySub}>
                You don't have any eligible bookings for a refund right now.
                Only cancelled or completed bookings with a payment are eligible.
              </Text>
            </View>
          ) : (
            <>
              <View style={s.infoCard}>
                <Ionicons name="information-circle-outline" size={15} color="#0cadab" />
                <Text style={s.infoText}>
                  Cancelled bookings are eligible for a full refund.
                  Completed bookings may be eligible for a partial refund in case of disputes.
                </Text>
              </View>

              <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}>
                {bookings.map(b => (
                  <BookingCard key={b.id} booking={b}
                    selected={selected?.id === b.id}
                    onSelect={() => setSelected(b)} />
                ))}
              </ScrollView>

              <View style={s.stickyBar}>
                <TouchableOpacity
                  style={[s.nextBtn, !selected && s.nextBtnOff]}
                  disabled={!selected}
                  onPress={() => setStep("reason")}
                  activeOpacity={0.88}
                >
                  <Text style={s.nextBtnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}

      {/* ── Step 2: Select reason ── */}
      {step === "reason" && selected && (
        <>
          {/* Selected booking mini-card */}
          <View style={s.miniCard}>
            <Ionicons name="musical-notes-outline" size={18} color="#0cadab" />
            <View style={{ flex: 1 }}>
              <Text style={s.miniCardName}>{selected.djName}</Text>
              <Text style={s.miniCardMeta}>{selected.eventType} · {selected.eventDate} · ₹{selected.amount.toLocaleString("en-IN")}</Text>
            </View>
            <TouchableOpacity onPress={() => setStep("select")} activeOpacity={0.8}>
              <Text style={s.changeLink}>Change</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}>
            <Text style={s.reasonTitle}>Select a reason</Text>

            {REASONS.map(r => (
              <TouchableOpacity key={r}
                style={[s.reasonRow, reason === r && s.reasonRowOn]}
                onPress={() => { setReason(r); setCustomReason(""); setError(""); }}
                activeOpacity={0.8}>
                <View style={[s.reasonRadio, reason === r && s.reasonRadioOn]}>
                  {reason === r && <View style={s.reasonRadioDot} />}
                </View>
                <Text style={[s.reasonText, reason === r && s.reasonTextOn]}>{r}</Text>
              </TouchableOpacity>
            ))}

            {reason === "Other" && (
              <View style={s.customWrap}>
                <Text style={s.customLabel}>Describe the issue</Text>
                <TextInput
                  style={s.customInput}
                  value={customReason}
                  onChangeText={v => { setCustomReason(v); setError(""); }}
                  placeholder="Please explain in detail…"
                  placeholderTextColor="#c4c9d0"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}

            {!!error && (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#dc2626" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={s.stickyBar}>
            <TouchableOpacity
              style={[s.nextBtn, !reason && s.nextBtnOff]}
              disabled={!reason}
              onPress={() => { setError(""); setStep("confirm"); }}
              activeOpacity={0.88}
            >
              <Text style={s.nextBtnText}>Review Request</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Step 3: Confirm ── */}
      {step === "confirm" && selected && (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}>

            {/* Summary card */}
            <View style={s.confirmCard}>
              <Text style={s.confirmSectionLabel}>Booking</Text>
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>DJ</Text>
                <Text style={s.confirmValue}>{selected.djName}</Text>
              </View>
              <View style={s.rowDivider} />
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>Event</Text>
                <Text style={s.confirmValue}>{selected.eventType}</Text>
              </View>
              <View style={s.rowDivider} />
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>Date</Text>
                <Text style={s.confirmValue}>{selected.eventDate}</Text>
              </View>
              <View style={s.rowDivider} />
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>Payment ID</Text>
                <Text style={s.confirmValue} numberOfLines={1}>{selected.paymentId.slice(-14)}</Text>
              </View>
            </View>

            {/* Refund details */}
            <View style={s.confirmCard}>
              <Text style={s.confirmSectionLabel}>Refund</Text>
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>Refund Type</Text>
                <Text style={[s.confirmValue, { color: selected.refundEligibility === "full" ? "#16a34a" : "#f59e0b" }]}>
                  {selected.refundEligibility === "full" ? "Full Refund" : "Partial Refund"}
                </Text>
              </View>
              <View style={s.rowDivider} />
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>Amount</Text>
                <Text style={[s.confirmValue, { fontSize: 18, fontWeight: "800", color: "#8b5cf6" }]}>
                  ₹{selected.amount.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={s.rowDivider} />
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>Reason</Text>
                <Text style={s.confirmValue} numberOfLines={2}>
                  {reason === "Other" ? customReason : reason}
                </Text>
              </View>
            </View>

            {/* Timeline estimate */}
            <View style={s.timelineCard}>
              <Text style={s.timelineCardTitle}>Expected Timeline</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="time-outline" size={16} color="#8b5cf6" />
                <Text style={s.timelineCardText}>Refund within <Text style={{ fontWeight: "800" }}>1–5 business days</Text></Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                <Ionicons name="phone-portrait-outline" size={16} color="#8b5cf6" />
                <Text style={s.timelineCardText}>Credited to your original payment method</Text>
              </View>
            </View>

            {!!error && (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={s.stickyBar}>
            <TouchableOpacity
              style={[s.nextBtn, submitting && s.nextBtnOff, { backgroundColor: "#8b5cf6" }]}
              disabled={submitting}
              onPress={handleSubmit}
              activeOpacity={0.88}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="refresh-outline" size={18} color="#fff" />
                    <Text style={s.nextBtnText}>Submit Refund Request</Text></>
              }
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: "#f4f8ff" },

  header:            { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: "#f4f8ff", borderBottomWidth: 1, borderBottomColor: "#eef0f3" },
  backBtn:           { width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#eef0f3" },
  headerTitle:       { fontSize: 18, fontWeight: "800", color: "#101720", letterSpacing: -0.3 },
  headerSub:         { fontSize: 11, color: "#8696a0", fontWeight: "500", marginTop: 2 },
  stepDots:          { flexDirection: "row", gap: 5 },
  stepDot:           { width: 7, height: 7, borderRadius: 4, backgroundColor: "#e5e7eb" },
  stepDotActive:     { backgroundColor: "#101720", width: 18 },
  stepDotDone:       { backgroundColor: "#22c55e" },

  // Info card
  infoCard:          { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#f0fafa", borderRadius: 14, padding: 14, marginHorizontal: 20, marginTop: 14, marginBottom: 4, borderWidth: 1, borderColor: "#d0f0ef" },
  infoText:          { flex: 1, fontSize: 12, color: "#374151", lineHeight: 18, fontWeight: "500" },

  // Booking card
  bookingCard:       { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: "#eef0f3", flexDirection: "row", gap: 12 },
  bookingCardOn:     { borderColor: "#8b5cf6", backgroundColor: "#faf5ff" },
  selectCircle:      { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#d1d5db", justifyContent: "center", alignItems: "center", marginTop: 2 },
  selectCircleOn:    { backgroundColor: "#8b5cf6", borderColor: "#8b5cf6" },
  cardTopRow:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  cardName:          { fontSize: 15, fontWeight: "700", color: "#101720", flex: 1, letterSpacing: -0.2 },
  eligBadge:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, marginLeft: 8 },
  eligBadgeText:     { fontSize: 10, fontWeight: "700" },
  cardMeta:          { fontSize: 12, color: "#8696a0", fontWeight: "500", marginBottom: 8 },
  cardAmtRow:        { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  statusDot:         { width: 7, height: 7, borderRadius: 4 },
  cardStatus:        { fontSize: 12, fontWeight: "600", color: "#6b7280", flex: 1 },
  cardAmt:           { fontSize: 14, fontWeight: "800", color: "#101720" },
  paymentIdText:     { fontSize: 10, color: "#9ca3af", fontWeight: "500" },

  // Mini selected card
  miniCard:          { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f0fafa", borderRadius: 14, padding: 14, marginHorizontal: 20, marginTop: 14, marginBottom: 16, borderWidth: 1, borderColor: "#d0f0ef" },
  miniCardName:      { fontSize: 14, fontWeight: "700", color: "#101720", marginBottom: 2 },
  miniCardMeta:      { fontSize: 11, color: "#6b7280", fontWeight: "500" },
  changeLink:        { fontSize: 13, fontWeight: "700", color: "#0cadab" },

  // Reason list
  reasonTitle:       { fontSize: 15, fontWeight: "700", color: "#101720", marginBottom: 14, letterSpacing: -0.2 },
  reasonRow:         { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: "#fff", borderRadius: 14, marginBottom: 8, borderWidth: 1.5, borderColor: "#eef0f3" },
  reasonRowOn:       { borderColor: "#8b5cf6", backgroundColor: "#faf5ff" },
  reasonRadio:       { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#d1d5db", justifyContent: "center", alignItems: "center" },
  reasonRadioOn:     { borderColor: "#8b5cf6" },
  reasonRadioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: "#8b5cf6" },
  reasonText:        { fontSize: 14, fontWeight: "600", color: "#374151", flex: 1 },
  reasonTextOn:      { color: "#8b5cf6", fontWeight: "700" },
  customWrap:        { marginTop: 4, marginBottom: 8 },
  customLabel:       { fontSize: 12, fontWeight: "700", color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  customInput:       { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: "#e5e7eb", fontSize: 14, color: "#101720", minHeight: 100 },

  // Confirm
  confirmCard:       { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#eef0f3" },
  confirmSectionLabel:{ fontSize: 10, fontWeight: "700", color: "#9ca3af", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 },
  confirmRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confirmLabel:      { fontSize: 13, color: "#8696a0", fontWeight: "600" },
  confirmValue:      { fontSize: 13, fontWeight: "700", color: "#101720", maxWidth: "55%", textAlign: "right" },
  rowDivider:        { height: 1, backgroundColor: "#f3f4f6", marginVertical: 10 },

  timelineCard:      { backgroundColor: "#faf5ff", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#ddd6fe" },
  timelineCardTitle: { fontSize: 13, fontWeight: "700", color: "#8b5cf6", marginBottom: 10 },
  timelineCardText:  { fontSize: 13, color: "#374151", fontWeight: "500" },

  errorRow:          { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#fecaca" },
  errorText:         { flex: 1, fontSize: 13, color: "#dc2626", fontWeight: "600" },

  // Sticky bar
  stickyBar:         { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 28 : 16, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  nextBtn:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#101720", borderRadius: 18, paddingVertical: 17 },
  nextBtnOff:        { opacity: 0.35 },
  nextBtnText:       { fontSize: 16, fontWeight: "800", color: "#fff" },

  // Empty
  empty:             { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyIcon:         { width: 86, height: 86, borderRadius: 28, backgroundColor: "#f0fafa", justifyContent: "center", alignItems: "center", marginBottom: 18, borderWidth: 1, borderColor: "#d0f0ef" },
  emptyTitle:        { fontSize: 20, fontWeight: "800", color: "#101720", marginBottom: 8 },
  emptySub:          { fontSize: 13, color: "#8696a0", textAlign: "center", lineHeight: 20 },
});

// Success view styles
const sv = StyleSheet.create({
  root:            { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 40 },
  iconWrap:        { marginBottom: 24 },
  iconCircle:      { width: 96, height: 96, borderRadius: 32, justifyContent: "center", alignItems: "center" },
  title:           { fontSize: 26, fontWeight: "800", color: "#101720", letterSpacing: -0.5, marginBottom: 12, textAlign: "center" },
  sub:             { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22, fontWeight: "500", marginBottom: 28 },

  timeline:        { width: "100%", marginBottom: 20 },
  timelineItem:    { flexDirection: "row", gap: 14, marginBottom: 4 },
  timelineLeft:    { alignItems: "center", width: 20 },
  timelineDot:     { width: 20, height: 20, borderRadius: 10, backgroundColor: "#e5e7eb", justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "#d1d5db" },
  timelineDotDone: { backgroundColor: "#8b5cf6", borderColor: "#8b5cf6" },
  timelineLine:    { flex: 1, width: 2, backgroundColor: "#f3f4f6", marginVertical: 2 },
  timelineRight:   { flex: 1, paddingBottom: 16 },
  timelineLabel:   { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 2 },
  timelineSub:     { fontSize: 11, color: "#9ca3af", fontWeight: "500" },

  noteCard:        { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#f0fafa", borderRadius: 14, padding: 14, width: "100%", marginBottom: 28, borderWidth: 1, borderColor: "#d0f0ef" },
  noteText:        { flex: 1, fontSize: 12, color: "#374151", lineHeight: 18, fontWeight: "500" },

  doneBtn:         { backgroundColor: "#101720", borderRadius: 18, paddingVertical: 17, paddingHorizontal: 40, width: "100%", alignItems: "center" },
  doneBtnText:     { fontSize: 16, fontWeight: "800", color: "#fff" },
});