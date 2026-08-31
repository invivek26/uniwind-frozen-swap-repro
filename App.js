import "./global.css"

import { useState } from "react"
import { Appearance, Pressable, Text, View } from "react-native"
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
      <Pressable
        className="rounded-lg bg-fill px-3 py-2"
        onPress={() => navigation.navigate("Settings")}
      >
        <Text className="text-fg">Open Settings</Text>
      </Pressable>
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

const Stack = createNativeStackNavigator()

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ freezeOnBlur: true, headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
