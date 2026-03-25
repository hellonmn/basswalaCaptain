import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StatusBar, StyleSheet, Text, View } from 'react-native';

const { width: W } = Dimensions.get('window');

export default function SplashScreen() {
  const router   = useRouter();
  const opacity  = useRef(new Animated.Value(0)).current;
  const scale    = useRef(new Animated.Value(0.92)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade + subtle scale in
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale,   { toValue: 1, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();

    // Tagline fades in slightly after
    setTimeout(() => {
      Animated.timing(tagOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 500);

    // Fade out and navigate
    setTimeout(() => {
      Animated.timing(exitOpacity, { toValue: 0, duration: 500, easing: Easing.in(Easing.cubic), useNativeDriver: true })
        .start(() => router.replace('/(auth)/login'));
    }, 2800);
  }, []);

  return (
    <Animated.View style={[s.root, { opacity: exitOpacity }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#f0fafa', '#f7f4ff', '#fff8f2', '#ffffff']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[s.centre, { opacity, transform: [{ scale }] }]}>

        {/* Logo mark */}
        <View style={s.logoShadow}>
          <View style={s.logoClip}>
            <LinearGradient
              colors={['#0ee7e5', '#0cadab', '#057e7d']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.logoGrad}
            >
              <View style={s.ring}>
                <Text style={s.letter}>B</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Name */}
        <Text style={s.name}>basswala</Text>

        {/* Tagline */}
        <Animated.Text style={[s.tag, { opacity: tagOpacity }]}>
          rent · play · perform
        </Animated.Text>

      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#f0fafa' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0 },

  logoShadow: {
    width: 88, height: 88, borderRadius: 22,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
    elevation: 6, marginBottom: 28,
  },
  logoClip: { width: 88, height: 88, borderRadius: 22, overflow: 'hidden' },
  logoGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  letter: { fontSize: 24, fontWeight: '800', color: '#fff' },

  name: {
    fontSize: 32, fontWeight: '300', color: '#111',
    letterSpacing: 5, marginBottom: 10,
  },
  tag: {
    fontSize: 11, fontWeight: '500', color: '#8696a0',
    letterSpacing: 2.5, textTransform: 'uppercase',
  },
});