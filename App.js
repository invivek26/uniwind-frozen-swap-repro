import "./global.css"

import { useEffect, useState } from "react"
import { AppState, Appearance, Dimensions, Pressable, Text, View } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { GlassView } from "expo-glass-effect"
import { ThemeTransitionPreset, Uniwind, useUniwind } from "uniwind"

const OPTIONS = ["Alpha", "Beta", "Gamma"]

// Mirrors a glass pill: the uniwind Text is mounted inside GlassView's
// native contentView, like a liquid-glass Pressable surface.
const Pills = ({ selected, onSelect }) => (
  <View className="flex-row gap-2">
    {OPTIONS.map((option) => (
      <Pressable key={option} onPress={() => onSelect(option)}>
        <GlassView
          isInteractive={false}
          style={{
            backgroundColor: option === selected ? "#0044ff" : undefined,
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
          tintColor={option === selected ? "#0044ff" : undefined}
        >
          <Text
            className={option === selected ? "text-on-brand" : "text-fg"}
          >
            {option}
          </Text>
        </GlassView>
      </Pressable>
    ))}
  </View>
)

const HomeScreen = ({ navigation }) => {
  // Lazy initializer, not module scope: at module-eval time the native
  // runtime is not bound yet and the write does not reach the engine.
  useState(() => {
    Uniwind.setTheme("dark")
    return true
  })
  const [selected, setSelected] = useState("Alpha")
  const { theme } = useUniwind()

  return (
    <View className="flex-1 items-center justify-center gap-8 bg-background px-6">
      <Text className="text-fg">
        {`theme=${theme} current=${Uniwind.currentTheme} os=${String(Appearance.getColorScheme())}`}
      </Text>
      <Pills selected={selected} onSelect={setSelected} />
      <View className="flex-row gap-2">
        <Pressable
          className="rounded-lg bg-fill px-3 py-2"
          onPress={() => navigation.navigate("Settings")}
        >
          <Text className="text-fg">Open Settings</Text>
        </Pressable>
        <Pressable
          className="rounded-lg bg-fill px-3 py-2"
          onPress={() => navigation.navigate("DataAttrs")}
        >
          <Text className="text-fg">data-*</Text>
        </Pressable>
        <Pressable
          className="rounded-lg bg-fill px-3 py-2"
          onPress={() => navigation.navigate("Viewport")}
        >
          <Text className="text-fg">vw</Text>
        </Pressable>
      </View>
      <Text className="text-center text-fg">
        Repro: boot (dark, Alpha selected) → Open Settings → Light → Back →
        tap Beta. Beta's label paints RN default black ink instead of
        --color-on-brand (#ffffff); its fill is correct. Tap Alpha, then Beta
        again — still black once, then it heals.
      </Text>
    </View>
  )
}

const SettingsScreen = ({ navigation }) => (
  <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
    <View className="flex-row gap-2">
      <Pressable
        className="rounded-lg bg-fill px-3 py-2"
        onPress={() =>
          Uniwind.setTheme("light", {
            preset: ThemeTransitionPreset.CircleTopRight,
          })}
      >
        <Text className="text-fg">Light</Text>
      </Pressable>
      <Pressable
        className="rounded-lg bg-fill px-3 py-2"
        onPress={() =>
          Uniwind.setTheme("dark", {
            preset: ThemeTransitionPreset.CircleTopRight,
          })}
      >
        <Text className="text-fg">Dark</Text>
      </Pressable>
    </View>
    <Pressable
      className="rounded-lg bg-fill px-3 py-2"
      onPress={() => navigation.goBack()}
    >
      <Text className="text-fg">Back</Text>
    </Pressable>
  </View>
)


// Issue: flip mutations are keyed by className string alone — siblings
// sharing one string with different data-* values collapse to one payload.
const DATA_PILL_CLASS = "rounded-full px-4 py-2 bg-fill data-[selected=true]:bg-brand"

const DataAttrsScreen = ({ navigation }) => {
  const [selected, setSelected] = useState("Alpha")

  return (
    <View className="flex-1 items-center justify-center gap-8 bg-background px-6">
      <View className="flex-row gap-2">
        {OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setSelected(option)}
            className={DATA_PILL_CLASS}
            data-selected={option === selected}
          >
            <Text className="text-fg">{option}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        className="rounded-lg bg-fill px-3 py-2"
        onPress={() => navigation.navigate("Settings")}
      >
        <Text className="text-fg">Open Settings</Text>
      </Pressable>
      <Text className="text-center text-fg">
        All three pills share ONE class string; only data-selected differs
        (Alpha true). Open Settings, flip theme, come back: the flip resolves
        the string once with one arbitrary sibling's data value and fans it
        out — either every pill turns brand or the selected one loses it.
      </Text>
    </View>
  )
}


// Issue: iOS getScreenDimensions() returns 0x0 when RCTPresentedViewController
// has no window (scene backgrounded); every vw/vh style collapses until the
// next orientation/trait re-sample. The probe below measures what uniwind
// actually resolved for 100vw, so a 0 in the log is conclusive.
const ViewportScreen = ({ navigation }) => {
  const [measured, setMeasured] = useState(null)
  const [log, setLog] = useState([])

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setLog((prev) => [
        `${new Date().toISOString().slice(11, 19)} ${state} 100vw=${measured ?? "?"} window=${Dimensions.get("window").width}`,
        ...prev,
      ].slice(0, 8))
    })
    return () => sub.remove()
  }, [measured])

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-background px-6">
      <Pressable
        className="rounded-lg bg-fill px-3 py-2"
        onPress={() => Uniwind.setTheme("system")}
      >
        <Text className="text-fg">1. setTheme("system") — clears the window override</Text>
      </Pressable>
      <View
        className="h-2 w-[100vw] bg-brand"
        onLayout={(e) => setMeasured(Math.round(e.nativeEvent.layout.width))}
      />
      <View className="h-12 w-[50vw] items-center justify-center rounded-lg bg-brand">
        <Text className="text-on-brand">w-[50vw]</Text>
      </View>
      <Text className="text-fg">{`100vw measured=${measured} · RN window=${Dimensions.get("window").width}`}</Text>
      {log.map((line) => (
        <Text key={line} className="text-xs text-fg">{line}</Text>
      ))}
      <Text className="text-center text-fg">
        2. Press Home. 3. While backgrounded: xcrun simctl ui booted appearance
        dark, then light (or rotate the device). 4. Return. Expected: the bar
        stays full width. Bug: the bar and the 50vw box collapse to 0 and the
        log shows 100vw=0 while RN window width is unchanged. Rotating once
        in the foreground heals it.
      </Text>
      <Pressable
        className="rounded-lg bg-fill px-3 py-2"
        onPress={() => navigation.goBack()}
      >
        <Text className="text-fg">Back</Text>
      </Pressable>
    </View>
  )
}

const Stack = createNativeStackNavigator()

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ freezeOnBlur: true, headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="DataAttrs" component={DataAttrsScreen} />
        <Stack.Screen name="Viewport" component={ViewportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
