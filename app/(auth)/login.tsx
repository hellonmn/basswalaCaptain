/**
 * app/(auth)/login.tsx — OTP-first login
 *
 * Flow:
 *   Step 0  Phone entry  → loginWithOTP(phone)  → Firebase sends SMS
 *   Step 1  OTP entry    → verifyOTP(otp)        → app JWT saved
 *
 * Falling back to email+password is available via "Use email instead" link
 * (for DJs / admins who don't use OTP).
 *
 * Design: minimal dark-card aesthetic, matches existing Basswala palette.
 */

import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
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

const { width: SCREEN_W } = Dimensions.get("window");
const OTP_LENGTH = 6;


// ─── Phone step ───────────────────────────────────────────────────────────────

function PhoneStep({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (phone: string) => void;
  loading: boolean;
  error: string;
}) {
  const [phone, setPhone] = useState("");

  const formatted = phone.replace(/\D/g, "").slice(0, 10);
  const isValid   = formatted.length === 10;

  return (
    <View style={s.stepWrap}>
      <Text style={s.stepTitle}>Enter your{"\n"}phone number</Text>
      <Text style={s.stepSub}>We'll send you a one-time verification code</Text>

      {/* Phone input */}
      <View style={[s.phonePill, error ? s.pillErr : null]}>
        <View style={s.flagBox}>
          <Text style={s.flag}>🇮🇳</Text>
          <Text style={s.dialCode}>+91</Text>
          <View style={s.dividerV} />
        </View>
        <TextInput
          style={s.phoneInput}
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))}
          placeholder="98765 43210"
          placeholderTextColor="#C8C8C8"
          keyboardType="phone-pad"
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={() => isValid && onSubmit(formatted)}
        />
        {isValid && (
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
        )}
      </View>

      {error ? (
        <View style={s.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={s.notice}>
        By continuing you agree to receive an SMS. Standard rates may apply.
      </Text>

      <TouchableOpacity
        style={[s.cta, (!isValid || loading) && s.ctaOff]}
        onPress={() => onSubmit(formatted)}
        disabled={!isValid || loading}
        activeOpacity={0.88}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={s.ctaText}>Send OTP</Text>
            <View style={s.ctaArrow}>
              <Ionicons name="arrow-forward" size={18} color="#101720" />
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── OTP step ─────────────────────────────────────────────────────────────────

function OTPStep({
  phone,
  onVerify,
  onResend,
  onBack,
  loading,
  error,
}: {
  phone: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onBack: () => void;
  loading: boolean;
  error: string;
}) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const otp = digits.join("");

  const handleChange = (val: string, idx: number) => {
    const char = val.replace(/\D/g, "").slice(-1); // keep last digit only
    const next  = [...digits];
    next[idx] = char;
    setDigits(next);

    if (char && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }

    const full = next.join("");
    if (full.length === OTP_LENGTH && !next.includes("")) {
      onVerify(full);
    }
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
      const next = [...digits];
      next[idx - 1] = "";
      setDigits(next);
    }
  };

  const handleResend = () => {
    setDigits(Array(OTP_LENGTH).fill(""));
    setResendTimer(30);
    onResend();
    inputRefs.current[0]?.focus();
  };

  return (
    <View style={s.stepWrap}>
      <TouchableOpacity style={s.backRow} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={20} color="#0cadab" />
        <Text style={s.backText}>Change number</Text>
      </TouchableOpacity>

      <Text style={s.stepTitle}>Verify your{"\n"}number</Text>
      <Text style={s.stepSub}>
        We sent a 6-digit code to{"\n"}
        <Text style={{ fontWeight: "700", color: "#101720" }}>+91 {phone}</Text>
      </Text>

      {/* OTP boxes */}
      <View style={s.otpRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => { inputRefs.current[i] = r; }}
            style={[
              s.otpBox,
              d ? s.otpBoxFilled : null,
              error ? s.otpBoxErr : null,
            ]}
            value={d}
            onChangeText={(v) => handleChange(v, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            caretHidden
          />
        ))}
      </View>

      {error ? (
        <View style={s.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Resend */}
      <View style={s.resendRow}>
        {resendTimer > 0 ? (
          <Text style={s.resendCountdown}>
            Resend code in{" "}
            <Text style={{ color: "#0cadab", fontWeight: "700" }}>
              {resendTimer}s
            </Text>
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResend} activeOpacity={0.8}>
            <Text style={s.resendLink}>Resend OTP</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[s.cta, (otp.length < OTP_LENGTH || loading) && s.ctaOff]}
        onPress={() => onVerify(otp)}
        disabled={otp.length < OTP_LENGTH || loading}
        activeOpacity={0.88}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={s.ctaText}>Verify & Sign In</Text>
            <View style={s.ctaArrow}>
              <Ionicons name="checkmark" size={18} color="#101720" />
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Password fallback (DJs / admins) ─────────────────────────────────────────

function PasswordStep({
  onSubmit,
  loading,
  error,
  onBack,
}: {
  onSubmit: (id: string, pw: string) => void;
  loading: boolean;
  error: string;
  onBack: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [showPw,     setShowPw]     = useState(false);

  return (
    <View style={s.stepWrap}>
      <TouchableOpacity style={s.backRow} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={20} color="#0cadab" />
        <Text style={s.backText}>Use OTP instead</Text>
      </TouchableOpacity>
{/* 
      <Text style={s.stepTitle}>Sign in with{"\n"}password</Text>
      <Text style={s.stepSub}>For DJs and admins only</Text> */}

      <View style={[s.phonePill, error ? s.pillErr : null]}>
        <Ionicons name="mail-outline" size={18} color="#C0C0C0" style={{ marginRight: 8 }} />
        <TextInput
          style={[s.phoneInput]}
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Email or phone"
          placeholderTextColor="#C8C8C8"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={[s.phonePill, { marginTop: 12 }, error ? s.pillErr : null]}>
        <Ionicons name="lock-closed-outline" size={18} color="#C0C0C0" style={{ marginRight: 8 }} />
        <TextInput
          style={[s.phoneInput, { flex: 1 }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#C8C8C8"
          secureTextEntry={!showPw}
        />
        <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={showPw ? "eye-outline" : "eye-off-outline"} size={18} color="#C0C0C0" />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={s.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[s.cta, (!identifier || !password || loading) && s.ctaOff]}
        onPress={() => onSubmit(identifier.trim(), password)}
        disabled={!identifier || !password || loading}
        activeOpacity={0.88}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={s.ctaText}>Sign In</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type Mode = "phone" | "otp" | "password";

export default function LoginScreen() {
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const { loginWithOTP, verifyOTP, resendOTP, login } = useAuth();
  const router = useRouter();

  const [mode,    setMode]    = useState<Mode>("phone");
  const [phone,   setPhone]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Slide animation between modes
  const slideX  = useRef(new Animated.Value(0)).current;
  const fadeV   = useRef(new Animated.Value(1)).current;

  const transition = (newMode: Mode) => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: -SCREEN_W * 0.15, duration: 180, useNativeDriver: true }),
      Animated.timing(fadeV,  { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setMode(newMode);
      slideX.setValue(SCREEN_W * 0.15);
      Animated.parallel([
        Animated.timing(slideX, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeV,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

 const handleSendOTP = async (ph: string) => {
  setError("");
  setLoading(true);
  try {
    const result = await loginWithOTP(ph);
    setConfirmationResult(result);
    setPhone(ph);
    transition("otp");
  } catch (e: any) {
    setError(e.message || "Could not send OTP. Check the number and try again.");
  } finally {
    setLoading(false);
  }
};

const handleVerifyOTP = async (otp: string) => {
  setError("");
  setLoading(true);
  try {
    if (!confirmationResult) {
      throw new Error("Session expired. Please go back and request OTP again.");
    }
    await verifyOTP(otp, confirmationResult);
    // Navigation will be handled by AuthContext + your protected route logic
  } catch (e: any) {
    setError(e.message || "Invalid OTP. Please try again.");
  } finally {
    setLoading(false);
  }
};

const handleResend = async () => {
  setError("");
  try {
    const result = await resendOTP(phone);
    setConfirmationResult(result);        // update verificationId
  } catch (e: any) {
    setError(e.message || "Could not resend OTP.");
  }
};

  const handlePasswordLogin = async (id: string, pw: string) => {
    setError("");
    setLoading(true);
    try {
      await login(id, pw);
    } catch (e: any) {
      setError(e.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={s.safe}>
        {/* Ambient gradient */}
        <LinearGradient
          colors={["#f0fafa", "#f7f4ff", "#fff8f2", "#ffffff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand mark */}
            <View style={s.brand}>
              <LinearGradient colors={["#0ee7e5", "#0cadab", "#057e7d"]} style={s.brandGrad}>
                <View style={s.brandRing}>
                  <Text style={s.brandLetter}>B</Text>
                </View>
              </LinearGradient>
              <Text style={s.brandName}>basswala</Text>
            </View>

            {/* Step content — animated */}
            <Animated.View
              style={{
                transform: [{ translateX: slideX }],
                opacity: fadeV,
              }}
            >
              {mode === "phone" && (
                <PhoneStep
                  onSubmit={handleSendOTP}
                  loading={loading}
                  error={error}
                />
              )}
              {mode === "otp" && (
                <OTPStep
                  phone={phone}
                  onVerify={handleVerifyOTP}
                  onResend={handleResend}
                  onBack={() => { setError(""); transition("phone"); }}
                  loading={loading}
                  error={error}
                />
              )}
              {mode === "password" && (
                <PasswordStep
                  onSubmit={handlePasswordLogin}
                  loading={loading}
                  error={error}
                  onBack={() => { setError(""); transition("phone"); }}
                />
              )}
            </Animated.View>

            <View style={{ flex: 1 }} />
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            {mode === "phone" && (
              <TouchableOpacity
                onPress={() => { setError(""); transition("password"); }}
                activeOpacity={0.8}
              >
                <Text style={s.footerAlt}>
                  DJ / Admin?{" "}
                  <Text style={s.footerLink}>Sign in with password</Text>
                </Text>
              </TouchableOpacity>
            )}
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity style={{ marginTop: 8 }}>
                <Text style={s.footerText}>
                  New to Basswala?{"  "}
                  <Text style={s.footerLink}>Create account</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: "#f0fafa" },
  scroll: { flexGrow: 1, paddingBottom: 16 },

  // Brand
  brand:      { alignItems: "center", paddingTop: 40, paddingBottom: 32, gap: 10 },
  brandGrad:  { width: 72, height: 72, borderRadius: 22, justifyContent: "center", alignItems: "center", shadowColor: "#0cadab", shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  brandRing:  { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  brandLetter:{ fontSize: 22, fontWeight: "800", color: "#fff" },
  brandName:  { fontSize: 22, fontWeight: "300", color: "#111", letterSpacing: 5 },

  // Step wrapper
  stepWrap:   { paddingHorizontal: 28 },
  backRow:    { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
  backText:   { fontSize: 14, color: "#0cadab", fontWeight: "600" },
  stepTitle:  { fontSize: 38, fontWeight: "400", color: "#111", letterSpacing: -0.8, lineHeight: 45, marginBottom: 8 },
  stepSub:    { fontSize: 14, color: "#AAAAAA", fontWeight: "500", marginBottom: 30, lineHeight: 20 },

  // Phone input
  phonePill:  { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#EBEBEB", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff" },
  pillErr:    { borderColor: "#ef4444" },
  flagBox:    { flexDirection: "row", alignItems: "center", gap: 6, marginRight: 4 },
  flag:       { fontSize: 18 },
  dialCode:   { fontSize: 15, fontWeight: "600", color: "#101720" },
  dividerV:   { width: 1, height: 20, backgroundColor: "#EBEBEB", marginLeft: 8, marginRight: 4 },
  phoneInput: { flex: 1, fontSize: 16, color: "#111", fontWeight: "400", padding: 0 },

  // Error
  errorRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  errorText:  { fontSize: 13, color: "#ef4444", fontWeight: "500" },

  // Notice
  notice: { fontSize: 12, color: "#AAAAAA", lineHeight: 17, marginTop: 12, marginBottom: 8 },

  // CTA
  cta:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#111", borderRadius: 20, paddingVertical: 17, paddingHorizontal: 22, marginTop: 28, shadowColor: "#000", shadowOpacity: 0.10, shadowRadius: 28, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  ctaOff:     { opacity: 0.35 },
  ctaText:    { fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: 0.1 },
  ctaArrow:   { width: 36, height: 36, borderRadius: 12, backgroundColor: "#0cadab", justifyContent: "center", alignItems: "center" },

  // OTP boxes
  otpRow:     { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  otpBox:     { flex: 1, aspectRatio: 1, maxWidth: 48, borderWidth: 1.5, borderColor: "#EBEBEB", borderRadius: 14, textAlign: "center", fontSize: 22, fontWeight: "800", color: "#111", backgroundColor: "#fff" },
  otpBoxFilled:{ borderColor: "#101720", backgroundColor: "#fafafa" },
  otpBoxErr:  { borderColor: "#ef4444" },

  // Resend
  resendRow:       { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  resendCountdown: { fontSize: 13, color: "#AAAAAA", fontWeight: "500" },
  resendLink:      { fontSize: 14, color: "#0cadab", fontWeight: "700" },

  // Footer
  footer:     { backgroundColor: "transparent", alignItems: "center", paddingBottom: Platform.OS === "ios" ? 32 : 20, paddingTop: 14, gap: 4 },
  footerText: { fontSize: 14, color: "#AAAAAA" },
  footerAlt:  { fontSize: 14, color: "#AAAAAA" },
  footerLink: { color: "#111", fontWeight: "700", textDecorationLine: "underline" },
});