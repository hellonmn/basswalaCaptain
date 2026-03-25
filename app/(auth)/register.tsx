import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
};

type Errors = Partial<Record<keyof FormData, string>>;

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  {
    heading: "What's your\nname?",
    fields: ['firstName', 'lastName'] as (keyof FormData)[],
  },
  {
    heading: "How can we\nreach you?",
    fields: ['email', 'phone'] as (keyof FormData)[],
  },
  {
    heading: "Create a\npassword",
    fields: ['password', 'confirmPassword'] as (keyof FormData)[],
  },
  {
    heading: "Almost\ndone!",
    fields: ['dateOfBirth'] as (keyof FormData)[],
  },
];

const FIELD_CONFIG: Record<keyof FormData, {
  label: string;
  icon: string;
  placeholder: string;
  keyboard?: 'default' | 'email-address' | 'phone-pad' | 'numbers-and-punctuation';
  secure?: boolean;
  autoCapitalize?: 'none' | 'words';
  optional?: boolean;
}> = {
  firstName:       { label: 'First Name',              icon: 'person-outline',   placeholder: 'First name',           autoCapitalize: 'words' },
  lastName:        { label: 'Last Name',               icon: 'person-outline',   placeholder: 'Last name',            autoCapitalize: 'words' },
  email:           { label: 'E-mail',                  icon: 'mail-outline',     placeholder: 'hello@basswala.in',    keyboard: 'email-address', autoCapitalize: 'none' },
  phone:           { label: 'Phone',                   icon: 'call-outline',     placeholder: '+91 98765 43210',      keyboard: 'phone-pad' },
  password:        { label: 'Password',                icon: 'lock-closed-outline', placeholder: '············',      secure: true },
  confirmPassword: { label: 'Confirm Password',        icon: 'lock-closed-outline', placeholder: '············',      secure: true },
  dateOfBirth:     { label: 'Date of Birth (optional)',icon: 'calendar-outline', placeholder: 'YYYY-MM-DD',           keyboard: 'numbers-and-punctuation', optional: true },
};

function validate(step: number, formData: FormData): Errors {
  const errors: Errors = {};
  if (step === 0) {
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim())  errors.lastName  = 'Last name is required';
  } else if (step === 1) {
    if (!formData.email.trim())             errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Enter a valid email';
    if (!formData.phone.trim())             errors.phone = 'Phone is required';
    else if (formData.phone.replace(/\D/g, '').length < 9) errors.phone = 'Phone seems too short';
  } else if (step === 2) {
    if (!formData.password)                          errors.password = 'Password is required';
    else if (formData.password.length < 6)           errors.password = 'Min 6 characters';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const { register } = useAuth();
  const scrollRef    = useRef<ScrollView>(null);
  const slideAnim    = useRef(new Animated.Value(0)).current;
  const fadeAnim     = useRef(new Animated.Value(1)).current;

  const [step, setStep]         = useState(0);
  const [formData, setFormData] = useState<FormData>({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '', dateOfBirth: '',
  });
  const [errors, setErrors]           = useState<Errors>({});
  const [loading, setLoading]         = useState(false);
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  const animateStep = (direction: 1 | -1, callback: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -W * direction, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(W * direction);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () => {
    const errs = validate(step, formData);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setGeneralError('');
    if (step < STEPS.length - 1) {
      animateStep(1, () => setStep(s => s + 1));
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setErrors({});
      animateStep(-1, () => setStep(s => s - 1));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await register({
        firstName:   formData.firstName.trim(),
        lastName:    formData.lastName.trim(),
        email:       formData.email.trim().toLowerCase(),
        phone:       formData.phone.trim(),
        password:    formData.password,
        dateOfBirth: formData.dateOfBirth.trim() || undefined,
      });
    } catch (e: any) {
      setGeneralError(e.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof FormData) => (val: string) => {
    setFormData(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  };

  const progress = (step + 1) / STEPS.length;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={s.safe}>

        {/* Gradient background */}
        <LinearGradient
          colors={['#f0fafa', '#f7f4ff', '#fff8f2', '#ffffff']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 20}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ── Progress dots ── */}
            <View style={s.dotsRow}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[s.dot, i === step && s.dotActive, i < step && s.dotDone]}
                />
              ))}
            </View>

            {/* ── Animated content ── */}
            <Animated.View style={{ transform: [{ translateX: slideAnim }], opacity: fadeAnim }}>

              {/* Heading */}
              <View style={s.headingWrap}>
                <Text style={s.heading}>{STEPS[step].heading}</Text>
              </View>

              {/* General error */}
              {generalError ? (
                <View style={s.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                  <Text style={s.errorBannerText}>{generalError}</Text>
                </View>
              ) : null}

              {/* Fields for this step */}
              <View style={s.form}>
                {STEPS[step].fields.map(field => {
                  const cfg = FIELD_CONFIG[field];
                  return (
                    <FieldPill
                      key={field}
                      label={cfg.label}
                      icon={cfg.icon}
                      value={formData[field]}
                      onChange={set(field)}
                      placeholder={cfg.placeholder}
                      keyboard={cfg.keyboard}
                      secure={cfg.secure}
                      autoCapitalize={cfg.autoCapitalize}
                      error={errors[field]}
                    />
                  );
                })}
              </View>

            </Animated.View>

            {/* ── Buttons ── */}
            <View style={s.btnRow}>
              {step > 0 ? (
                <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
                  <Ionicons name="arrow-back" size={18} color="#0cadab" />
                  <Text style={s.backBtnText}>Back</Text>
                </TouchableOpacity>
              ) : <View />}

              <TouchableOpacity
                style={[s.nextBtn, loading && { opacity: 0.65 }]}
                onPress={handleNext}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.nextBtnText}>
                      {step === STEPS.length - 1 ? 'Create Account' : 'Continue'}
                    </Text>
                }
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }} />
          </ScrollView>

          {/* ── Footer ── */}
          <View style={s.footer}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={s.footerText}>
                  Already have an account?{'  '}
                  <Text style={s.footerLink}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

