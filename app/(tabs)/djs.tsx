import React, { useState, useEffect, useCallback } from "react";
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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { djApi } from "../../services/captainApi";

const { width } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────
interface DJ {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  bio?: string;
  genres: string[];
  experienceYears: number;
  hourlyRate: number;
  minimumHours: number;
  currency: string;
  isAvailable: boolean;
  isActive: boolean;
  specializations: string[];
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
}

const GENRES = [
  "Bollywood", "EDM", "Hip Hop", "House", "Techno", "R&B",
  "Pop", "Punjabi", "Retro", "Reggaeton", "Commercial", "Sufi",
];

const SPECIALIZATIONS = [
  "Wedding", "Club", "Corporate", "Birthday", "Festival", "Private Party",
];

// ─── DJ Form Modal ────────────────────────────────────────────────────────────
const DJFormModal = ({
  visible,
  editDJ,
  onClose,
  onSave,
}: {
  visible: boolean;
  editDJ: DJ | null;
  onClose: () => void;
  onSave: () => void;
}) => {
  const isEditing = !!editDJ;
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", bio: "",
    hourlyRate: "", minimumHours: "2", experienceYears: "0",
    genres: [] as string[],
    specializations: [] as string[],
  });

  useEffect(() => {
    if (editDJ) {
      setForm({
        name: editDJ.name || "",
        phone: editDJ.phone || "",
        email: editDJ.email || "",
        bio: editDJ.bio || "",
        hourlyRate: String(editDJ.hourlyRate || ""),
        minimumHours: String(editDJ.minimumHours || 2),
        experienceYears: String(editDJ.experienceYears || 0),
        genres: editDJ.genres || [],
        specializations: editDJ.specializations || [],
      });
    } else {
      setForm({
        name: "", phone: "", email: "", bio: "",
        hourlyRate: "", minimumHours: "2", experienceYears: "0",
        genres: [], specializations: [],
      });
    }
  }, [editDJ, visible]);

  const toggleItem = (list: string[], item: string) =>
    list.includes(item) ? list.filter(x => x !== item) : [...list, item];

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert("Required", "DJ name is required");
    if (!form.hourlyRate || isNaN(Number(form.hourlyRate))) return Alert.alert("Required", "Valid hourly rate is required");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        bio: form.bio.trim() || undefined,
        hourlyRate: parseFloat(form.hourlyRate),
        minimumHours: parseInt(form.minimumHours) || 2,
        experienceYears: parseInt(form.experienceYears) || 0,
        genres: form.genres,
        specializations: form.specializations,
        currency: "INR",
      };

      if (isEditing && editDJ) {
        const res = await djApi.update(editDJ.id, payload);
        if (!res.success) throw new Error(res.message);
      } else {
        const res = await djApi.create(payload);
        if (!res.success) throw new Error(res.message);
      }

      onSave();
      onClose();
      Alert.alert("Success", isEditing ? "DJ updated!" : "DJ added successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save DJ");
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({
    label, value, onChangeText, placeholder, keyboardType = "default", multiline = false,
  }: any) => (
    <View style={formS.field}>
      <Text style={formS.label}>{label}</Text>
      <TextInput
        style={[formS.input, multiline && formS.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8696a0"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={formS.overlay}>
        <View style={formS.sheet}>
          <View style={formS.topRow}>
            <Text style={formS.title}>{isEditing ? "Edit DJ" : "Add New DJ"}</Text>
            <TouchableOpacity onPress={onClose} style={formS.closeBtn}>
              <Ionicons name="close" size={20} color="#101720" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <InputField label="DJ Name *" value={form.name} onChangeText={(v: string) => setForm(p => ({ ...p, name: v }))} placeholder="e.g. DJ Rahul" />
            <InputField label="Phone" value={form.phone} onChangeText={(v: string) => setForm(p => ({ ...p, phone: v }))} placeholder="10-digit phone" keyboardType="phone-pad" />
            <InputField label="Email" value={form.email} onChangeText={(v: string) => setForm(p => ({ ...p, email: v }))} placeholder="dj@email.com" keyboardType="email-address" />

            <View style={formS.rowFields}>
              <View style={[formS.field, { flex: 1 }]}>
                <Text style={formS.label}>Hourly Rate (₹) *</Text>
                <TextInput
                  style={formS.input}
                  value={form.hourlyRate}
                  onChangeText={v => setForm(p => ({ ...p, hourlyRate: v }))}
                  placeholder="1500"
                  placeholderTextColor="#8696a0"
                  keyboardType="numeric"
                />
              </View>
              <View style={[formS.field, { flex: 1 }]}>
                <Text style={formS.label}>Min Hours</Text>
                <TextInput
                  style={formS.input}
                  value={form.minimumHours}
                  onChangeText={v => setForm(p => ({ ...p, minimumHours: v }))}
                  placeholder="2"
                  placeholderTextColor="#8696a0"
                  keyboardType="numeric"
                />
              </View>
              <View style={[formS.field, { flex: 1 }]}>
                <Text style={formS.label}>Experience (yrs)</Text>
                <TextInput
                  style={formS.input}
                  value={form.experienceYears}
                  onChangeText={v => setForm(p => ({ ...p, experienceYears: v }))}
                  placeholder="3"
                  placeholderTextColor="#8696a0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <InputField
              label="Bio"
              value={form.bio}
              onChangeText={(v: string) => setForm(p => ({ ...p, bio: v }))}
              placeholder="Brief description of the DJ..."
              multiline
            />

            {/* Genres */}
            <View style={formS.field}>
              <Text style={formS.label}>Music Genres</Text>
              <View style={formS.tagGrid}>
                {GENRES.map(g => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setForm(p => ({ ...p, genres: toggleItem(p.genres, g) }))}
                    style={[formS.tag, form.genres.includes(g) && formS.tagActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[formS.tagText, form.genres.includes(g) && formS.tagTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Specializations */}
            <View style={formS.field}>
              <Text style={formS.label}>Specializations</Text>
              <View style={formS.tagGrid}>
                {SPECIALIZATIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setForm(p => ({ ...p, specializations: toggleItem(p.specializations, s) }))}
                    style={[formS.tag, form.specializations.includes(s) && formS.tagActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[formS.tagText, form.specializations.includes(s) && formS.tagTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={formS.saveBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient colors={["#0cadab", "#0a9998"]} style={formS.saveBtnGrad}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                    <Ionicons name={isEditing ? "checkmark" : "add"} size={18} color="#fff" />
                    <Text style={formS.saveBtnText}>{isEditing ? "Save Changes" : "Add DJ"}</Text>
                  </>
                }
              </LinearGradient>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── DJ Card ──────────────────────────────────────────────────────────────────
const DJCard = ({
  dj,
  onEdit,
  onToggle,
  onDelete,
}: {
  dj: DJ;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) => (
  <View style={styles.card}>
    {/* Header */}
    <View style={styles.cardHeader}>
      <View style={styles.cardAvatar}>
        <LinearGradient colors={dj.isAvailable ? ["#0cadab", "#0a9998"] : ["#8696a0", "#5a6169"]} style={styles.avatarGrad}>
          <Text style={styles.avatarText}>{dj.name[0]?.toUpperCase()}</Text>
        </LinearGradient>
        <View style={[styles.statusDot, { backgroundColor: dj.isAvailable ? "#22c55e" : "#ef4444" }]} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{dj.name}</Text>
        {dj.phone ? (
          <View style={styles.cardMeta}>
            <Ionicons name="call-outline" size={12} color="#8696a0" />
            <Text style={styles.cardMetaText}>{dj.phone}</Text>
          </View>
        ) : null}
        {dj.ratingCount > 0 ? (
          <View style={styles.cardMeta}>
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text style={styles.cardMetaText}>{dj.ratingAverage} ({dj.ratingCount} reviews)</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={onEdit} style={styles.iconBtn}>
          <Ionicons name="pencil-outline" size={16} color="#0cadab" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={[styles.iconBtn, styles.iconBtnDanger]}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>

    {/* Stats row */}
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>₹{Number(dj.hourlyRate).toLocaleString()}</Text>
        <Text style={styles.statLabel}>Per Hour</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{dj.minimumHours}h</Text>
        <Text style={styles.statLabel}>Min Hours</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{dj.experienceYears}yr</Text>
        <Text style={styles.statLabel}>Experience</Text>
      </View>
    </View>

    {/* Genres */}
    {/* Genres - Safe rendering */}
{dj.genres && Array.isArray(dj.genres) && dj.genres.length > 0 ? (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
    {dj.genres.slice(0, 5).map((g, index) => (
      <View key={index} style={styles.genreTag}>
        <Text style={styles.genreText}>{g}</Text>
      </View>
    ))}
    {dj.genres.length > 5 && (
      <View style={styles.genreTag}>
        <Text style={styles.genreText}>+{dj.genres.length - 5}</Text>
      </View>
    )}
  </ScrollView>
) : null}

    {/* Toggle */}
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>
        {dj.isAvailable ? "Available for bookings" : "Not accepting bookings"}
      </Text>
      <Switch
        value={dj.isAvailable}
        onValueChange={onToggle}
        trackColor={{ false: "#e5e7eb", true: "#a5f3fc" }}
        thumbColor={dj.isAvailable ? "#0cadab" : "#8696a0"}
      />
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DJsScreen() {
  const [djs, setDjs] = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editDJ, setEditDJ] = useState<DJ | null>(null);
  const [filterAvailable, setFilterAvailable] = useState<boolean | undefined>(undefined);

  const fetchDJs = useCallback(async () => {
    try {
      const res = await djApi.getAll({
        isAvailable: filterAvailable,
        search: search || undefined,
      });
      if (res.success) setDjs(res.data || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to fetch DJs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filterAvailable]);

  useEffect(() => {
    setLoading(true);
    fetchDJs();
  }, [filterAvailable]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchDJs(), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggle = async (dj: DJ) => {
    try {
      const res = await djApi.toggleAvailability(dj.id);
      if (res.success) {
        setDjs(prev => prev.map(d => d.id === dj.id ? { ...d, isAvailable: !d.isAvailable } : d));
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleDelete = (dj: DJ) => {
    Alert.alert(
      "Remove DJ",
      `Remove "${dj.name}" from your roster? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove", style: "destructive",
          onPress: async () => {
            try {
              const res = await djApi.remove(dj.id);
              if (res.success) {
                setDjs(prev => prev.filter(d => d.id !== dj.id));
                Alert.alert("Removed", `${dj.name} has been removed.`);
              } else {
                Alert.alert("Error", res.message);
              }
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ]
    );
  };

  const available = djs.filter(d => d.isAvailable).length;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8ff" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LinearGradient colors={["#f4f8ff", "#eef1f9", "#ffffff"]} style={{ flex: 1 }}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.topBarTitle}>My DJs</Text>
              <Text style={styles.topBarSub}>{available} available · {djs.length} total</Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { setEditDJ(null); setShowForm(true); }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={["#0cadab", "#0a9998"]} style={styles.addBtnGrad}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add DJ</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Search + Filter */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#8696a0" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search DJs..."
                placeholderTextColor="#8696a0"
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={18} color="#c4c9d0" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Filter chips */}
          <View style={styles.filterRow}>
            {[
              { label: "All", value: undefined },
              { label: "Available", value: true },
              { label: "Unavailable", value: false },
            ].map(opt => (
              <TouchableOpacity
                key={String(opt.label)}
                onPress={() => setFilterAvailable(opt.value)}
                style={[styles.filterChip, filterAvailable === opt.value && styles.filterChipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, filterAvailable === opt.value && styles.filterChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#0cadab" />
            </View>
          ) : (
            <FlatList
              data={djs}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <DJCard
                  dj={item}
                  onEdit={() => { setEditDJ(item); setShowForm(true); }}
                  onToggle={() => handleToggle(item)}
                  onDelete={() => handleDelete(item)}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="musical-notes-outline" size={48} color="#c4c9d0" />
                  <Text style={styles.emptyTitle}>No DJs yet</Text>
                  <Text style={styles.emptySub}>Tap "Add DJ" to build your roster</Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDJs(); }} tintColor="#0cadab" />}
            />
          )}
        </LinearGradient>
      </SafeAreaView>

      <DJFormModal
        visible={showForm}
        editDJ={editDJ}
        onClose={() => setShowForm(false)}
        onSave={fetchDJs}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8ff" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f3",
  },
  topBarTitle: { fontSize: 26, fontWeight: "800", color: "#101720", letterSpacing: -0.5 },
  topBarSub: { fontSize: 13, color: "#8696a0", fontWeight: "500", marginTop: 2 },
  addBtn: { borderRadius: 14, overflow: "hidden" },
  addBtnGrad: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11, gap: 6 },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  searchSection: { paddingHorizontal: 20, paddingTop: 14 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 12, borderWidth: 1, borderColor: "#eef0f3",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#101720", fontWeight: "500", padding: 0 },

  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#eef0f3",
  },
  filterChipActive: { backgroundColor: "#101720", borderColor: "#101720" },
  filterChipText: { fontSize: 12, fontWeight: "700", color: "#8696a0" },
  filterChipTextActive: { color: "#fff" },

  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 120, gap: 12 },

  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: "#eef0f3",
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  cardAvatar: { position: "relative" },
  avatarGrad: { width: 52, height: 52, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 22, fontWeight: "800", color: "#fff" },
  statusDot: {
    position: "absolute", bottom: -1, right: -1,
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2.5, borderColor: "#fff",
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 17, fontWeight: "800", color: "#101720", letterSpacing: -0.3, marginBottom: 4 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  cardMetaText: { fontSize: 12, color: "#8696a0", fontWeight: "500" },
  cardActions: { gap: 6 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#f0fffe", justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#a5f3fc",
  },
  iconBtnDanger: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },

  statsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f8fafc", borderRadius: 14, padding: 12, marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 30, backgroundColor: "#e5e7eb" },
  statValue: { fontSize: 16, fontWeight: "800", color: "#101720", letterSpacing: -0.3 },
  statLabel: { fontSize: 10, color: "#8696a0", fontWeight: "600", marginTop: 2 },

  tagsScroll: { marginBottom: 12 },
  genreTag: {
    backgroundColor: "#f0fffe", borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 4, marginRight: 6, borderWidth: 1, borderColor: "#a5f3fc",
  },
  genreText: { fontSize: 11, fontWeight: "700", color: "#0cadab" },

  toggleRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f0f0",
  },
  toggleLabel: { fontSize: 13, color: "#5a6169", fontWeight: "600" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#101720" },
  emptySub: { fontSize: 14, color: "#8696a0" },
});

// ─── Form Styles ──────────────────────────────────────────────────────────────
const formS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(16,23,32,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 16, maxHeight: "92%",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "800", color: "#101720", letterSpacing: -0.4 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#f4f8ff", justifyContent: "center", alignItems: "center",
  },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: "#5a6169", marginBottom: 7, letterSpacing: 0.3 },
  input: {
    borderWidth: 1, borderColor: "#eef0f3", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#101720",
  },
  multilineInput: { minHeight: 90, textAlignVertical: "top" },
  rowFields: { flexDirection: "row", gap: 10 },
  tagGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#f4f8ff", borderWidth: 1, borderColor: "#eef0f3",
  },
  tagActive: { backgroundColor: "#0cadab", borderColor: "#0cadab" },
  tagText: { fontSize: 12, fontWeight: "700", color: "#8696a0" },
  tagTextActive: { color: "#fff" },
  saveBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  saveBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});