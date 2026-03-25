import React, { useRef, useState } from "react";
import {
  Animated,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "expo-router";

// ─── Logout Modal ─────────────────────────────────────────────────────────────
const LogoutModal = ({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const scaleValue = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalS.overlay}>
        <Animated.View style={[modalS.modal, { transform: [{ scale: scaleValue }] }]}>
          <View style={modalS.iconCircle}>
            <Ionicons name="log-out-outline" size={30} color="#ef4444" />
          </View>
          <Text style={modalS.title}>Sign Out?</Text>
          <Text style={modalS.message}>You'll need to sign in again to access your captain dashboard.</Text>
          <View style={modalS.buttonRow}>
            <TouchableOpacity style={modalS.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={modalS.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalS.confirmBtn} onPress={onConfirm} activeOpacity={0.8}>
              <Text style={modalS.confirmBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const MenuRow = ({
  icon, label, sublabel = null, onPress, danger = false, rightEl = null, accentColor = null,
}: {
  icon: string; label: string; sublabel?: string | null;
  onPress: () => void; danger?: boolean;
  rightEl?: React.ReactNode; accentColor?: string | null;
}) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.menuIcon, danger && styles.menuIconDanger, accentColor ? { backgroundColor: "#f0fffe" } : null]}>
      <Ionicons name={icon as any} size={20} color={danger ? "#ef4444" : accentColor ?? "#101720"} />
    </View>
    <View style={styles.menuTextBlock}>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {sublabel ? <Text style={styles.menuSublabel}>{sublabel}</Text> : null}
    </View>
    {rightEl || <Ionicons name="chevron-forward" size={18} color={danger ? "#ef4444" : "#c4c9d0"} />}
  </TouchableOpacity>
);

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionLabel}>{title}</Text>
    {children}
  </View>
);

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);

  const firstName = user?.firstName || "Captain";
  const lastName = user?.lastName || "";
  const initials = `${firstName[0] || "C"}${lastName[0] || ""}`.toUpperCase();
  const captain = user?.captainProfile;

  const handleLogout = async () => {
    setShowLogout(false);
    await logout();
    router.replace("/(auth)/login" as any);
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8ff" />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <LinearGradient colors={["#f4f8ff", "#eef1f9", "#ffffff"]} style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>Profile</Text>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="settings-outline" size={20} color="#101720" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* ── Avatar ── */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarOuter}>
                <LinearGradient colors={["#0cadab", "#0a9998"]} style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </LinearGradient>
                {captain?.isVerified ? (
                  <View style={styles.verifiedDot}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                ) : null}
              </View>

              <Text style={styles.captainName}>{firstName} {lastName}</Text>
              <Text style={styles.captainRole}>
                {captain?.businessName || "DJ & Sound Captain"}
              </Text>

              <View style={styles.metaRow}>
                {captain?.locationCity ? (
                  <View style={styles.metaChip}>
                    <Ionicons name="location-outline" size={13} color="#8696a0" />
                    <Text style={styles.metaChipText}>{captain.locationCity}</Text>
                  </View>
                ) : null}
                {captain?.isVerified ? (
                  <View style={[styles.metaChip, styles.verifiedChip]}>
                    <Ionicons name="shield-checkmark-outline" size={13} color="#0cadab" />
                    <Text style={[styles.metaChipText, { color: "#0cadab" }]}>Verified</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
                <Ionicons name="pencil-outline" size={15} color="#101720" />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* ── Quick Nav ── */}
            <View style={styles.navSection}>
              {[
                { icon: "calendar-outline", label: "Bookings", route: "/bookings", color: "#0cadab", bg: "#f0fffe" },
                { icon: "musical-notes-outline", label: "My DJs", route: "/djs", color: "#6366f1", bg: "#eef2ff" },
                { icon: "hardware-chip-outline", label: "Equipment", route: "/equipment", color: "#f59e0b", bg: "#fffbeb" },
              ].map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.navCard}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.navIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={styles.navLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#c4c9d0" />
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Account Info ── */}
            <SectionCard title="Account">
              <MenuRow icon="person-outline" label="Full Name" sublabel={`${firstName} ${lastName}`} onPress={() => {}} />
              <MenuRow icon="mail-outline" label="Email" sublabel={user?.email} onPress={() => {}} />
              <MenuRow icon="call-outline" label="Phone" sublabel={user?.phone || captain?.phone} onPress={() => {}} />
              <MenuRow icon="briefcase-outline" label="Business Name" sublabel={captain?.businessName || "Not set"} onPress={() => {}} />
              {captain?.serviceRadiusKm ? (
                <MenuRow icon="navigate-outline" label="Service Radius" sublabel={`${captain.serviceRadiusKm} km`} onPress={() => {}} />
              ) : null}
            </SectionCard>

            {/* ── Support ── */}
            <SectionCard title="Support">
              <MenuRow icon="help-circle-outline" label="Help Centre" onPress={() => {}} />
              <MenuRow icon="chatbubble-outline" label="Contact Support" onPress={() => {}} />
              <MenuRow icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
              <MenuRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => {}} />
            </SectionCard>

            <Text style={styles.versionText}>Basswala Captain v1.0</Text>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => setShowLogout(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>

      <LogoutModal visible={showLogout} onClose={() => setShowLogout(false)} onConfirm={handleLogout} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8ff" },
  scrollContent: { paddingBottom: 16 },
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#eef0f3",
  },
  topBarTitle: { fontSize: 26, fontWeight: "800", color: "#101720", letterSpacing: -0.5 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#eef0f3",
  },

  avatarSection: { alignItems: "center", paddingTop: 28, paddingBottom: 24, paddingHorizontal: 20 },
  avatarOuter: { position: "relative", marginBottom: 14 },
  avatarCircle: { width: 96, height: 96, borderRadius: 32, justifyContent: "center", alignItems: "center" },
  avatarInitials: { fontSize: 36, fontWeight: "800", color: "#fff", letterSpacing: -1 },
  verifiedDot: {
    position: "absolute", bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 8, backgroundColor: "#0cadab",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2.5, borderColor: "#f4f8ff",
  },
  captainName: { fontSize: 24, fontWeight: "800", color: "#101720", letterSpacing: -0.5, marginBottom: 4 },
  captainRole: { fontSize: 14, color: "#8696a0", fontWeight: "600", marginBottom: 12 },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "#eef0f3",
  },
  verifiedChip: { borderColor: "#a5f3fc", backgroundColor: "#f0fffe" },
  metaChipText: { fontSize: 12, fontWeight: "600", color: "#5a6169" },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff",
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1, borderColor: "#eef0f3",
  },
  editBtnText: { fontSize: 13, fontWeight: "700", color: "#101720" },

  navSection: { paddingHorizontal: 20, marginBottom: 16, gap: 8 },
  navCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#eef0f3",
  },
  navIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  navLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: "#101720" },

  sectionCard: {
    marginHorizontal: 20, backgroundColor: "#fff", borderRadius: 20,
    padding: 6, marginBottom: 16, borderWidth: 1, borderColor: "#eef0f3",
  },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#8696a0", letterSpacing: 0.8,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, textTransform: "uppercase",
  },
  menuRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 12, gap: 12, borderRadius: 14,
  },
  menuIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#f4f8ff", justifyContent: "center", alignItems: "center" },
  menuIconDanger: { backgroundColor: "#fef2f2" },
  menuTextBlock: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "600", color: "#101720" },
  menuLabelDanger: { color: "#ef4444" },
  menuSublabel: { fontSize: 12, color: "#8696a0", fontWeight: "500", marginTop: 1 },

  versionText: { textAlign: "center", fontSize: 12, color: "#c4c9d0", fontWeight: "500", marginBottom: 14, marginTop: 4 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 20, paddingVertical: 16, borderRadius: 18,
    borderWidth: 1.5, borderColor: "#fecaca", backgroundColor: "#fff5f5",
  },
  logoutBtnText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
});

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(16,23,32,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  modal: {
    backgroundColor: "#fff", borderRadius: 26, padding: 28, width: "100%",
    maxWidth: 380, alignItems: "center", borderWidth: 1, borderColor: "#eef0f3",
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: "#fef2f2",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
    borderWidth: 1, borderColor: "#fecaca",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#101720", textAlign: "center", marginBottom: 10 },
  message: { fontSize: 14, color: "#8696a0", textAlign: "center", lineHeight: 21, marginBottom: 28, fontWeight: "500" },
  buttonRow: { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn: {
    flex: 1, backgroundColor: "#f4f8ff", borderRadius: 16, paddingVertical: 14,
    alignItems: "center", borderWidth: 1, borderColor: "#eef0f3",
  },
  cancelBtnText: { color: "#8696a0", fontSize: 14, fontWeight: "700" },
  confirmBtn: { flex: 1, backgroundColor: "#ef4444", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});