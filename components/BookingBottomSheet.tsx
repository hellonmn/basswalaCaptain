/**
 * BookingBottomSheet.tsx
 *
 * Unified DJ booking sheet with your existing Razorpay Custom UI services.
 *
 * Uses:
 *   - RazorpayCustomUI   from ../services/razorpay-customui.service
 *   - RAZORPAY_CONFIG    from ../services/razorpay.config
 *   - apiService         from ../services/api
 *
 * Flow:
 *   1. Event Details  — fill event info, see hours / booking fee
 *   2. Review         — confirm details before paying
 *   3. Payment        — UPI Intent / UPI Collect / Card (custom UI)
 *   4. Processing     — spinner, back button blocked
 *   5. Success        — booking confirmed with payment receipt
 *
 * Back confirmation alert fires on Review and Payment steps.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import LottieView from "lottie-react-native";
import { useAuth } from "../context/AuthContext";
import { RAZORPAY_CONFIG } from "../services/razorpay.config";
import {
  RazorpayCustomUI,
} from "../services/razorpay-customui.service";
import { apiService } from "../services/api";

const { height, width } = Dimensions.get("window");

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface Equipment {
  id: string;
  name: string;
  category: string;
  price: number;
  deposit?: number;
  pickupAddress?: string;
  accentColor?: string;
  minimumHours?: number;
  [key: string]: any;
}

export interface RentalReceipt {
  bookingId?: string | number;
  djName: string;
  hours: number;
  totalAmount: number;
  bookingAmount: number;
  eventDate: string;
  eventType: string;
  paymentId?: string;
}

interface Props {
  visible: boolean;
  equipment: Equipment | null;
  days: number;
  onClose: () => void;
  onBooked: (receipt: RentalReceipt) => void;
  onViewBookings: () => void;
}

// ─── Internal types ────────────────────────────────────────────────────────────

type Step      = "details" | "review" | "payment" | "processing" | "success";
type PayMethod = "upi_collect" | "cash";

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPES = ["Wedding","Birthday","Corporate","Club Night","House Party","College Fest","Other"];
const PLATFORM_FEE = 499; // ₹ — replace with dynamic fetch from your settings endpoint

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const toISO = (s: string): string => {
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {}
  return new Date().toISOString().split("T")[0];
};

const calcEndTime = (start: string, hrs: number): string => {
  try {
    const [h, m] = start.split(":").map(Number);
    const e = new Date(); e.setHours(h + hrs, m, 0);
    return `${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`;
  } catch { return "22:00"; }
};

const luhn = (n: string): boolean => {
  let s = 0, alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = parseInt(n[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    s += d; alt = !alt;
  }
  return s % 10 === 0;
};

const cardBrand = (n: string): string => {
  if (/^4/.test(n))         return "Visa";
  if (/^5[1-5]/.test(n))    return "Mastercard";
  if (/^3[47]/.test(n))     return "Amex";
  if (/^6(0|5|22)/.test(n)) return "RuPay";
  return "";
};


// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

function Skeleton({ w, h, radius = 10, style }: {
  w: number | string; h: number; radius?: number; style?: any;
}) {
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Animated.View
      style={[{ width: w as any, height: h, borderRadius: radius, backgroundColor: "#e5e7eb", opacity }, style]}
    />
  );
}

// ─── Skeleton layouts for specific screens ────────────────────────────────────

/** Shown while Razorpay order is being created (payment step) */
function PaymentSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
      {/* Method tabs skeleton — 2 tabs */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20, backgroundColor: "#f4f8ff", borderRadius: 18, padding: 4 }}>
        <Skeleton w={(width - 40 - 12) / 2} h={50} radius={14} />
        <Skeleton w={(width - 40 - 12) / 2} h={50} radius={14} />
      </View>
      {/* UPI ID label */}
      <Skeleton w={100} h={13} radius={6} style={{ marginBottom: 12 }} />
      {/* UPI input field */}
      <Skeleton w="100%" h={52} radius={14} style={{ marginBottom: 12 }} />
      {/* App chips row */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1,2,3,4].map(i => <Skeleton key={i} w={64} h={34} radius={10} />)}
      </View>
    </View>
  );
}

