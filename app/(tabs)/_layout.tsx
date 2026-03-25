import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TABS = [
  { name: "index",     label: "Home",      icon: "home",              iconOutline: "home-outline" },
  { name: "bookings",  label: "Bookings",  icon: "calendar",          iconOutline: "calendar-outline" },
  { name: "djs",       label: "DJs",       icon: "musical-notes",     iconOutline: "musical-notes-outline" },
  { name: "equipment", label: "Gear",      icon: "hardware-chip",     iconOutline: "hardware-chip-outline" },
  { name: "profile",   label: "Profile",   icon: "person",            iconOutline: "person-outline" },
];

const BAR_H = 64;
const BAR_SIDE_PAD = 16;
const BAR_WIDTH = SCREEN_WIDTH - BAR_SIDE_PAD * 2;

function TabButton({
  tab,
  isFocused,
  onPress,
  onLongPress,
}: {
  tab: (typeof TABS)[number];
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const progress = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 14,
    }).start();
  }, [isFocused]);

  const pillBg = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(16,23,32,0)", "rgba(16,23,32,1)"],
  });
  const labelMaxW = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 68] });
  const labelOp = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const pillScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.tabBtn} android_ripple={null}>
      <Animated.View style={[styles.pill, { backgroundColor: pillBg, transform: [{ scale: pillScale }] }]}>
        <Ionicons
          name={(isFocused ? tab.icon : tab.iconOutline) as any}
          size={20}
          color={isFocused ? "#fff" : "#8696a0"}
        />
        <Animated.View style={{ maxWidth: labelMaxW, overflow: "hidden" }}>
          <Animated.Text style={[styles.tabLabel, { opacity: labelOp }]} numberOfLines={1}>
            {" "}{tab.label}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: any) {
  return (
    <View style={styles.barWrapper} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const tab = TABS.find(t => t.name === route.name) ?? TABS[0];
          return (
            <TabButton
              key={route.key}
              tab={tab}
              isFocused={isFocused}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={props => <CustomTabBar {...props} />}>
      {TABS.map(tab => <Tabs.Screen key={tab.name} name={tab.name} />)}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barWrapper: {
    position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center",
    paddingBottom: Platform.select({ ios: 28, android: 14, default: 14 }),
    paddingHorizontal: BAR_SIDE_PAD,
  },
  bar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-evenly",
    backgroundColor: "#ffffff", borderRadius: 28, height: BAR_H, width: BAR_WIDTH,
    paddingHorizontal: 8,
    shadowColor: "#101720", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09, shadowRadius: 20, elevation: 10,
    borderWidth: 1, borderColor: "#eef0f3",
  },
  tabBtn: { flex: 1, alignItems: "center", justifyContent: "center", height: BAR_H },
  pill: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20,
  },
  tabLabel: { fontSize: 12, fontWeight: "700", color: "#ffffff", letterSpacing: -0.2, flexShrink: 0 },
});