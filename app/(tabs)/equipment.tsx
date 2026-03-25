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
import { equipmentApi } from "../../services/captainApi";

const { width } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────
interface Equipment {
  id: number;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  description?: string;
  dailyRate: number;
  hourlyRate?: number;
  currency: string;
  quantity: number;
  availableQuantity: number;
  isAvailable: boolean;
  requiresDelivery: boolean;
  deliveryChargePerKm: number;
  condition: "Excellent" | "Good" | "Fair";
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
}

const CONDITION_CONFIG = {
  Excellent: { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" },
  Good:      { color: "#0cadab", bg: "#f0fffe", border: "#a5f3fc" },
  Fair:      { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
};

const CATEGORY_ICONS: Record<string, string> = {
  Speaker: "volume-high-outline",
  Mixer: "options-outline",
  Turntable: "disc-outline",
  Microphone: "mic-outline",
  Lighting: "flashlight-outline",
  "Fog Machine": "cloud-outline",
  Laser: "flashlight-outline",
  "LED Panel": "sunny-outline",
  Amplifier: "radio-outline",
  Subwoofer: "radio-outline",
  "DJ Controller": "disc-outline",
  Projector: "tv-outline",
  "LED Screen": "tv-outline",
  "Karaoke System": "mic-outline",
  "CO2 Cannon": "cloud-outline",
  Other: "cube-outline",
};

// ─── Equipment Form Modal ─────────────────────────────────────────────────────
const EquipmentFormModal = ({
  visible,
  editItem,
  onClose,
  onSave,
}: {
  visible: boolean;
  editItem: Equipment | null;
  onClose: () => void;
  onSave: () => void;
}) => {
  const isEditing = !!editItem;
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", category: "Speaker", brand: "", model: "", description: "",
    dailyRate: "", hourlyRate: "", quantity: "1",
    requiresDelivery: true, deliveryChargePerKm: "0",
    condition: "Good" as "Excellent" | "Good" | "Fair",
  });

  useEffect(() => {
    if (editItem) {
      setForm({
        name: editItem.name || "",
        category: editItem.category || "Speaker",
        brand: editItem.brand || "",
        model: editItem.model || "",
        description: editItem.description || "",
        dailyRate: String(editItem.dailyRate || ""),
        hourlyRate: String(editItem.hourlyRate || ""),
        quantity: String(editItem.quantity || 1),
        requiresDelivery: editItem.requiresDelivery ?? true,
        deliveryChargePerKm: String(editItem.deliveryChargePerKm || 0),
        condition: editItem.condition || "Good",
      });
    } else {
      setForm({
        name: "", category: "Speaker", brand: "", model: "", description: "",
        dailyRate: "", hourlyRate: "", quantity: "1",
        requiresDelivery: true, deliveryChargePerKm: "0",
        condition: "Good",
      });
    }
  }, [editItem, visible]);

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert("Required", "Equipment name is required");
    if (!form.dailyRate || isNaN(Number(form.dailyRate))) return Alert.alert("Required", "Valid daily rate is required");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        brand: form.brand.trim() || undefined,
        model: form.model.trim() || undefined,
        description: form.description.trim() || undefined,
        dailyRate: parseFloat(form.dailyRate),
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        quantity: parseInt(form.quantity) || 1,
        requiresDelivery: form.requiresDelivery,
        deliveryChargePerKm: parseFloat(form.deliveryChargePerKm) || 0,
        condition: form.condition,
        currency: "INR",
      };

      if (isEditing && editItem) {
        const res = await equipmentApi.update(editItem.id, payload);
        if (!res.success) throw new Error(res.message);
      } else {
        const res = await equipmentApi.create(payload);
        if (!res.success) throw new Error(res.message);
      }

      onSave();
      onClose();
      Alert.alert("Success", isEditing ? "Equipment updated!" : "Equipment added!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save equipment");
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false }: any) => (
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
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={formS.overlay}>
        <View style={formS.sheet}>
          <View style={formS.topRow}>
            <Text style={formS.title}>{isEditing ? "Edit Equipment" : "Add Equipment"}</Text>
            <TouchableOpacity onPress={onClose} style={formS.closeBtn}>
              <Ionicons name="close" size={20} color="#101720" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <InputField
              label="Equipment Name *"
              value={form.name}
              onChangeText={(v: string) => setForm(p => ({ ...p, name: v }))}
              placeholder="e.g. QSC K12.2 Speaker"
            />

            {/* Category */}
            <View style={formS.field}>
              <Text style={formS.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={formS.catRow}>
                  {equipmentApi.CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setForm(p => ({ ...p, category: cat }))}
                      style={[formS.catChip, form.category === cat && formS.catChipActive]}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={(CATEGORY_ICONS[cat] || "cube-outline") as any}
                        size={14}
                        color={form.category === cat ? "#fff" : "#8696a0"}
                      />
                      <Text style={[formS.catText, form.category === cat && formS.catTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={formS.rowFields}>
              <View style={[formS.field, { flex: 1 }]}>
                <Text style={formS.label}>Brand</Text>
                <TextInput style={formS.input} value={form.brand} onChangeText={v => setForm(p => ({ ...p, brand: v }))} placeholder="e.g. QSC" placeholderTextColor="#8696a0" />
              </View>
              <View style={[formS.field, { flex: 1 }]}>
                <Text style={formS.label}>Model</Text>
                <TextInput style={formS.input} value={form.model} onChangeText={v => setForm(p => ({ ...p, model: v }))} placeholder="e.g. K12.2" placeholderTextColor="#8696a0" />
              </View>
            </View>

            <View style={formS.rowFields}>
              <View style={[formS.field, { flex: 1 }]}>
                <Text style={formS.label}>Daily Rate (₹) *</Text>
                <TextInput style={formS.input} value={form.dailyRate} onChangeText={v => setForm(p => ({ ...p, dailyRate: v }))} placeholder="1200" placeholderTextColor="#8696a0" keyboardType="numeric" />
              </View>
              <View style={[formS.field, { flex: 1 }]}>
                <Text style={formS.label}>Hourly Rate (₹)</Text>
                <TextInput style={formS.input} value={form.hourlyRate} onChangeText={v => setForm(p => ({ ...p, hourlyRate: v }))} placeholder="200" placeholderTextColor="#8696a0" keyboardType="numeric" />
              </View>
              <View style={[formS.field, { flex: 1 }]}>
                <Text style={formS.label}>Qty</Text>
                <TextInput style={formS.input} value={form.quantity} onChangeText={v => setForm(p => ({ ...p, quantity: v }))} placeholder="1" placeholderTextColor="#8696a0" keyboardType="numeric" />
              </View>
            </View>

            <InputField
              label="Description"
              value={form.description}
              onChangeText={(v: string) => setForm(p => ({ ...p, description: v }))}
              placeholder="Brief description..."
              multiline
            />

            {/* Condition */}
            <View style={formS.field}>
              <Text style={formS.label}>Condition</Text>
              <View style={formS.condRow}>
                {(["Excellent", "Good", "Fair"] as const).map(c => {
                  const cfg = CONDITION_CONFIG[c];
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setForm(p => ({ ...p, condition: c }))}
                      style={[formS.condChip, form.condition === c && { backgroundColor: cfg.bg, borderColor: cfg.border }]}
                      activeOpacity={0.8}
                    >
                      <Text style={[formS.condText, form.condition === c && { color: cfg.color }]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Delivery */}
            <View style={formS.field}>
              <View style={formS.toggleRow}>
                <Text style={formS.label}>Requires Delivery</Text>
                <Switch
                  value={form.requiresDelivery}
                  onValueChange={v => setForm(p => ({ ...p, requiresDelivery: v }))}
                  trackColor={{ false: "#e5e7eb", true: "#a5f3fc" }}
                  thumbColor={form.requiresDelivery ? "#0cadab" : "#8696a0"}
                />
              </View>
              {form.requiresDelivery ? (
                <TextInput
                  style={[formS.input, { marginTop: 8 }]}
                  value={form.deliveryChargePerKm}
                  onChangeText={v => setForm(p => ({ ...p, deliveryChargePerKm: v }))}
                  placeholder="Delivery charge per km (₹)"
                  placeholderTextColor="#8696a0"
                  keyboardType="numeric"
                />
              ) : null}
            </View>

            <TouchableOpacity style={formS.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              <LinearGradient colors={["#0cadab", "#0a9998"]} style={formS.saveBtnGrad}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                    <Ionicons name={isEditing ? "checkmark" : "add"} size={18} color="#fff" />
                    <Text style={formS.saveBtnText}>{isEditing ? "Save Changes" : "Add Equipment"}</Text>
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

// ─── Equipment Card ───────────────────────────────────────────────────────────
const EquipmentCard = ({
  item,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: Equipment;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) => {
  const condCfg = CONDITION_CONFIG[item.condition] || CONDITION_CONFIG.Good;
  const utilPct = item.quantity > 0 ? Math.round(((item.quantity - item.availableQuantity) / item.quantity) * 100) : 0;
  const icon = CATEGORY_ICONS[item.category] || "cube-outline";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <LinearGradient colors={["#f0fffe", "#e0f7f6"]} style={styles.cardIcon}>
          <Ionicons name={icon as any} size={22} color="#0cadab" />
        </LinearGradient>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardCategory}>{item.category}{item.brand ? ` · ${item.brand}` : ""}</Text>
          <View style={[styles.condBadge, { backgroundColor: condCfg.bg, borderColor: condCfg.border }]}>
            <Text style={[styles.condText, { color: condCfg.color }]}>{item.condition}</Text>
          </View>
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

      {/* Utilization bar */}
      <View style={styles.utilRow}>
        <View style={styles.utilBar}>
          <View style={[styles.utilFill, { width: `${utilPct}%` as any }]} />
        </View>
        <Text style={styles.utilText}>{item.availableQuantity}/{item.quantity} available</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>₹{Number(item.dailyRate).toLocaleString()}</Text>
          <Text style={styles.statLbl}>Per Day</Text>
        </View>
        <View style={styles.statDiv} />
        {item.hourlyRate ? <>
          <View style={styles.stat}>
            <Text style={styles.statVal}>₹{Number(item.hourlyRate).toLocaleString()}</Text>
            <Text style={styles.statLbl}>Per Hour</Text>
          </View>
          <View style={styles.statDiv} />
        </> : null}
        <View style={styles.stat}>
          <Text style={styles.statVal}>{item.quantity}</Text>
          <Text style={styles.statLbl}>Total Qty</Text>
        </View>
        {item.requiresDelivery ? <>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>₹{Number(item.deliveryChargePerKm)}/km</Text>
            <Text style={styles.statLbl}>Delivery</Text>
          </View>
        </> : null}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {item.isAvailable ? "Available for rent" : "Not available"}
        </Text>
        <Switch
          value={item.isAvailable}
          onValueChange={onToggle}
          trackColor={{ false: "#e5e7eb", true: "#a5f3fc" }}
          thumbColor={item.isAvailable ? "#0cadab" : "#8696a0"}
        />
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EquipmentScreen() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Equipment | null>(null);

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await equipmentApi.getAll({
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        search: search || undefined,
      });
      if (res.success) setItems(res.data || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to fetch equipment");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    setLoading(true);
    fetchEquipment();
  }, [selectedCategory]);

  useEffect(() => {
    const t = setTimeout(() => fetchEquipment(), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleToggle = async (item: Equipment) => {
    try {
      const res = await equipmentApi.toggleAvailability(item.id);
      if (res.success) setItems(prev => prev.map(e => e.id === item.id ? { ...e, isAvailable: !e.isAvailable } : e));
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleDelete = (item: Equipment) => {
    Alert.alert("Remove Equipment", `Remove "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try {
            const res = await equipmentApi.remove(item.id);
            if (res.success) setItems(prev => prev.filter(e => e.id !== item.id));
          } catch (err: any) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const available = items.filter(e => e.isAvailable).length;
  const categories = ["All", ...equipmentApi.CATEGORIES];

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8ff" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LinearGradient colors={["#f4f8ff", "#eef1f9", "#ffffff"]} style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.topBarTitle}>Equipment</Text>
              <Text style={styles.topBarSub}>{available} available · {items.length} total</Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { setEditItem(null); setShowForm(true); }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={["#0cadab", "#0a9998"]} style={styles.addBtnGrad}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add Item</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#8696a0" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search equipment..."
                placeholderTextColor="#8696a0"
                value={search}
                onChangeText={setSearch}
              />
              {search ? <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color="#c4c9d0" /></TouchableOpacity> : null}
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                activeOpacity={0.8}
              >
                {cat !== "All" && <Ionicons name={(CATEGORY_ICONS[cat] || "cube-outline") as any} size={13} color={selectedCategory === cat ? "#fff" : "#8696a0"} />}
                <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={styles.loader}><ActivityIndicator size="large" color="#0cadab" /></View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <EquipmentCard
                  item={item}
                  onEdit={() => { setEditItem(item); setShowForm(true); }}
                  onToggle={() => handleToggle(item)}
                  onDelete={() => handleDelete(item)}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="hardware-chip-outline" size={48} color="#c4c9d0" />
                  <Text style={styles.emptyTitle}>No equipment yet</Text>
                  <Text style={styles.emptySub}>Tap "Add Item" to start your inventory</Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEquipment(); }} tintColor="#0cadab" />}
            />
          )}
        </LinearGradient>
      </SafeAreaView>

      <EquipmentFormModal
        visible={showForm}
        editItem={editItem}
        onClose={() => setShowForm(false)}
        onSave={fetchEquipment}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8ff" },
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#eef0f3",
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

  catScroll: { maxHeight: 52 },
  catContent: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#eef0f3",
  },
  catChipActive: { backgroundColor: "#101720", borderColor: "#101720" },
  catChipText: { fontSize: 12, fontWeight: "700", color: "#8696a0" },
  catChipTextActive: { color: "#fff" },

  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 120, gap: 12 },

  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#eef0f3" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  cardIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 16, fontWeight: "800", color: "#101720", letterSpacing: -0.2 },
  cardCategory: { fontSize: 12, color: "#8696a0", fontWeight: "500" },
  condBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start" },
  condText: { fontSize: 11, fontWeight: "700" },
  cardActions: { gap: 6 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#f0fffe", justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#a5f3fc",
  },
  iconBtnDanger: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },

  utilRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  utilBar: { flex: 1, height: 6, backgroundColor: "#eef0f3", borderRadius: 3, overflow: "hidden" },
  utilFill: { height: "100%", borderRadius: 3, backgroundColor: "#0cadab" },
  utilText: { fontSize: 11, color: "#8696a0", fontWeight: "600", flexShrink: 0 },

  statsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f8fafc", borderRadius: 14, padding: 12, marginBottom: 12,
  },
  stat: { flex: 1, alignItems: "center" },
  statDiv: { width: 1, height: 28, backgroundColor: "#e5e7eb" },
  statVal: { fontSize: 13, fontWeight: "800", color: "#101720", letterSpacing: -0.2 },
  statLbl: { fontSize: 9, color: "#8696a0", fontWeight: "600", marginTop: 2 },

  toggleRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f0f0",
  },
  toggleLabel: { fontSize: 13, color: "#5a6169", fontWeight: "600" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#101720" },
  emptySub: { fontSize: 14, color: "#8696a0" },
});

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
  multilineInput: { minHeight: 80, textAlignVertical: "top" },
  rowFields: { flexDirection: "row", gap: 10 },
  catRow: { flexDirection: "row", gap: 8 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#f4f8ff", borderWidth: 1, borderColor: "#eef0f3",
  },
  catChipActive: { backgroundColor: "#0cadab", borderColor: "#0cadab" },
  catText: { fontSize: 12, fontWeight: "700", color: "#8696a0" },
  catTextActive: { color: "#fff" },
  condRow: { flexDirection: "row", gap: 8 },
  condChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
    backgroundColor: "#f4f8ff", borderWidth: 1, borderColor: "#eef0f3",
  },
  condText: { fontSize: 13, fontWeight: "700", color: "#8696a0" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  saveBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  saveBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});