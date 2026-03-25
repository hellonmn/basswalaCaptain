/**
 * equipment/[id].tsx — Dynamic: loads real DJ data from backend
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, StatusBar, Share, Alert, Animated, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiService } from "../../services/api";
import BookingBottomSheet, { Equipment, RentalReceipt } from "../../components/BookingBottomSheet";

const { width } = Dimensions.get("window");
const IMG_HEIGHT = width * 1.15;

// ─── DJ → Equipment mapper ─────────────────────────────────────────────────

function mapDJToEquipment(dj: any): Equipment & {
  image: string; images: string[]; rating: number; reviews: number;
  available: boolean; vendor: string; vendorRating: number; deliveryTime: string;
  description: string; features: string[]; specifications: Record<string, string>;
  rentalTerms: string[]; trustStats: any[];
} {
  const genres = Array.isArray(dj.genres) ? dj.genres : [];
  const djImages = Array.isArray(dj.images) && dj.images.length > 0 ? dj.images :
    ["https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&q=80",
     "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80"];

  const ownerName = dj.owner ? `${dj.owner.firstName || ""} ${dj.owner.lastName || ""}`.trim() : dj.name;

  const specs: Record<string, string> = {};
  if (dj.equipment && typeof dj.equipment === "object") {
    if (dj.equipment.speakers) specs["Speakers"] = dj.equipment.speakers;
    if (dj.equipment.mixer) specs["Mixer"] = dj.equipment.mixer;
    if (dj.equipment.microphones) specs["Microphones"] = String(dj.equipment.microphones);
    if (dj.equipment.turntables !== undefined) specs["Turntables"] = dj.equipment.turntables ? "Yes" : "No";
    if (dj.equipment.lightingSystem !== undefined) specs["Lighting"] = dj.equipment.lightingSystem ? "Yes" : "No";
    if (dj.equipment.additionalEquipment?.length) {
      specs["Extras"] = dj.equipment.additionalEquipment.join(", ");
    }
  }

  const features = [
    ...genres.map((g: string) => `${g} music specialist`),
    `Minimum ${dj.minimumHours || 2} hours booking`,
    dj.equipment?.speakers ? `Sound: ${dj.equipment.speakers}` : null,
    dj.equipment?.mixer ? `Mixer: ${dj.equipment.mixer}` : null,
    dj.equipment?.lightingSystem ? "Lighting system included" : null,
    dj.locationCity ? `Based in ${dj.locationCity}` : null,
  ].filter(Boolean) as string[];

  return {
    id: String(dj.id),
    name: dj.name,
    category: genres.slice(0, 2).join(" / ") || "DJ Service",
    price: Math.round(dj.hourlyRate || 0),
    deposit: Math.round((dj.hourlyRate || 0) * 2),
    pickupAddress: [dj.locationStreet, dj.locationCity, dj.locationState].filter(Boolean).join(", ") || "Location available on booking",
    accentColor: "#0cadab",
    image: djImages[0],
    images: djImages,
    rating: parseFloat(dj.ratingAverage) || 0,
    reviews: dj.ratingCount || 0,
    available: dj.isAvailable !== false,
    vendor: ownerName || dj.name,
    vendorRating: parseFloat(dj.ratingAverage) || 0,
    deliveryTime: "Available on request",
    description: dj.description || `${dj.name} is a professional DJ specializing in ${genres.join(", ")}. Book now for your next event!`,
    features,
    specifications: Object.keys(specs).length ? specs : { Genres: genres.join(", "), "Min Hours": String(dj.minimumHours || 2), Currency: dj.currency || "INR" },
    rentalTerms: [
      `Minimum booking: ${dj.minimumHours || 2} hours`,
      "50% advance payment to confirm booking",
      "Cancellation 48hrs prior for full refund",
      "Travel charges may apply beyond 30km",
      "Equipment setup & teardown included",
      "We will handle all logistics and delivery",
    ],
    trustStats: [
      { label: "Events", value: `${dj.ratingCount || 0}+`, icon: "calendar-outline" },
      { label: "Rating", value: `${(parseFloat(dj.ratingAverage) || 0).toFixed(1)}★`, icon: "star-outline" },
      { label: "Response", value: "<2hr", icon: "flash-outline" },
      { label: "Genre", value: genres[0]?.slice(0, 6) || "DJ", icon: "musical-notes-outline" },
    ],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const StarRating = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <View style={{ flexDirection: "row", gap: 2 }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Ionicons key={s} name={s <= Math.round(rating) ? "star" : "star-outline"} size={size}
        color={s <= Math.round(rating) ? "#FFC107" : "#d1d5db"} />
    ))}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EquipmentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const djId = params.id as string;

  const [equipment, setEquipment] = useState<ReturnType<typeof mapDJToEquipment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [imgIndex, setImgIndex] = useState(0);
  // Start hours at DJ's minimumHours once loaded (updated after data fetch)
  const [hours, setHours] = useState(2);
  const [minHours, setMinHours] = useState(2);
  const [isFavorite, setIsFavorite] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerBgClr = scrollY.interpolate({ inputRange: [IMG_HEIGHT - 90, IMG_HEIGHT - 30], outputRange: ["rgba(244,248,255,0)", "rgba(244,248,255,1)"], extrapolate: "clamp" });
  const headerTitle = scrollY.interpolate({ inputRange: [IMG_HEIGHT - 80, IMG_HEIGHT - 20], outputRange: [0, 1], extrapolate: "clamp" });

  const loadDJ = useCallback(async () => {
    if (!djId) { setError("Invalid DJ ID"); setLoading(false); return; }
    try {
      const res = await apiService.getDJById(djId);
      const djData = res.data || res;
      const mapped = mapDJToEquipment(djData);
      setEquipment(mapped);
      // Set initial hours to DJ's minimum booking hours from DB
      const min = djData.minimumHours || 2;
      setMinHours(min);
      setHours(min);
    } catch (err: any) {
      console.error("Failed to load DJ:", err);
      setError("Could not load DJ details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [djId]);

  useEffect(() => { loadDJ(); }, [loadDJ]);

  const handleShare = async () => {
    if (!equipment) return;
    try {
      await Share.share({ message: `Check out ${equipment.name} – ₹${equipment.price}/hr on Basswala!` });
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const handleBook = () => {
    if (!equipment) return;
    setSheetVisible(true);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f4f8ff" }}>
        <ActivityIndicator size="large" color="#0cadab" />
        <Text style={{ color: "#8696a0", marginTop: 12, fontSize: 14 }}>Loading DJ profile...</Text>
      </View>
    );
  }

  if (error || !equipment) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f4f8ff", padding: 32 }}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#101720", marginTop: 16, textAlign: "center" }}>
          {error || "DJ not found"}
        </Text>
        <TouchableOpacity style={{ marginTop: 20, backgroundColor: "#0cadab", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }} onPress={() => router.back()}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const total = equipment.price * hours;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <View style={styles.statusBarSpacer} />

        {/* Hero Images */}
        <View style={styles.hero}>
          <View style={styles.heroCard}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onScroll={(e) => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
              scrollEventThrottle={16}>
              {equipment.images.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.heroImg} resizeMode="cover" />
              ))}
            </ScrollView>
            <View style={styles.dots}>
              {equipment.images.map((_: any, i: number) => (
                <View key={i} style={[styles.dot, i === imgIndex && styles.dotActive]} />
              ))}
            </View>
          </View>

          <View style={styles.thumbRow}>
            {equipment.images.slice(0, 4).map((uri, i) => (
              <TouchableOpacity key={i} style={[styles.thumb, i === imgIndex && styles.thumbActive]} activeOpacity={0.85}>
                <Image source={{ uri }} style={styles.thumbImg} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>

          {/* Title */}
          <View style={styles.titleBlock}>
            <View style={styles.topMeta}>
              <View style={styles.catPill}>
                <Text style={styles.catPillText}>{equipment.category.toUpperCase()}</Text>
              </View>
              {equipment.available && (
                <View style={styles.availBadge}>
                  <View style={styles.availDot} />
                  <Text style={styles.availText}>Available</Text>
                </View>
              )}
            </View>
            <Text style={styles.title}>{equipment.name}</Text>
            <View style={styles.ratingRow}>
              <StarRating rating={equipment.rating} size={15} />
              <Text style={styles.ratingNum}>{equipment.rating.toFixed(1)}</Text>
              <Text style={styles.ratingReviews}>· {equipment.reviews} reviews</Text>
            </View>
          </View>

          {/* Trust stats */}
          <View style={styles.trustBar}>
            {equipment.trustStats.map((stat: any, i: number) => (
              <View key={i} style={styles.trustItem}>
                <Ionicons name={stat.icon} size={16} color="#0cadab" />
                <Text style={styles.trustValue}>{stat.value}</Text>
                <Text style={styles.trustLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Vendor */}
          <View style={styles.vendorCard}>
            <View style={styles.vendorIconBox}>
              <Ionicons name="person-circle-outline" size={20} color="#0cadab" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vendorName}>{equipment.vendor}</Text>
              <View style={styles.vendorMeta}>
                <Ionicons name="star" size={12} color="#FFC107" />
                <Text style={styles.vendorRating}>{equipment.vendorRating.toFixed(1)}</Text>
                <Text style={styles.vendorDot}>·</Text>
                <Text style={styles.vendorDelivery}>Professional DJ</Text>
              </View>
            </View>
          </View>

          {/* Pricing + Hour Selector */}
          <View style={styles.pricingCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pricingLabel}>RATE PER HOUR</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                <Text style={styles.priceBig}>₹{equipment.price.toLocaleString()}</Text>
                <Text style={styles.priceUnit}>/hr</Text>
              </View>
              <View style={styles.depositRow}>
                <Ionicons name="time-outline" size={12} color="#8696a0" />
                <Text style={styles.depositHint}>Min. {minHours} hr{minHours > 1 ? "s" : ""} booking</Text>
              </View>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.daySel}>
              <Text style={styles.daySelLabel}>HOURS</Text>
              <View style={styles.daySelControls}>
                <TouchableOpacity
                  style={[styles.dayBtn, hours <= minHours && styles.dayBtnOff]}
                  onPress={() => setHours(h => Math.max(minHours, h - 1))}
                  activeOpacity={0.8}
                  disabled={hours <= minHours}
                >
                  <Ionicons name="remove" size={18} color={hours <= minHours ? "#c4c9d0" : "#fff"} />
                </TouchableOpacity>
                <Text style={styles.dayNum}>{hours}</Text>
                <TouchableOpacity style={styles.dayBtn} onPress={() => setHours(h => h + 1)} activeOpacity={0.8}>
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Total banner */}
          <LinearGradient colors={["#101720", "#1e2d3d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.totalBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalLabel}>BOOKING · {hours} HR{hours > 1 ? "S" : ""}</Text>
              <Text style={styles.totalAmount}>₹{total.toLocaleString()}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalRight}>
              <Text style={styles.totalSmallLabel}>RATE</Text>
              <Text style={styles.totalSmallAmt}>₹{equipment.price.toLocaleString()}/hr</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalRight}>
              <Text style={styles.totalSmallLabel}>TOTAL</Text>
              <Text style={[styles.totalSmallAmt, { fontSize: 18, fontWeight: "800", color: "#0cadab" }]}>
                ₹{total.toLocaleString()}
              </Text>
            </View>
          </LinearGradient>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.descCard}>
              <Text style={styles.descText}>{equipment.description}</Text>
            </View>
          </View>

          {/* Features */}
          {equipment.features.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Highlights</Text>
                <View style={styles.featureCountPill}>
                  <Text style={styles.featureCountText}>{equipment.features.length}</Text>
                </View>
              </View>
              <View style={styles.featuresGrid}>
                {equipment.features.map((f: string, i: number) => (
                  <View key={i} style={styles.featureChip}>
                    <View style={styles.featureIconBox}>
                      <Ionicons name="checkmark" size={13} color="#0cadab" />
                    </View>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Specifications */}
          {Object.keys(equipment.specifications).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Equipment Details</Text>
              <View style={styles.infoCard}>
                {Object.entries(equipment.specifications).map(([k, v], i, arr) => (
                  <View key={k}>
                    <View style={styles.specRow}>
                      <View style={styles.specLeft}><View style={styles.specDot} /><Text style={styles.specKey}>{k}</Text></View>
                      <Text style={styles.specVal}>{v as string}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.rowDivider} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Rental Terms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Terms</Text>
            <View style={styles.infoCard}>
              {equipment.rentalTerms.map((t: string, i: number) => (
                <View key={i}>
                  <View style={styles.termRow}>
                    <View style={styles.termIconBox}><Ionicons name="information-circle-outline" size={16} color="#0cadab" /></View>
                    <Text style={styles.termText}>{t}</Text>
                  </View>
                  {i < equipment.rentalTerms.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ))}
            </View>
          </View>

          {/* Location */}
          {equipment.pickupAddress && equipment.pickupAddress !== "Location available on booking" && (
            <LinearGradient colors={["#0cadab", "#0a9998"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promoStrip}>
              <View>
                <Text style={styles.promoTitle}>📍 Location</Text>
                <Text style={styles.promoSub}>{equipment.pickupAddress}</Text>
              </View>
            </LinearGradient>
          )}

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Floating Header */}
      <SafeAreaView edges={["top"]} style={styles.headerWrap} pointerEvents="box-none">
        <Animated.View style={[styles.headerInner, { backgroundColor: headerBgClr }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#101720" />
          </TouchableOpacity>
          <Animated.Text style={[styles.headerTitleText, { opacity: headerTitle }]} numberOfLines={1}>
            {equipment.name}
          </Animated.Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={22} color="#101720" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setIsFavorite(f => !f)} activeOpacity={0.8}>
              <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={22} color={isFavorite ? "#ef4444" : "#101720"} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>

      {/* Bottom Action Bar */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomWrap}>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.bookBtn, !equipment.available && styles.bookBtnOff]}
            onPress={handleBook} disabled={!equipment.available} activeOpacity={0.88}>
            <View>
              <Text style={styles.bookBtnLabel}>{equipment.available ? "Book Now" : "Unavailable"}</Text>
              {equipment.available && (
                <Text style={styles.bookBtnSub}>₹{total.toLocaleString()} · {hours} hr{hours > 1 ? "s" : ""}</Text>
              )}
            </View>
            {equipment.available && (
              <View style={styles.bookArrow}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Booking Sheet */}
      <BookingBottomSheet
        visible={sheetVisible}
        equipment={equipment}
        days={hours}
        onClose={() => { setSheetVisible(false); }}
        onBooked={(receipt: RentalReceipt) => { console.log("Booked:", receipt); }}
        onViewBookings={() => router.replace("/(tabs)/bookings")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f4f8ff" },
  statusBarSpacer: { height: 30 },
  hero: { paddingBottom: 0 },
  heroCard: { width, height: IMG_HEIGHT, borderRadius: 28, overflow: "hidden", borderWidth: 3, borderColor: "#fff", backgroundColor: "#e5e7eb" },
  heroImg: { width, height: IMG_HEIGHT, backgroundColor: "#e5e7eb" },
  dots: { position: "absolute", bottom: 14, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(16,23,32,0.2)" },
  dotActive: { width: 24, backgroundColor: "#101720" },
  thumbRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 12, marginBottom: 4 },
  thumb: { width: 50, height: 50, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  thumbActive: { borderColor: "#0cadab", borderWidth: 2.5 },
  thumbImg: { width: "100%", height: "100%" },
  content: { backgroundColor: "#f4f8ff", paddingTop: 4 },
  titleBlock: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  topMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  catPill: { backgroundColor: "#f0fafa", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#d0f0ef" },
  catPillText: { fontSize: 9, fontWeight: "800", color: "#0cadab", letterSpacing: 1 },
  availBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "#bbf7d0" },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  availText: { fontSize: 10, fontWeight: "700", color: "#22c55e" },
  title: { fontSize: 28, fontWeight: "800", color: "#101720", letterSpacing: -0.7, lineHeight: 34, marginBottom: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingNum: { fontSize: 15, fontWeight: "700", color: "#101720" },
  ratingReviews: { fontSize: 13, color: "#8696a0", fontWeight: "500" },
  trustBar: { flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20, marginBottom: 16, backgroundColor: "#fff", borderRadius: 18, paddingVertical: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: "#eef0f3" },
  trustItem: { alignItems: "center", gap: 3, flex: 1 },
  trustValue: { fontSize: 13, fontWeight: "800", color: "#101720" },
  trustLabel: { fontSize: 10, color: "#8696a0", fontWeight: "600" },
  vendorCard: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginBottom: 14, backgroundColor: "#fff", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#eef0f3" },
  vendorIconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#f0fafa", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#d0f0ef" },
  vendorName: { fontSize: 14, fontWeight: "700", color: "#101720", marginBottom: 3 },
  vendorMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  vendorRating: { fontSize: 12, fontWeight: "700", color: "#101720" },
  vendorDot: { color: "#c4c9d0", fontSize: 12 },
  vendorDelivery: { fontSize: 12, color: "#8696a0", fontWeight: "500" },
  pricingCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 12, backgroundColor: "#fff", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#eef0f3" },
  pricingLabel: { fontSize: 9, fontWeight: "700", color: "#8696a0", letterSpacing: 0.8, marginBottom: 5 },
  priceBig: { fontSize: 36, fontWeight: "800", color: "#101720", letterSpacing: -1 },
  priceUnit: { fontSize: 15, color: "#8696a0", fontWeight: "600" },
  depositRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  depositHint: { fontSize: 11, color: "#8696a0", fontWeight: "500" },
  pricingDivider: { width: 1, height: 52, backgroundColor: "#f0f2f5", marginHorizontal: 18 },
  daySel: { alignItems: "center", gap: 6 },
  daySelLabel: { fontSize: 9, fontWeight: "700", color: "#8696a0", letterSpacing: 0.8 },
  daySelControls: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f4f8ff", borderRadius: 16, padding: 5 },
  dayBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#101720", justifyContent: "center", alignItems: "center" },
  dayBtnOff: { backgroundColor: "#eef0f3" },
  dayNum: { fontSize: 22, fontWeight: "800", color: "#101720", minWidth: 28, textAlign: "center" },
  totalBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 24, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18 },
  totalLabel: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 0.8, marginBottom: 4 },
  totalAmount: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.8 },
  totalDivider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 16 },
  totalRight: { alignItems: "flex-end" },
  totalSmallLabel: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 0.6, marginBottom: 3 },
  totalSmallAmt: { fontSize: 15, fontWeight: "700", color: "#fff" },
  section: { paddingHorizontal: 20, marginBottom: 22 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#101720", letterSpacing: -0.4, marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  featureCountPill: { backgroundColor: "#f0fafa", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: "#d0f0ef" },
  featureCountText: { fontSize: 11, fontWeight: "800", color: "#0cadab" },
  descCard: { backgroundColor: "#fff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#eef0f3" },
  descText: { fontSize: 14, lineHeight: 24, color: "#4b6585", fontWeight: "500" },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#eef0f3", width: (width - 40 - 8) / 2 },
  featureIconBox: { width: 24, height: 24, borderRadius: 8, backgroundColor: "#f0fafa", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#d0f0ef", flexShrink: 0 },
  featureText: { fontSize: 12, fontWeight: "600", color: "#101720", flex: 1, lineHeight: 16 },
  infoCard: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#eef0f3" },
  rowDivider: { height: 1, backgroundColor: "#f4f8ff", marginHorizontal: 16 },
  specRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  specLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  specDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#0cadab" },
  specKey: { fontSize: 14, color: "#8696a0", fontWeight: "600" },
  specVal: { fontSize: 14, fontWeight: "700", color: "#101720" },
  termRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  termIconBox: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#f0fafa", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#d0f0ef", marginTop: 1 },
  termText: { flex: 1, fontSize: 14, color: "#4b6585", fontWeight: "500", lineHeight: 21 },
  promoStrip: { marginHorizontal: 20, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 18, marginBottom: 20 },
  promoTitle: { fontSize: 16, fontWeight: "800", color: "#fff", marginBottom: 3 },
  promoSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  headerWrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100 },
  headerInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  headerBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.88)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(238,240,243,0.7)" },
  headerTitleText: { flex: 1, fontSize: 16, fontWeight: "800", color: "#101720", letterSpacing: -0.3 },
  headerActions: { flexDirection: "row", gap: 8 },
  bottomWrap: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#eef0f3" },
  bottomBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 12 },
  bookBtn: { flex: 1, height: 52, borderRadius: 16, backgroundColor: "#101720", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 },
  bookBtnOff: { backgroundColor: "#e5e7eb" },
  bookBtnLabel: { fontSize: 16, fontWeight: "800", color: "#fff" },
  bookBtnSub: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: "500", marginTop: 1 },
  bookArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
});