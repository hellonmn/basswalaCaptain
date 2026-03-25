/**
 * app/profile/change-password.tsx — Change Password screen
 *
 * Fields: Current Password, New Password, Confirm New Password
 * Validates: min 8 chars, passwords match
 * Calls PUT /users/change-password via apiService.changePassword()
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { apiService } from "../../services/api";

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [current,  setCurrent]  = useState("");
  const [newPass,  setNewPass]  = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showCurr, setShowCurr] = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  // Password strength
  const strength = (p: string) => {
    let score = 0;
    if (p.length >= 8)         score++;
    if (/[A-Z]/.test(p))       score++;
    if (/[0-9]/.test(p))       score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score; // 0–4
  };
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];
  const newStrength = strength(newPass);

  const handleSave = async () => {
    setError("");
    if (!current.trim())          { setError("Enter your current password."); return; }
    if (newPass.length < 8)       { setError("New password must be at least 8 characters."); return; }
    if (newPass !== confirm)       { setError("Passwords do not match."); return; }
    if (current === newPass)       { setError("New password must differ from current password."); return; }

    setSaving(true);
    try {
      await apiService.changePassword({ currentPassword: current, newPassword: newPass });
      setSuccess(true);
      setCurrent(""); setNewPass(""); setConfirm("");
      setTimeout(() => router.back(), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to change password. Check your current password.");
    } finally {
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
        <Text style={s.headerTitle}>Change Password</Text>
        <View style={{ width: 42 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Info note */}
          <View style={s.infoCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#0cadab" />
            <Text style={s.infoText}>Choose a strong password with at least 8 characters including numbers and symbols.</Text>
          </View>

          {/* Fields */}
          <Text style={s.sectionLabel}>Security</Text>
          <View style={s.card}>

            {/* Current */}
            <View style={s.fieldRow}>
              <View style={s.fieldIcon}><Ionicons name="lock-closed-outline" size={17} color="#8696a0" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Current Password</Text>
                <TextInput
                  style={s.input} value={current} onChangeText={setCurrent}
                  placeholder="Enter current password" placeholderTextColor="#c4c9d0"
                  secureTextEntry={!showCurr} autoCapitalize="none"
                />
              </View>
              <TouchableOpacity onPress={() => setShowCurr(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showCurr ? "eye-off-outline" : "eye-outline"} size={20} color="#8696a0" />
              </TouchableOpacity>
            </View>

            <View style={s.rowDivider} />

            {/* New */}
            <View style={s.fieldRow}>
              <View style={s.fieldIcon}><Ionicons name="key-outline" size={17} color="#8696a0" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>New Password</Text>
                <TextInput
                  style={s.input} value={newPass} onChangeText={setNewPass}
                  placeholder="Min. 8 characters" placeholderTextColor="#c4c9d0"
                  secureTextEntry={!showNew} autoCapitalize="none"
                />
              </View>
              <TouchableOpacity onPress={() => setShowNew(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="#8696a0" />
              </TouchableOpacity>
            </View>

            {/* Strength bar */}
            {newPass.length > 0 && (
              <View style={s.strengthWrap}>
                <View style={s.strengthBars}>
                  {[1,2,3,4].map(i => (
                    <View key={i} style={[s.strengthBar, { backgroundColor: i <= newStrength ? strengthColor[newStrength] : "#e5e7eb" }]} />
                  ))}
                </View>
                <Text style={[s.strengthLabel, { color: strengthColor[newStrength] }]}>
                  {strengthLabel[newStrength]}
                </Text>
              </View>
            )}

            <View style={s.rowDivider} />

            {/* Confirm */}
            <View style={s.fieldRow}>
              <View style={s.fieldIcon}><Ionicons name="checkmark-circle-outline" size={17} color="#8696a0" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Confirm New Password</Text>
                <TextInput
                  style={s.input} value={confirm} onChangeText={setConfirm}
                  placeholder="Re-enter new password" placeholderTextColor="#c4c9d0"
                  secureTextEntry={!showConf} autoCapitalize="none"
                />
              </View>
              <TouchableOpacity onPress={() => setShowConf(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showConf ? "eye-off-outline" : "eye-outline"} size={20} color="#8696a0" />
              </TouchableOpacity>
            </View>

            {/* Match indicator */}
            {confirm.length > 0 && (
              <View style={[s.matchRow, { backgroundColor: newPass === confirm ? "#f0fdf4" : "#fef2f2" }]}>
                <Ionicons
                  name={newPass === confirm ? "checkmark-circle" : "close-circle"}
                  size={14} color={newPass === confirm ? "#16a34a" : "#dc2626"}
                />
                <Text style={[s.matchText, { color: newPass === confirm ? "#16a34a" : "#dc2626" }]}>
                  {newPass === confirm ? "Passwords match" : "Passwords do not match"}
                </Text>
              </View>
            )}
          </View>

          {/* Requirements */}
          <View style={s.reqCard}>
            <Text style={s.reqTitle}>Password requirements</Text>
            {[
              { text: "At least 8 characters",          met: newPass.length >= 8 },
              { text: "One uppercase letter (A–Z)",      met: /[A-Z]/.test(newPass) },
              { text: "One number (0–9)",                met: /[0-9]/.test(newPass) },
              { text: "One special character (!@#...)", met: /[^A-Za-z0-9]/.test(newPass) },
            ].map(r => (
              <View key={r.text} style={s.reqRow}>
                <Ionicons
                  name={r.met ? "checkmark-circle" : "ellipse-outline"}
                  size={15}
                  color={newPass.length === 0 ? "#d1d5db" : r.met ? "#22c55e" : "#9ca3af"}
                />
                <Text style={[s.reqText, { color: newPass.length === 0 ? "#9ca3af" : r.met ? "#22c55e" : "#6b7280" }]}>
                  {r.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Error */}
          {!!error && (
            <View style={s.errorCard}>
              <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Success */}
          {success && (
            <View style={s.successCard}>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              <Text style={s.successText}>Password changed successfully! Returning…</Text>
            </View>
          )}

          {/* Save */}
          <TouchableOpacity
            style={[s.saveBtn, (saving || !current || !newPass || !confirm) && s.saveBtnOff]}
            onPress={handleSave}
            disabled={saving || !current || !newPass || !confirm}
            activeOpacity={0.88}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="lock-closed-outline" size={20} color="#fff" />
                  <Text style={s.saveBtnText}>Update Password</Text></>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#f4f8ff" },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: "#f4f8ff", borderBottomWidth: 1, borderBottomColor: "#eef0f3" },
  backBtn:       { width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#eef0f3" },
  headerTitle:   { fontSize: 18, fontWeight: "800", color: "#101720", letterSpacing: -0.3 },
  scroll:        { paddingHorizontal: 20, paddingTop: 20 },

  infoCard:      { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#f0fafa", borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: "#d0f0ef" },
  infoText:      { flex: 1, fontSize: 13, color: "#374151", lineHeight: 19, fontWeight: "500" },

  sectionLabel:  { fontSize: 11, fontWeight: "700", color: "#8696a0", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, paddingLeft: 4 },
  card:          { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: "#eef0f3", overflow: "hidden", marginBottom: 16 },
  fieldRow:      { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  fieldIcon:     { width: 36, height: 36, borderRadius: 11, backgroundColor: "#f4f8ff", justifyContent: "center", alignItems: "center" },
  fieldLabel:    { fontSize: 11, fontWeight: "700", color: "#8696a0", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 },
  input:         { fontSize: 15, color: "#101720", fontWeight: "500", paddingVertical: 0 },
  eyeBtn:        { padding: 4 },
  rowDivider:    { height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 16 },

  strengthWrap:  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  strengthBars:  { flex: 1, flexDirection: "row", gap: 4 },
  strengthBar:   { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: "700", minWidth: 48, textAlign: "right" },

  matchRow:      { flexDirection: "row", alignItems: "center", gap: 6, margin: 12, borderRadius: 10, padding: 10 },
  matchText:     { fontSize: 12, fontWeight: "600" },

  reqCard:       { backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#eef0f3", gap: 10 },
  reqTitle:      { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 4 },
  reqRow:        { flexDirection: "row", alignItems: "center", gap: 8 },
  reqText:       { fontSize: 13, fontWeight: "500" },

  errorCard:     { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#fef2f2", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#fecaca" },
  errorText:     { flex: 1, fontSize: 13, color: "#dc2626", fontWeight: "600", lineHeight: 18 },
  successCard:   { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f0fdf4", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#bbf7d0" },
  successText:   { flex: 1, fontSize: 13, color: "#16a34a", fontWeight: "600" },

  saveBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#101720", borderRadius: 18, paddingVertical: 17 },
  saveBtnOff:    { opacity: 0.35 },
  saveBtnText:   { fontSize: 16, fontWeight: "800", color: "#fff" },
});