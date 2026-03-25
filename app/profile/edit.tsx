/**
 * app/profile/edit.tsx — Edit Profile screen
 *
 * Editable fields: First Name, Last Name, Phone, Date of Birth
 * Saves via PUT /auth/profile then calls refreshUser() to sync context.
 * On success: redirects back to profile with ?saved=1 so profile shows toast.
 * Change Password navigates to /profile/change-password.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [firstName,   setFirstName]   = useState(user?.firstName ?? "");
  const [lastName,    setLastName]    = useState(user?.lastName  ?? "");
  const [phone,       setPhone]       = useState(user?.phone     ?? "");
  const [dob,         setDob]         = useState(user?.dateOfBirth ?? "");

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  // Sync if user loads after mount
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName   ?? "");
      setPhone(user.phone         ?? "");
      setDob(user.dateOfBirth     ?? "");
    }
  }, [user?.id]);

  const isDirty =
    firstName.trim()  !== (user?.firstName ?? "") ||
    lastName.trim()   !== (user?.lastName  ?? "") ||
    phone.trim()      !== (user?.phone     ?? "") ||
    dob.trim()        !== (user?.dateOfBirth ?? "");

  const handleSave = async () => {
    if (!firstName.trim()) { setError("First name is required."); return; }
    setError("");
    setSaving(true);
    try {
      await apiService.updateProfile({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        phone:     phone.trim()     || undefined,
        dateOfBirth: dob.trim()     || undefined,
      });
      await refreshUser();
      // Navigate back to profile and pass saved=1 to trigger toast there
      router.replace({ pathname: "/(tabs)/profile" as any, params: { saved: "1" } });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8ff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#101720" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <View style={{ width: 42 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Avatar initials */}
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(firstName[0] ?? user?.firstName?.[0] ?? "?").toUpperCase()}
                {(lastName[0]  ?? user?.lastName?.[0]  ?? "").toUpperCase()}
              </Text>
            </View>
            <Text style={s.avatarHint}>Profile photo update coming soon</Text>
          </View>

          {/* Personal info */}
          <Text style={s.sectionLabel}>Personal Info</Text>
          <View style={s.card}>
            <Field label="First Name" icon="person-outline" value={firstName}
              onChange={setFirstName} placeholder="Enter first name" />
            <Divider />
            <Field label="Last Name" icon="person-outline" value={lastName}
              onChange={setLastName} placeholder="Enter last name" />
            <Divider />
            <Field label="Phone Number" icon="call-outline" value={phone}
              onChange={setPhone} placeholder="+91 XXXXX XXXXX"
              keyboardType="phone-pad" />
            <Divider />
            <Field label="Date of Birth" icon="calendar-outline" value={dob}
              onChange={setDob} placeholder="YYYY-MM-DD" />
          </View>

          {/* Read-only info — Account Type removed */}
          <Text style={s.sectionLabel}>Account Info</Text>
          <View style={s.card}>
            <ReadOnlyField label="Email" icon="mail-outline" value={user?.email ?? "—"} />
          </View>

          {/* Change password link */}
          <TouchableOpacity style={s.changePassRow}
            onPress={() => router.push("/profile/change-password" as any)} activeOpacity={0.8}>
            <View style={s.changePassIcon}>
              <Ionicons name="lock-closed-outline" size={18} color="#0cadab" />
            </View>
            <Text style={s.changePassText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color="#c4c9d0" />
          </TouchableOpacity>

          {/* Error */}
          {!!error && (
            <View style={s.errorCard}>
              <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[s.saveBtn, (!isDirty || saving) && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isDirty || saving}
            activeOpacity={0.88}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={s.saveBtnText}>Save Changes</Text></>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, icon, value, onChange, placeholder, keyboardType }: {
  label: string; icon: string; value: string;
  onChange: (v: string) => void; placeholder?: string; keyboardType?: any;
}) {
  return (
    <View style={f.row}>
      <View style={f.iconBox}>
        <Ionicons name={icon as any} size={17} color="#8696a0" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={f.label}>{label}</Text>
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#c4c9d0"
          keyboardType={keyboardType ?? "default"}
          autoCapitalize={keyboardType === "phone-pad" ? "none" : "words"}
        />
      </View>
    </View>
  );
}

function ReadOnlyField({ label, icon, value }: { label: string; icon: string; value: string }) {
  return (
    <View style={f.row}>
      <View style={f.iconBox}>
        <Ionicons name={icon as any} size={17} color="#8696a0" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={f.label}>{label}</Text>
        <Text style={f.readOnly}>{value}</Text>
      </View>
      <View style={f.lockedBadge}>
        <Ionicons name="lock-closed-outline" size={12} color="#8696a0" />
      </View>
    </View>
  );
}

const Divider = () => <View style={{ height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 16 }} />;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#f4f8ff" },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: "#f4f8ff", borderBottomWidth: 1, borderBottomColor: "#eef0f3" },
  backBtn:        { width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#eef0f3" },
  headerTitle:    { fontSize: 18, fontWeight: "800", color: "#101720", letterSpacing: -0.3 },
  scroll:         { paddingHorizontal: 20, paddingTop: 20 },

  avatarWrap:     { alignItems: "center", marginBottom: 28 },
  avatar:         { width: 88, height: 88, borderRadius: 28, backgroundColor: "#0cadab", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  avatarText:     { fontSize: 32, fontWeight: "800", color: "#fff" },
  avatarHint:     { fontSize: 12, color: "#8696a0", fontWeight: "500" },

  sectionLabel:   { fontSize: 11, fontWeight: "700", color: "#8696a0", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, paddingLeft: 4 },
  card:           { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#eef0f3", overflow: "hidden", marginBottom: 20 },

  changePassRow:  { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#eef0f3" },
  changePassIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#f0fafa", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#d0f0ef" },
  changePassText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#101720" },

  errorCard:      { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#fef2f2", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#fecaca" },
  errorText:      { flex: 1, fontSize: 13, color: "#dc2626", fontWeight: "600", lineHeight: 18 },

  saveBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#101720", borderRadius: 18, paddingVertical: 17, marginBottom: 12 },
  saveBtnDisabled:{ opacity: 0.35 },
  saveBtnText:    { fontSize: 16, fontWeight: "800", color: "#fff" },
});

const f = StyleSheet.create({
  row:        { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  iconBox:    { width: 36, height: 36, borderRadius: 11, backgroundColor: "#f4f8ff", justifyContent: "center", alignItems: "center" },
  label:      { fontSize: 11, fontWeight: "700", color: "#8696a0", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 },
  input:      { fontSize: 15, color: "#101720", fontWeight: "500", paddingVertical: 0 },
  readOnly:   { fontSize: 15, color: "#6b7280", fontWeight: "500" },
  lockedBadge:{ width: 26, height: 26, borderRadius: 8, backgroundColor: "#f4f8ff", justifyContent: "center", alignItems: "center" },
});