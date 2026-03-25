/**
 * app/profile/saved-djs.tsx — Saved / Favourite DJs screen
 *
 * Since the backend has no favorites endpoint, saved DJs are stored locally
 * via AsyncStorage under the key "bw_saved_djs".
 *
 * This screen:
 *  - Reads saved DJ IDs from AsyncStorage
 *  - Fetches each DJ's data from the backend
 *  - Shows a card grid with Remove / Book actions
 *  - If empty, shows an illustration + browse button
 *
 * Export: saveDJ(id) and unsaveDJ(id) helpers for use from [id].tsx
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService } from "../../services/api";

const STORAGE_KEY = "bw_saved_djs";

// ─── Helpers — import these in [id].tsx ──────────────────────────────────────

export async function getSavedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveDJ(id: string): Promise<void> {
  const ids = await getSavedIds();
  if (!ids.includes(id)) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, id]));
  }
}

export async function unsaveDJ(id: string): Promise<void> {
  const ids = await getSavedIds();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids.filter(i => i !== id)));
}

export async function isDJSaved(id: string): Promise<boolean> {
  const ids = await getSavedIds();
  return ids.includes(id);
}

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

// ─── DJ Card ──────────────────────────────────────────────────────────────────

function DJCard({ dj, onRemove, onBook }: {
  dj: any; onRemove: (id: string) => void; onBook: (id: string) => void;
}) {
  const genres: string[] = Array.isArray(dj.genres) ? dj.genres : [];
  const image: string = Array.isArray(dj.images) && dj.images.length > 0
    ? dj.images[0]
    : "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80";
  const rating = parseFloat(dj.ratingAverage ?? 0).toFixed(1);
  const rate = Math.round(dj.hourlyRate ?? 0).toLocaleString("en-IN");

  return (
    <TouchableOpacity style={c.card} activeOpacity={0.92}
      onPress={() => onBook(String(dj.id))}>
      {/* Image */}
      <View style={c.imgWrap}>
        <Image source={{ uri: image }} style={c.img} />
        <LinearGradient colors={["transparent","rgba(16,23,32,0.72)"]} style={c.imgGrad} />

        {/* Remove heart */}
        <TouchableOpacity style={c.removeBtn}
          onPress={() => onRemove(String(dj.id))} activeOpacity={0.8}>
          <Ionicons name="heart" size={16} color="#ef4444" />
        </TouchableOpacity>

        {/* Available badge */}
        <View style={[c.availBadge, !dj.isAvailable && c.availBadgeOff]}>
          <View style={[c.availDot, !dj.isAvailable && { backgroundColor: "#d1d5db" }]} />
          <Text style={c.availText}>{dj.isAvailable ? "Available" : "Unavailable"}</Text>
        </View>

        {/* Name over image */}
        <View style={c.nameWrap}>
          <Text style={c.genre} numberOfLines={1}>{genres.slice(0,2).join(" · ") || "DJ"}</Text>
          <Text style={c.name} numberOfLines={1}>{dj.name}</Text>
          <View style={c.metaRow}>
            <Ionicons name="star" size={11} color="#FFC107" />
            <Text style={c.rating}>{rating}</Text>
            <Text style={c.ratingCount}>({dj.ratingCount ?? 0})</Text>
            <Text style={c.rateText}>  ₹{rate}/hr</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={c.footer}>
        {dj.locationCity && (
          <View style={c.locRow}>
            <Ionicons name="location-outline" size={12} color="#8696a0" />
            <Text style={c.locText} numberOfLines={1}>
              {[dj.locationCity, dj.locationState].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[c.bookBtn, !dj.isAvailable && c.bookBtnOff]}
          disabled={!dj.isAvailable}
          onPress={() => onBook(String(dj.id))}
          activeOpacity={0.85}
        >
          <Text style={c.bookBtnText}>{dj.isAvailable ? "Book Now" : "Unavailable"}</Text>
          {dj.isAvailable && <Ionicons name="arrow-forward" size={13} color="#fff" />}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SavedDJsScreen() {
  const router = useRouter();
  const [djs,       setDJs]       = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  const loadSaved = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    try {
      const ids = await getSavedIds();
      if (ids.length === 0) { setDJs([]); return; }
      // Fetch each saved DJ — parallel
      const results = await Promise.allSettled(
        ids.map(id => apiService.getDJById(id).then(r => r?.data ?? r))
      );
      const loaded = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && !!r.value)
        .map(r => r.value);
      setDJs(loaded);
    } catch (err) {
      console.error("Failed to load saved DJs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSaved(); }, [loadSaved]));

  const handleRemove = (id: string) => {
    Alert.alert("Remove DJ?", "Remove this DJ from your saved list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await unsaveDJ(id);
          setDJs(prev => prev.filter(d => String(d.id) !== id));
        },
      },
    ]);
  };

  const handleBook = (id: string) => {
    router.push(`/equipment/${id}` as any);
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8ff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#101720" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Saved DJs</Text>
          {!loading && djs.length > 0 && (
            <Text style={s.headerSub}>{djs.length} DJ{djs.length !== 1 ? "s" : ""} saved</Text>
          )}
        </View>
        <View style={{ width: 42 }} />
      </View>

      {/* Loading skeletons */}
      {loading ? (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {[1,2,3].map(i => (
            <View key={i} style={[c.card, { overflow: "hidden" }]}>
              <Skel w="100%" h={200} r={0} />
              <View style={{ padding: 14, gap: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Skel w={140} h={16} r={5} />
                  <Skel w={80} h={16} r={5} />
                </View>
                <Skel w="100%" h={38} r={12} />
              </View>
            </View>
          ))}
        </ScrollView>

      /* Empty state */
      ) : djs.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <Ionicons name="heart-outline" size={44} color="#0cadab" />
          </View>
          <Text style={s.emptyTitle}>No Saved DJs Yet</Text>
          <Text style={s.emptySub}>
            Tap the ♥ on any DJ profile to save them here for quick access.
          </Text>
          <TouchableOpacity style={s.browseBtn} activeOpacity={0.85}
            onPress={() => router.push("/(tabs)/explore" as any)}>
            <Ionicons name="search-outline" size={18} color="#fff" />
            <Text style={s.browseBtnText}>Browse DJs</Text>
          </TouchableOpacity>
        </View>

      /* List */
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadSaved(true)} colors={["#0cadab"]} />
          }
        >
          {djs.map(dj => (
            <DJCard key={dj.id} dj={dj} onRemove={handleRemove} onBook={handleBook} />
          ))}

          {/* Tip */}
          <View style={s.tip}>
            <Ionicons name="information-circle-outline" size={14} color="#8696a0" />
            <Text style={s.tipText}>Tap the ♥ on a DJ profile to save or remove them from this list.</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: "#f4f8ff" },
  header:       { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: "#f4f8ff", borderBottomWidth: 1, borderBottomColor: "#eef0f3" },
  backBtn:      { width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#eef0f3" },
  headerTitle:  { fontSize: 18, fontWeight: "800", color: "#101720", letterSpacing: -0.3 },
  headerSub:    { fontSize: 12, color: "#8696a0", fontWeight: "500", marginTop: 2 },
  scroll:       { paddingHorizontal: 20, paddingTop: 16 },

  emptyWrap:    { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyIcon:    { width: 100, height: 100, borderRadius: 32, backgroundColor: "#f0fafa", justifyContent: "center", alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: "#d0f0ef" },
  emptyTitle:   { fontSize: 22, fontWeight: "800", color: "#101720", marginBottom: 10, textAlign: "center" },
  emptySub:     { fontSize: 14, color: "#8696a0", textAlign: "center", lineHeight: 22, fontWeight: "500", marginBottom: 28 },
  browseBtn:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#101720", borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  browseBtnText:{ fontSize: 15, fontWeight: "700", color: "#fff" },

  tip:          { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#f9fafb", borderRadius: 14, padding: 14, marginTop: 4, borderWidth: 1, borderColor: "#e5e7eb" },
  tipText:      { flex: 1, fontSize: 12, color: "#8696a0", lineHeight: 17, fontWeight: "500" },
});

const c = StyleSheet.create({
  card:         { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: "#eef0f3" },
  imgWrap:      { position: "relative", height: 200 },
  img:          { width: "100%", height: "100%", backgroundColor: "#e5e7eb" },
  imgGrad:      { ...StyleSheet.absoluteFillObject },
  removeBtn:    { position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.92)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#fecaca" },
  availBadge:   { position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  availBadgeOff:{ backgroundColor: "rgba(220,220,220,0.85)" },
  availDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" },
  availText:    { fontSize: 10, fontWeight: "700", color: "#101720" },
  nameWrap:     { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14 },
  genre:        { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 },
  name:         { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.4, marginBottom: 5 },
  metaRow:      { flexDirection: "row", alignItems: "center", gap: 3 },
  rating:       { fontSize: 12, fontWeight: "700", color: "#fff" },
  ratingCount:  { fontSize: 11, color: "rgba(255,255,255,0.55)" },
  rateText:     { fontSize: 13, fontWeight: "700", color: "#0cadab" },

  footer:       { padding: 14, gap: 10 },
  locRow:       { flexDirection: "row", alignItems: "center", gap: 4 },
  locText:      { fontSize: 12, color: "#8696a0", fontWeight: "500", flex: 1 },
  bookBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#101720", borderRadius: 13, paddingVertical: 12 },
  bookBtnOff:   { backgroundColor: "#e5e7eb" },
  bookBtnText:  { fontSize: 14, fontWeight: "700", color: "#fff" },
});