// ─── FieldPill ────────────────────────────────────────────────────────────────
function FieldPill({
  label, icon, value, onChange, placeholder,
  keyboard = 'default', secure = false,
  autoCapitalize = 'sentences', error,
}: {
  label: string; icon: string; value: string;
  onChange: (t: string) => void; placeholder: string;
  keyboard?: 'default' | 'email-address' | 'phone-pad' | 'numbers-and-punctuation';
  secure?: boolean; autoCapitalize?: 'none' | 'words' | 'sentences';
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={s.fieldGroup}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.pill, error ? s.pillErr : null]}>
        <Ionicons name={icon as any} size={18} color="#C0C0C0" style={s.fieldIcon} />
        <TextInput
          style={[s.pillInput, { flex: 1 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#C8C8C8"
          keyboardType={keyboard}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secure && !show}
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setShow(v => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={show ? 'eye-outline' : 'eye-off-outline'} size={18} color="#C0C0C0" />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={s.fieldErr}>{error}</Text> : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#f0fafa' },
  scroll: { flexGrow: 1, paddingBottom: 16 },

  // Progress dots
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 24, marginBottom: 8 },
  dot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DEDEDE' },
  dotActive:{ width: 20, height: 6, borderRadius: 3, backgroundColor: '#0cadab' },
  dotDone: { backgroundColor: '#a8e6e5' },

  // Heading — matches LoginScreen
  headingWrap: { paddingHorizontal: 28, marginBottom: 32, marginTop: 16 },
  heading: { fontSize: 40, fontWeight: '400', color: '#111111', letterSpacing: -0.8, lineHeight: 46 },

  // Error banner — identical to LoginScreen
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginHorizontal: 28, marginBottom: 16 },
  errorBannerText: { flex: 1, color: '#dc2626', fontSize: 13 },

  // Form
  form:       { paddingHorizontal: 28 },
  fieldGroup: { marginBottom: 20 },

  // Label — identical to LoginScreen
  label: { fontSize: 13, fontWeight: '500', color: '#AAAAAA', marginBottom: 8, marginLeft: 2 },

  // Pill — identical to LoginScreen
  pill:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#EBEBEB', borderRadius: 18, paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#ffffff' },
  pillErr:   { borderColor: '#ef4444' },
  pillInput: { fontSize: 16, color: '#111111', fontWeight: '400', padding: 0, margin: 0 },
  fieldIcon: { marginRight: 10 },
  fieldErr:  { fontSize: 12, color: '#ef4444', marginTop: 6, marginLeft: 4 },

  // Buttons row
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, marginTop: 12 },

  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4 },
  backBtnText: { color: '#0cadab', fontSize: 15, fontWeight: '500' },

  // Next button — matches LoginScreen loginBtn
  nextBtn:     { flex: 1, marginLeft: 16, backgroundColor: '#111111', borderRadius: 20, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 28, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  nextBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700', letterSpacing: 0.1 },

  // Footer — identical to LoginScreen
  footer:     { backgroundColor: 'transparent', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 32 : 20, paddingTop: 14 },
  footerText: { fontSize: 14, color: '#AAAAAA' },
  footerLink: { color: '#111111', fontWeight: '700', textDecorationLine: 'underline' },
});