/** Shown while UPI app list is loading */
function UPIAppsSkeleton() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
      {[1,2,3,4,5,6].map(i => (
        <View key={i} style={{ width: (width - 40 - 20) / 3, alignItems: "center", gap: 8, padding: 12, borderRadius: 16, backgroundColor: "#f9fafb", borderWidth: 1.5, borderColor: "#e5e7eb" }}>
          <Skeleton w={44} h={44} radius={12} />
          <Skeleton w={46} h={10} radius={5} />
        </View>
      ))}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingBottomSheet({
  visible, equipment, days, onClose, onBooked, onViewBookings,
}: Props) {

  // ─ Auth (for contact/email passed to Razorpay) ─
  const { user } = useAuth();
  const userContact = user?.phone ?? "";
  const userEmail   = user?.email ?? "";

  // ─ Lottie ref for success animation ─
  const lottieRef = useRef<LottieView>(null);

  // ─ Animation ─
  const translateY = useRef(new Animated.Value(height)).current;
  const overlayOp  = useRef(new Animated.Value(0)).current;

  // ─ Step state ─
  const [step,         setStep]         = useState<Step>("details");
  const [error,        setError]        = useState("");
  const [processLabel, setProcessLabel] = useState("");

  // ─ Booking form ─
  const [eventType,       setEventType]       = useState("Wedding");
  const [eventDate,       setEventDate]       = useState(fmtDate(new Date()));
  const [startTime,       setStartTime]       = useState("18:00");
  const [guestCount,      setGuestCount]      = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [hours,           setHours]           = useState(days);
  const minHours = equipment?.minimumHours ?? 2;

  // ─ Payment state ─
  const [payMethod,       setPayMethod]       = useState<PayMethod>("upi_collect");
  const [upiCollectId,    setUpiCollectId]    = useState("");
  // UPI collect polling
  const [collectStatus,    setCollectStatus]    = useState<"idle"|"waiting"|"approved"|"failed">("idle");

  // ─ Payment receipt ─
  const [paidPaymentId,    setPaidPaymentId]    = useState("");
  const [razorpayOrderId,  setRazorpayOrderId]  = useState("");
  const [bookingFee]    = useState(PLATFORM_FEE);
  const [orderLoading, setOrderLoading] = useState(false);

  // Sync hours when prop changes
  useEffect(() => { setHours(Math.max(days, minHours)); }, [days, minHours]);

  // ─── Sheet animation ───────────────────────────────────────────────────────

  const openSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 72, friction: 13, useNativeDriver: true }),
      Animated.timing(overlayOp, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const closeSheet = useCallback((cb?: () => void) => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(translateY, { toValue: height, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOp, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => cb?.());
  }, []);

  useEffect(() => {
    if (visible) {
      // Reset all state on open
      setStep("details"); setError("");
      setEventType("Wedding"); setEventDate(fmtDate(new Date()));
      setStartTime("18:00"); setGuestCount(""); setSpecialRequests("");
      setPayMethod("upi_collect");
      setUpiCollectId(""); setCollectStatus("idle");
      setPaidPaymentId(""); setRazorpayOrderId(""); setOrderLoading(false);
      openSheet();
    } else {
      closeSheet();
    }
  }, [visible]);

  // ─── Back handler ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack(); return true;
    });
    return () => sub.remove();
  }, [visible, step]);

  const handleBack = () => {
    if (step === "success")    { closeSheet(onClose); return; }
    if (step === "processing") { return; }  // block back during processing

    if (step === "payment" || step === "review") {
      Alert.alert(
        "Cancel Booking?",
        step === "payment"
          ? "Going back will cancel the payment. Your booking won't be confirmed."
          : "Your booking details will be lost.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Go Back",
            style: "destructive",
            onPress: () => setStep(step === "payment" ? "review" : "details"),
          },
        ]
      );
      return;
    }
    closeSheet(onClose);
  };

  // Play success lottie when step becomes "success"
  useEffect(() => {
    if (step === "success") {
      // Small delay so the sheet has finished animating in
      const t = setTimeout(() => lottieRef.current?.play(), 300);
      return () => clearTimeout(t);
    }
  }, [step]);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const pricePerHour       = equipment?.price ?? 0;
  const totalServiceAmount = pricePerHour * hours;
  const et                 = calcEndTime(startTime, hours);
  const isoDate            = toISO(eventDate);

  // ─── Step 2 → Step 3: Show payment screen immediately, create order in background

  const handleGoToPayment = async () => {
    if (!equipment) return;
    setError("");
    setRazorpayOrderId(""); // clear any stale order
    setStep("payment");     // navigate immediately — user sees the payment screen right away
    setOrderLoading(true);
    try {
      const res = await apiService.createPaymentOrder(bookingFee);
      // Handle all common backend response shapes for orderId
      const orderId: string =
        res?.data?.orderId  ??
        res?.data?.order_id ??
        res?.data?.id       ??
        res?.orderId        ??
        res?.order_id       ??
        res?.id             ?? "";
      if (!orderId) {
        console.error("[Payment] createPaymentOrder full response:", JSON.stringify(res));
        throw new Error("No order ID received. Check /payments/create-order endpoint.");
      }
      setRazorpayOrderId(orderId);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Could not create payment order.";
      setError(msg);
      // Stay on payment screen so user sees the error and can go back or retry
    } finally {
      setOrderLoading(false);
    }
  };

  // ─── Finish booking after a confirmed paymentId ──────────────────────────

  const finaliseBooking = async (paymentId: string, signature = "") => {
    if (!equipment) return;
    setStep("processing");
    setProcessLabel("Verifying payment…");
    try {
      if (signature) {
        await apiService.verifyPayment({ orderId: razorpayOrderId, paymentId, signature });
      }
      setProcessLabel("Creating your booking…");
      const rentalRes = await apiService.createRental({
        equipmentId:     equipment.id,
        startDate:       isoDate,
        endDate:         isoDate,
        razorpayOrderId,
        paymentId,
        paymentMethod:   payMethod,
        eventType,
        startTime,
        endTime:         et,
        guestCount:      guestCount ? parseInt(guestCount) : undefined,
        specialRequests: specialRequests.trim() || undefined,
        basePrice:       totalServiceAmount,
        latitude:        26.9124,
        longitude:       75.7873,
      });
      setPaidPaymentId(paymentId);
      const bookingId = rentalRes?.rental?.id ?? rentalRes?.booking?.id ?? rentalRes?.id;
      setStep("success");
      onBooked({ bookingId, djName: equipment.name, hours, totalAmount: totalServiceAmount, bookingAmount: bookingFee, eventDate: isoDate, eventType, paymentId });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Booking creation failed.");
      setStep("payment");
    }
  };

  // ─── Step 3: Submit ───────────────────────────────────────────────────────

  const handleSubmitPayment = async () => {
    if (!equipment) return;
    setError("");

    // ── "Pay at Venue" — no online payment, just create booking ──────────
    if (payMethod === "cash") {
      setStep("processing");
      setProcessLabel("Confirming your booking…");
      try {
        const rentalRes = await apiService.createRental({
          equipmentId:     equipment.id,
          startDate:       isoDate,
          endDate:         isoDate,
          paymentMethod:   "cash",
          eventType,
          startTime,
          endTime:         et,
          guestCount:      guestCount ? parseInt(guestCount) : undefined,
          specialRequests: specialRequests.trim() || undefined,
          basePrice:       totalServiceAmount,
          latitude:        26.9124,
          longitude:       75.7873,
        });
        setPaidPaymentId("CASH");
        const bookingId = rentalRes?.rental?.id ?? rentalRes?.booking?.id ?? rentalRes?.id;
        setStep("success");
        onBooked({ bookingId, djName: equipment.name, hours, totalAmount: totalServiceAmount, bookingAmount: 0, eventDate: isoDate, eventType, paymentId: "CASH" });
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Booking failed.");
        setStep("payment");
      }
      return;
    }

    // ── UPI Collect — uses RazorpayCustomUI SDK (collect flow = no screen redirect)
    //    The SDK sends a silent collect request to the user's VPA.
    //    User opens their UPI app, approves, and the SDK resolves here.
    if (!razorpayOrderId) {
      setError("Payment order not ready. Please wait and try again."); return;
    }
    if (!upiCollectId.trim() || !upiCollectId.includes("@")) {
      setError("Enter a valid UPI ID (e.g. name@upi)"); return;
    }

    setCollectStatus("waiting");
    setStep("processing");
    setProcessLabel("Sending collect request to your UPI app…");

    try {
      // payViaUPICollect uses SDK.open() with flow=collect — no Razorpay screen opens.
      // The user approves silently inside their own UPI app (GPay / PhonePe etc).
      // SDK blocks here until approved / failed / timeout.
      const result = await RazorpayCustomUI.payViaUPICollect({
        orderId: razorpayOrderId,
        amount:  bookingFee,        // service expects ₹ — SDK converts to paise internally
        vpa:     upiCollectId.trim(),
        contact: userContact,
        email:   userEmail,
      });

      if (result.dismissed) {
        setCollectStatus("failed");
        setError("Payment was cancelled. Try again.");
        setStep("payment");
        return;
      }
      if (!result.success) {
        setCollectStatus("failed");
        setError(result.error || "UPI payment failed. Check your UPI app and try again.");
        setStep("payment");
        return;
      }

      // SDK returned success — verify and create booking
      setCollectStatus("approved");
      await finaliseBooking(result.paymentId!, result.signature ?? "");

    } catch (err: any) {
      setCollectStatus("failed");
      setError(err?.response?.data?.message || err?.message || "UPI payment failed. Try again.");
      setStep("payment");
    }
  };

  if (!equipment) return null;

  // ─── Step dot progress ────────────────────────────────────────────────────

  const STEP_ORDER: Step[] = ["details", "review", "payment"];
  const stepIdx = STEP_ORDER.indexOf(step);


  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleBack}>
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        {/* Overlay */}
        <Animated.View style={[s.overlay, { opacity: overlayOp }]}>
          <TouchableOpacity
            style={{ flex: 1 }} activeOpacity={1}
            onPress={step !== "processing" ? handleBack : undefined}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>

          <View style={s.handleZone}><View style={s.handle} /></View>

          {/* ─── Header ─── */}
          <View style={s.header}>
            {step !== "success" && step !== "processing" && (
              <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={20} color="#101720" />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>
                {step === "details"    ? "Book DJ"
                : step === "review"    ? "Review Booking"
                : step === "payment"   ? "Payment"
                : step === "processing"? "Processing…"
                :                        "Booking Confirmed! 🎉"}
              </Text>
              <Text style={s.headerSub} numberOfLines={1}>
                {step === "details"    ? equipment.name
                : step === "review"    ? "Confirm before paying"
                : step === "payment"   ? `Pay ₹${bookingFee} · ${RAZORPAY_CONFIG.NAME}`
                : step === "processing"? processLabel
                :                        "Your event is all set!"}
              </Text>
            </View>
            {stepIdx >= 0 && (
              <View style={s.stepDots}>
                {STEP_ORDER.map((_, i) => (
                  <View key={i} style={[
                    s.stepDot,
                    i === stepIdx && s.stepDotActive,
                    i < stepIdx  && s.stepDotDone,
                  ]} />
                ))}
              </View>
            )}
          </View>

          {/* ══════════════════════════════════════
              STEP 1 — EVENT DETAILS
          ══════════════════════════════════════ */}
          {step === "details" && (
            <ScrollView style={s.body} showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

              {/* Price bar */}
              <View style={s.priceSummary}>
                <View>
                  <Text style={s.psLabel}>RATE</Text>
                  <Text style={s.psValue}>₹{pricePerHour.toLocaleString()}<Text style={s.psUnit}>/hr</Text></Text>
                </View>
                <View style={s.psDivider} />
                <View style={s.hourSel}>
                  <Text style={s.psLabel}>HOURS</Text>
                  <View style={s.hourRow}>
                    <TouchableOpacity
                      style={[s.hourBtn, hours <= minHours && s.hourBtnOff]}
                      onPress={() => setHours(h => Math.max(minHours, h - 1))}
                      disabled={hours <= minHours} activeOpacity={0.8}>
                      <Ionicons name="remove" size={16} color={hours <= minHours ? "#c4c9d0" : "#fff"} />
                    </TouchableOpacity>
                    <Text style={s.hourNum}>{hours}</Text>
                    <TouchableOpacity style={s.hourBtn} onPress={() => setHours(h => h + 1)} activeOpacity={0.8}>
                      <Ionicons name="add" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={s.psDivider} />
                <View>
                  <Text style={s.psLabel}>SERVICE TOTAL</Text>
                  <Text style={[s.psValue, { color: "#0cadab" }]}>₹{totalServiceAmount.toLocaleString()}</Text>
                </View>
              </View>

              {/* Booking fee callout */}
              <View style={s.feeCallout}>
                <Ionicons name="wallet-outline" size={18} color="#0cadab" />
                <View style={{ flex: 1 }}>
                  <Text style={s.feeCalloutTitle}>Booking Fee: ₹{bookingFee}</Text>
                  <Text style={s.feeCalloutSub}>Pay online now to confirm your slot · DJ service charges settled separately</Text>
                </View>
              </View>

              {/* Event type chips */}
              <Text style={s.fieldLabel}>Event Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity key={t} style={[s.chip, eventType === t && s.chipOn]}
                    onPress={() => setEventType(t)} activeOpacity={0.8}>
                    <Text style={[s.chipText, eventType === t && s.chipTextOn]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.fieldLabel}>Event Date</Text>
              <View style={s.inputWrap}>
                <Ionicons name="calendar-outline" size={18} color="#8696a0" style={s.inputIcon} />
                <TextInput style={s.input} value={eventDate} onChangeText={setEventDate}
                  placeholder="e.g. 15 Apr 2025" placeholderTextColor="#c4c9d0" />
              </View>

              <Text style={s.fieldLabel}>Start Time</Text>
              <View style={s.inputWrap}>
                <Ionicons name="time-outline" size={18} color="#8696a0" style={s.inputIcon} />
                <TextInput style={s.input} value={startTime} onChangeText={setStartTime}
                  placeholder="HH:MM" placeholderTextColor="#c4c9d0" keyboardType="numbers-and-punctuation" />
              </View>
              <Text style={s.fieldHint}>End: {et} · {hours} hr{hours > 1 ? "s" : ""}</Text>

              <Text style={s.fieldLabel}>Expected Guests <Text style={s.optional}>(optional)</Text></Text>
              <View style={s.inputWrap}>
                <Ionicons name="people-outline" size={18} color="#8696a0" style={s.inputIcon} />
                <TextInput style={s.input} value={guestCount} onChangeText={setGuestCount}
                  placeholder="e.g. 100" placeholderTextColor="#c4c9d0" keyboardType="number-pad" />
              </View>

              <Text style={s.fieldLabel}>Special Requests <Text style={s.optional}>(optional)</Text></Text>
              <View style={[s.inputWrap, { alignItems: "flex-start", paddingTop: 12 }]}>
                <Ionicons name="chatbubble-outline" size={18} color="#8696a0" style={[s.inputIcon, { marginTop: 2 }]} />
                <TextInput style={[s.input, { height: 76, textAlignVertical: "top" }]}
                  value={specialRequests} onChangeText={setSpecialRequests}
                  placeholder="Songs, setup needs…" placeholderTextColor="#c4c9d0" multiline />
              </View>

              <View style={s.infoNote}>
                <Ionicons name="car-outline" size={16} color="#0cadab" />
                <Text style={s.infoNoteText}>Our team handles all DJ equipment delivery and setup at your venue.</Text>
              </View>

              <TouchableOpacity style={s.ctaBtn}
                onPress={() => { Keyboard.dismiss(); setStep("review"); }} activeOpacity={0.88}>
                <Text style={s.ctaBtnText}>Continue to Review</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ══════════════════════════════════════
              STEP 2 — REVIEW
          ══════════════════════════════════════ */}
          {step === "review" && (
            <ScrollView style={s.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

              {/* DJ card */}
              <View style={s.reviewDJCard}>
                <View style={s.djAvatar}><Text style={s.djAvatarText}>{equipment.name?.[0] ?? "D"}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.djName}>{equipment.name}</Text>
                  <Text style={s.djCat}>{equipment.category}</Text>
                </View>
                <View>
                  <Text style={s.djRate}>₹{pricePerHour.toLocaleString()}</Text>
                  <Text style={s.djRateUnit}>/hr</Text>
                </View>
              </View>

              {/* Details */}
              <View style={s.detailCard}>
                <Text style={s.detailCardTitle}>Booking Details</Text>
                {[
                  { icon: "bookmark-outline",  label: "Event",    value: eventType },
                  { icon: "calendar-outline",  label: "Date",     value: eventDate },
                  { icon: "time-outline",      label: "Time",     value: `${startTime} – ${et}` },
                  { icon: "hourglass-outline", label: "Duration", value: `${hours} hr${hours > 1 ? "s" : ""}` },
                  ...(guestCount ? [{ icon: "people-outline",     label: "Guests",   value: guestCount }] : []),
                  ...(specialRequests.trim() ? [{ icon: "chatbubble-outline", label: "Notes", value: specialRequests.trim() }] : []),
                ].map((row, i, arr) => (
                  <View key={row.label}>
                    <View style={s.detailRow}>
                      <View style={s.detailIconBox}>
                        <Ionicons name={row.icon as any} size={14} color="#0cadab" />
                      </View>
                      <Text style={s.detailLabel}>{row.label}</Text>
                      <Text style={s.detailValue} numberOfLines={2}>{row.value}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={s.divider} />}
                  </View>
                ))}
              </View>

              {/* Service price (info only) */}
              <LinearGradient colors={["#101720","#1e2d3d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.priceCard}>
                <Text style={s.priceCardLabel}>SERVICE FEE (Settled Offline with Team)</Text>
                <View style={s.priceRow}>
                  <Text style={s.priceMeta}>₹{pricePerHour.toLocaleString()} × {hours} hrs</Text>
                  <Text style={s.priceTotal}>₹{totalServiceAmount.toLocaleString()}</Text>
                </View>
              </LinearGradient>

              {/* Pay now box */}
              <View style={s.payNowBox}>
                <View style={{ flex: 1 }}>
                  <Text style={s.payNowTitle}>You Pay Now</Text>
                  <Text style={s.payNowSub}>Booking confirmation fee · Refundable if cancelled 48h before</Text>
                </View>
                <Text style={s.payNowAmt}>₹{bookingFee}</Text>
              </View>

              {error ? (
                <View style={s.errorCard}>
                  <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[s.ctaBtn, { backgroundColor: "#0cadab" }]}
                onPress={handleGoToPayment} activeOpacity={0.88}>
                <Ionicons name="card-outline" size={20} color="#fff" />
                <Text style={s.ctaBtnText}>Proceed to Pay ₹{bookingFee}</Text>
              </TouchableOpacity>

              <Text style={s.termsNote}>Secured by Razorpay · {RAZORPAY_CONFIG.NAME}</Text>
            </ScrollView>
          )}

          {/* ══════════════════════════════════════
              STEP 3 — PAYMENT (Custom UI)
          ══════════════════════════════════════ */}
          {step === "payment" && (
            <>
              {/* Scrollable body */}
              <ScrollView
                style={s.body}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 120 }}
              >
                {/* Amount + order status header */}
                <View style={s.payAmountHeader}>
                  <View style={s.razorpayBadge}>
                    <Text style={s.razorpayBadgeText}>🔒 Secured by Razorpay</Text>
                  </View>
                  <Text style={s.payAmountBig}>₹{bookingFee}</Text>
                  <Text style={s.payAmountSub}>Booking Confirmation Fee</Text>
                  {/* Order status pill */}
                  {orderLoading ? (
                    <View style={s.orderLoadingRow}>
                      <ActivityIndicator size="small" color="#0cadab" />
                      <Text style={s.orderLoadingText}>Preparing your order…</Text>
                    </View>
                  ) : !razorpayOrderId && error ? (
                    <TouchableOpacity style={s.retryOrderBtn} onPress={handleGoToPayment}>
                      <Ionicons name="refresh-outline" size={13} color="#dc2626" />
                      <Text style={s.retryOrderText}>Retry</Text>
                    </TouchableOpacity>
                  ) : razorpayOrderId ? (
                    <View style={s.orderReadyRow}>
                      <Ionicons name="checkmark-circle" size={13} color="#22c55e" />
                      <Text style={s.orderReadyText}>Order ready</Text>
                    </View>
                  ) : null}
                </View>

                {/* ── When order loading: show skeleton, else show real UI ── */}
                {orderLoading ? (
                  <PaymentSkeleton />
                ) : (
                  <>
                    {/* ── 2 payment method tabs — UPI Collect + Pay at Venue ── */}
                    <View style={s.methodTabs}>
                      {([
                        { id: "upi_collect", label: "Pay via UPI",     icon: "phone-portrait-outline" },
                        { id: "cash",        label: "Pay at Venue",    icon: "cash-outline" },
                      ] as { id: PayMethod; label: string; icon: string }[]).map(m => (
                        <TouchableOpacity key={m.id}
                          style={[s.methodTab, payMethod === m.id && s.methodTabOn]}
                          onPress={() => { setPayMethod(m.id); setError(""); }}
                          activeOpacity={0.8}>
                          <Ionicons name={m.icon as any} size={18} color={payMethod === m.id ? "#0cadab" : "#8696a0"} />
                          <Text style={[s.methodTabText, payMethod === m.id && s.methodTabTextOn]}>{m.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* ─── UPI Collect — backend API, no SDK redirect ─── */}
                    {payMethod === "upi_collect" && (
                      <View style={s.methodBody}>
                        <Text style={s.methodTitle}>Pay via UPI</Text>
                        <Text style={s.methodSub}>Enter your UPI ID — we'll send a collect request directly to your app</Text>

                        <View style={[s.inputWrap, { marginHorizontal: 0, marginTop: 16 }]}>
                          <Ionicons name="at-outline" size={18} color="#8696a0" style={s.inputIcon} />
                          <TextInput
                            style={s.input}
                            value={upiCollectId}
                            onChangeText={v => { setUpiCollectId(v); setError(""); }}
                            placeholder="yourname@upi"
                            placeholderTextColor="#c4c9d0"
                            autoCapitalize="none"
                            keyboardType="email-address"
                          />
                          {upiCollectId.includes("@") && (
                            <Ionicons name="checkmark-circle" size={18} color="#22c55e" style={{ marginLeft: 6 }} />
                          )}
                        </View>

                        {/* Supported apps */}
                        <View style={s.upiExamples}>
                          {["GPay","PhonePe","Paytm","BHIM"].map(a => (
                            <View key={a} style={s.upiExampleChip}>
                              <Text style={s.upiExampleText}>{a}</Text>
                            </View>
                          ))}
                        </View>

                        <View style={s.upiHowBox}>
                          <Ionicons name="information-circle-outline" size={15} color="#0cadab" />
                          <Text style={s.upiHowText}>
                            After tapping Pay, open your UPI app and approve the ₹{bookingFee} collect request. You'll stay in this app throughout.
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* ─── Pay at Venue — no online payment ─── */}
                    {payMethod === "cash" && (
                      <View style={s.methodBody}>
                        <Text style={s.methodTitle}>Pay at Venue</Text>
                        <Text style={s.methodSub}>Confirm your slot now — pay the booking fee in cash at the event</Text>

                        <View style={s.cashInfoCard}>
                          <View style={s.cashInfoRow}>
                            <View style={s.cashInfoIcon}><Ionicons name="checkmark" size={14} color="#16a34a" /></View>
                            <Text style={s.cashInfoText}>Slot held for 24 hours after confirmation</Text>
                          </View>
                          <View style={s.cashInfoRow}>
                            <View style={s.cashInfoIcon}><Ionicons name="checkmark" size={14} color="#16a34a" /></View>
                            <Text style={s.cashInfoText}>Pay ₹{bookingFee} booking fee at the venue on event day</Text>
                          </View>
                          <View style={s.cashInfoRow}>
                            <View style={s.cashInfoIcon}><Ionicons name="checkmark" size={14} color="#16a34a" /></View>
                            <Text style={s.cashInfoText}>Full DJ service charges settled separately with our team</Text>
                          </View>
                        </View>

                        <View style={s.cashWarning}>
                          <Ionicons name="time-outline" size={14} color="#d97706" />
                          <Text style={s.cashWarningText}>Cash bookings are subject to availability. Online payment guarantees your slot.</Text>
                        </View>
                      </View>
                    )}

                    {/* Error */}
                    {!!error && (
                      <View style={[s.errorCard, { marginHorizontal: 20 }]}>
                        <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                        <Text style={s.errorText}>{error}</Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              {/* ── Sticky Pay button ── */}
              <View style={s.paymentStickyBar}>
                <TouchableOpacity
                  style={[s.paymentStickyBtn, (orderLoading || !razorpayOrderId) && { opacity: 0.4 }]}
                  onPress={handleSubmitPayment}
                  disabled={orderLoading || !razorpayOrderId}
                  activeOpacity={0.88}>
                  {orderLoading ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={s.paymentStickyBtnText}>Preparing order…</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="lock-closed-outline" size={18} color="#fff" />
                      <Text style={s.paymentStickyBtnText}>{payMethod === "cash" ? "Confirm Booking" : `Pay ₹${bookingFee} via UPI`}</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={s.termsNote}>256-bit SSL · Powered by Razorpay</Text>
              </View>
            </>
          )}

                    {/* ══════════════════════════════════════
              STEP 4 — PROCESSING (fullscreen spinner)
          ══════════════════════════════════════ */}
          {step === "processing" && (
            <View style={s.processingScreen}>
              <LinearGradient colors={["#f0fafa","#e6f7f7"]} style={s.processingCircle}>
                <ActivityIndicator size="large" color="#0cadab" />
              </LinearGradient>
              <Text style={s.processingTitle}>
                {collectStatus === "waiting"
                  ? "Waiting for UPI Approval"
                  : processLabel || "Processing…"}
              </Text>
              {collectStatus === "waiting" ? (
                <>
                  <Text style={s.processingSub}>Open your UPI app and approve</Text>
                  <Text style={s.processingSub}>the ₹{bookingFee} collect request</Text>
                  <View style={s.upiWaitingApps}>
                    {["GPay","PhonePe","Paytm","BHIM"].map(a => (
                      <View key={a} style={s.upiWaitingChip}>
                        <Text style={s.upiWaitingChipText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.processingSub}>Checking every few seconds…</Text>
                </>
              ) : (
                <Text style={s.processingSub}>Please wait · Do not close the app</Text>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════
              STEP 5 — SUCCESS
          ══════════════════════════════════════ */}
          {step === "success" && (
            <>
              {/* Scrollable receipt content */}
              <ScrollView
                style={s.body}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.successContent}
              >
                <LottieView
                  ref={lottieRef}
                  source={require("../assets/animations/success.json")}
                  autoPlay={false}
                  loop={false}
                  style={s.successLottie}
                />

                <Text style={s.successTitle}>Booking Confirmed!</Text>
                <Text style={s.successSub}>
                  {equipment.name} has been notified. Our team will confirm the final details shortly.
                </Text>

                <View style={s.successPayPill}>
                  <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                  <Text style={s.successPayPillText}>
                    {paidPaymentId === "CASH" ? "Cash booking confirmed" : `₹${bookingFee} paid · ${paidPaymentId.slice(-10) || "—"}`}
                  </Text>
                </View>

                <View style={s.successCard}>
                  {[
                    { label: "DJ",          value: equipment.name },
                    { label: "Event",       value: eventType },
                    { label: "Date",        value: eventDate },
                    { label: "Time",        value: `${startTime} – ${et}` },
                    { label: "Duration",    value: `${hours} hr${hours > 1 ? "s" : ""}` },
                    { label: "Service Fee", value: `₹${totalServiceAmount.toLocaleString()} (offline)` },
                    { label: "Paid Now", value: paidPaymentId === "CASH" ? "Pay at Venue" : `₹${bookingFee}`, highlight: true },
                  ].map((row, i, arr) => (
                    <View key={row.label}>
                      <View style={s.successRow}>
                        <Text style={s.successRowLabel}>{row.label}</Text>
                        <Text style={[s.successRowValue, (row as any).highlight && s.successHighlight]}>
                          {row.value}
                        </Text>
                      </View>
                      {i < arr.length - 1 && <View style={s.divider} />}
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={s.secondaryBtn} onPress={() => closeSheet(onClose)} activeOpacity={0.8}>
                  <Text style={s.secondaryBtnText}>Back to Explore</Text>
                </TouchableOpacity>

                {/* Space so content not hidden under sticky bar */}
                <View style={{ height: 96 }} />
              </ScrollView>

              {/* ── Sticky "View My Bookings" button ── */}
              <View style={s.successStickyBar}>
                <TouchableOpacity
                  style={s.successStickyBtn}
                  onPress={() => closeSheet(() => { onClose(); onViewBookings(); })}
                  activeOpacity={0.88}>
                  <Ionicons name="list-outline" size={20} color="#fff" />
                  <Text style={s.successStickyBtnText}>View My Bookings</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SHEET_H = height * 0.93;

const s = StyleSheet.create({
  overlay:              { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(16,23,32,0.5)" },
  sheet:                { position: "absolute", bottom: 0, left: 0, right: 0, height: SHEET_H, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, borderColor: "#eef0f3", overflow: "hidden" },
  handleZone:           { paddingTop: 12, paddingBottom: 4, alignItems: "center" },
  handle:               { width: 44, height: 4, borderRadius: 2, backgroundColor: "#d1d5db" },

  // Header
  header:               { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  backBtn:              { width: 36, height: 36, borderRadius: 12, backgroundColor: "#f4f8ff", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#eef0f3" },
  headerTitle:          { fontSize: 18, fontWeight: "800", color: "#101720", letterSpacing: -0.3 },
  headerSub:            { fontSize: 12, color: "#8696a0", fontWeight: "500", marginTop: 2 },
  stepDots:             { flexDirection: "row", gap: 5 },
  stepDot:              { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e5e7eb" },
  stepDotActive:        { backgroundColor: "#101720", width: 22 },
  stepDotDone:          { backgroundColor: "#22c55e" },

  body:                 { flex: 1 },

  // Price summary bar
  priceSummary:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 20, marginTop: 18, marginBottom: 16, backgroundColor: "#f4f8ff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#eef0f3" },
  psLabel:              { fontSize: 9, fontWeight: "700", color: "#8696a0", letterSpacing: 0.8, marginBottom: 5 },
  psValue:              { fontSize: 20, fontWeight: "800", color: "#101720", letterSpacing: -0.5 },
  psUnit:               { fontSize: 11, color: "#8696a0", fontWeight: "500" },
  psDivider:            { width: 1, height: 40, backgroundColor: "#e5e7eb" },
  hourSel:              { alignItems: "center" },
  hourRow:              { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  hourBtn:              { width: 30, height: 30, borderRadius: 10, backgroundColor: "#101720", justifyContent: "center", alignItems: "center" },
  hourBtnOff:           { backgroundColor: "#e5e7eb" },
  hourNum:              { fontSize: 18, fontWeight: "800", color: "#101720", minWidth: 22, textAlign: "center" },

  // Fee callout
  feeCallout:           { flexDirection: "row", alignItems: "flex-start", gap: 10, marginHorizontal: 20, marginBottom: 18, backgroundColor: "#f0fafa", borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: "#0cadab" },
  feeCalloutTitle:      { fontSize: 13, fontWeight: "700", color: "#101720", marginBottom: 2 },
  feeCalloutSub:        { fontSize: 11, color: "#6b7280", lineHeight: 16, fontWeight: "500" },

  // Fields
  fieldLabel:           { fontSize: 11, fontWeight: "700", color: "#6b7280", marginHorizontal: 20, marginBottom: 8, marginTop: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  optional:             { fontSize: 10, color: "#9ca3af", fontWeight: "400", textTransform: "none" },
  inputWrap:            { flexDirection: "row", alignItems: "center", marginHorizontal: 20, backgroundColor: "#f9fafb", borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: "#e5e7eb" },
  inputIcon:            { marginRight: 10 },
  input:                { flex: 1, fontSize: 15, color: "#101720", paddingVertical: 13 },
  fieldHint:            { fontSize: 11, color: "#0cadab", fontWeight: "600", marginHorizontal: 20, marginTop: 6 },
  chipRow:              { paddingHorizontal: 20, gap: 8 },
  chip:                 { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: "#f4f8ff", borderWidth: 1.5, borderColor: "#e5e7eb" },
  chipOn:               { backgroundColor: "#101720", borderColor: "#101720" },
  chipText:             { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextOn:           { color: "#fff" },
  infoNote:             { flexDirection: "row", gap: 10, alignItems: "flex-start", marginHorizontal: 20, marginTop: 16, backgroundColor: "#f0fafa", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#d0f0ef" },
  infoNoteText:         { flex: 1, fontSize: 12, color: "#374151", lineHeight: 18, fontWeight: "500" },
  ctaBtn:               { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#101720", borderRadius: 18, paddingVertical: 17, marginHorizontal: 20, marginTop: 20 },
  ctaBtnText:           { fontSize: 16, fontWeight: "800", color: "#fff" },

  // Review
  reviewDJCard:         { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 20, marginTop: 18, marginBottom: 14, backgroundColor: "#f9fafb", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#eef0f3" },
  djAvatar:             { width: 52, height: 52, borderRadius: 16, backgroundColor: "#101720", justifyContent: "center", alignItems: "center" },
  djAvatarText:         { color: "#fff", fontWeight: "800", fontSize: 22 },
  djName:               { fontSize: 16, fontWeight: "800", color: "#101720", marginBottom: 3 },
  djCat:                { fontSize: 12, color: "#8696a0", fontWeight: "500" },
  djRate:               { fontSize: 18, fontWeight: "800", color: "#0cadab", textAlign: "right" },
  djRateUnit:           { fontSize: 11, color: "#8696a0", textAlign: "right" },
  detailCard:           { marginHorizontal: 20, backgroundColor: "#f9fafb", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#eef0f3", marginBottom: 14 },
  detailCardTitle:      { fontSize: 10, fontWeight: "700", color: "#9ca3af", letterSpacing: 0.9, textTransform: "uppercase", marginBottom: 14 },
  detailRow:            { flexDirection: "row", alignItems: "center", gap: 10 },
  detailIconBox:        { width: 28, height: 28, borderRadius: 9, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#eef0f3" },
  detailLabel:          { fontSize: 13, color: "#8696a0", fontWeight: "600", flex: 1 },
  detailValue:          { fontSize: 13, fontWeight: "700", color: "#101720", textAlign: "right", maxWidth: width * 0.44 },
  divider:              { height: 1, backgroundColor: "#f3f4f6", marginVertical: 9 },
  priceCard:            { marginHorizontal: 20, borderRadius: 18, padding: 16, marginBottom: 12 },
  priceCardLabel:       { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.5)", letterSpacing: 1, marginBottom: 10 },
  priceRow:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceMeta:            { fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: "600" },
  priceTotal:           { fontSize: 18, fontWeight: "800", color: "#fff" },
  payNowBox:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 20, marginBottom: 16, backgroundColor: "#fffbeb", borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: "#fbbf24" },
  payNowTitle:          { fontSize: 15, fontWeight: "800", color: "#101720", marginBottom: 3 },
  payNowSub:            { fontSize: 11, color: "#6b7280", lineHeight: 16 },
  payNowAmt:            { fontSize: 28, fontWeight: "800", color: "#0cadab", letterSpacing: -1 },
  termsNote:            { fontSize: 11, color: "#9ca3af", textAlign: "center", marginHorizontal: 20, marginTop: 12, lineHeight: 16 },
  errorCard:            { flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 10, backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#fecaca" },
  errorText:            { flex: 1, fontSize: 13, color: "#dc2626", fontWeight: "600" },

  // Payment step
  payAmountHeader:      { alignItems: "center", paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", marginBottom: 4 },
  razorpayBadge:        { backgroundColor: "#f0fafa", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10, borderWidth: 1, borderColor: "#d0f0ef" },
  razorpayBadgeText:    { fontSize: 11, fontWeight: "700", color: "#0cadab" },
  payAmountBig:         { fontSize: 48, fontWeight: "800", color: "#101720", letterSpacing: -2 },
  orderLoadingRow:      { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 10, backgroundColor: "#f0fafa", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: "#d0f0ef" },
  orderLoadingText:     { fontSize: 12, color: "#0cadab", fontWeight: "600" },
  orderReadyRow:        { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: "#f0fdf4", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: "#bbf7d0" },
  orderReadyText:       { fontSize: 12, color: "#16a34a", fontWeight: "600" },
  retryOrderBtn:        { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: "#fef2f2", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: "#fecaca" },
  retryOrderText:       { fontSize: 12, color: "#dc2626", fontWeight: "700" },
  payAmountSub:         { fontSize: 13, color: "#8696a0", fontWeight: "500", marginTop: 4 },

  methodTabs:           { flexDirection: "row", marginHorizontal: 20, marginTop: 4, marginBottom: 2, backgroundColor: "#f4f8ff", borderRadius: 18, padding: 4, gap: 4 },
  methodTab:            { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 11, borderRadius: 14 },
  methodTabOn:          { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  methodTabText:        { fontSize: 11, fontWeight: "600", color: "#8696a0" },
  methodTabTextOn:      { color: "#0cadab", fontWeight: "700" },

  methodBody:           { paddingHorizontal: 20, paddingTop: 6 },
  methodTitle:          { fontSize: 16, fontWeight: "800", color: "#101720", marginBottom: 4, marginTop: 10 },
  methodSub:            { fontSize: 13, color: "#8696a0", fontWeight: "500", marginBottom: 4 },

  // UPI apps grid

  upiNoneBox:           { backgroundColor: "#f9fafb", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#e5e7eb", marginTop: 14, alignItems: "center", gap: 8 },
  upiNoneText:          { fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 19 },
  upiNoneLink:          { marginTop: 4 },
  upiNoneLinkText:      { fontSize: 13, fontWeight: "700", color: "#0cadab" },
  upiAppGrid:           { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  upiAppCard:           { width: (width - 40 - 10 * 2) / 3, alignItems: "center", padding: 12, borderRadius: 16, backgroundColor: "#f9fafb", borderWidth: 1.5, borderColor: "#e5e7eb" },
  upiAppCardOn:         { backgroundColor: "#f0fafa", borderWidth: 2 },
  upiAppIcon:           { width: 44, height: 44, borderRadius: 12, marginBottom: 6 },
  upiAppName:           { fontSize: 11, fontWeight: "600", color: "#374151", textAlign: "center" },
  upiAppCheck:          { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center" },

  // UPI collect
  upiExamples:          { flexDirection: "row", gap: 8, marginTop: 12 },
  upiExampleChip:       { backgroundColor: "#f4f8ff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#e5e7eb" },
  upiExampleText:       { fontSize: 12, fontWeight: "700", color: "#374151" },

  // Card
  cardBrand:            { fontSize: 12, fontWeight: "700", color: "#0cadab", marginLeft: 6 },

  // Processing
  processingScreen:     { flex: 1, justifyContent: "center", alignItems: "center", gap: 20 },
  processingCircle:     { width: 88, height: 88, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  processingTitle:      { fontSize: 18, fontWeight: "800", color: "#101720", textAlign: "center", paddingHorizontal: 30 },
  processingSub:        { fontSize: 13, color: "#8696a0", textAlign: "center" },

  // Success
  successContent:       { alignItems: "center", paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 },
  successLottie:        { width: 160, height: 160, marginBottom: 4 },
  successTitle:         { fontSize: 24, fontWeight: "800", color: "#101720", letterSpacing: -0.5, marginBottom: 10, textAlign: "center" },
  successSub:           { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 21, fontWeight: "500", marginBottom: 16, paddingHorizontal: 8 },
  successPayPill:       { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#f0fdf4", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 20, borderWidth: 1, borderColor: "#bbf7d0" },
  successPayPillText:   { fontSize: 12, color: "#16a34a", fontWeight: "700" },
  successCard:          { width: "100%", backgroundColor: "#f9fafb", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#eef0f3", marginBottom: 20 },
  successRow:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  successRowLabel:      { fontSize: 13, color: "#8696a0", fontWeight: "600" },
  successRowValue:      { fontSize: 13, fontWeight: "700", color: "#101720" },
  successHighlight:     { color: "#0cadab", fontWeight: "800" },

  successStickyBar:     { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 28 : 16, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  successStickyBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#101720", borderRadius: 18, paddingVertical: 17 },
  successStickyBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  secondaryBtn:         { marginTop: 12, paddingVertical: 14, width: "100%", alignItems: "center" },
  secondaryBtnText:     { fontSize: 15, color: "#8696a0", fontWeight: "600" },

  // UPI how-it-works box
  upiHowBox:            { flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 14, backgroundColor: "#f0fafa", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#d0f0ef" },
  upiHowText:           { flex: 1, fontSize: 12, color: "#374151", lineHeight: 18, fontWeight: "500" },

  // Cash option
  cashInfoCard:         { backgroundColor: "#f0fdf4", borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: "#bbf7d0", gap: 10 },
  cashInfoRow:          { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cashInfoIcon:         { width: 22, height: 22, borderRadius: 7, backgroundColor: "#dcfce7", justifyContent: "center", alignItems: "center", marginTop: 1 },
  cashInfoText:         { flex: 1, fontSize: 13, color: "#166534", fontWeight: "500", lineHeight: 19 },
  cashWarning:          { flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 12, backgroundColor: "#fffbeb", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#fde68a" },
  cashWarningText:      { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 17, fontWeight: "500" },

  // UPI waiting chips on processing screen
  upiWaitingApps:       { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 8 },
  upiWaitingChip:       { backgroundColor: "#f0fafa", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#d0f0ef" },
  upiWaitingChipText:   { fontSize: 12, fontWeight: "700", color: "#0cadab" },

  // Payment sticky footer
  paymentStickyBar:     { backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 28 : 16, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  paymentStickyBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0cadab", borderRadius: 18, paddingVertical: 17 },
  paymentStickyBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});