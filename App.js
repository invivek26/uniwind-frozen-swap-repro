import "./global.css"

import { useEffect, useState } from "react"
import { Linking, Pressable, Text, View } from "react-native"
import { Freeze } from "react-freeze"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { ThemeTransitionPreset, Uniwind, useUniwind } from "uniwind"
import { enableDiagnostics } from "uniwind/diagnostics"
import { UniwindDiagnostics } from "uniwind/src/specs"

// Arms ShadowRegistry's diagnostics channel; the listener below then replaces
// the console reporter with an on-screen one, since Metro drops console groups.
enableDiagnostics({ reportUpdates: true })

// Every shadow-tree update uniwind commits, counted per component kind. A flip
// that leaves the Text lane behind shows up here as a commit with no Text
// entries; a heal that does nothing shows up as no new commit at all.
let commitCount = 0
let lastBatch = "none"
const batchListeners = new Set()

UniwindDiagnostics.onShadowTreeUpdate((updates) => {
  const byComponent = {}

  updates.forEach(({ componentName }) => {
    byComponent[componentName] = (byComponent[componentName] ?? 0) + 1
  })

  commitCount += 1
  lastBatch = `#${commitCount} ${Object.entries(byComponent).map(([name, n]) => `${name}:${n}`).join(" ")}`
  batchListeners.forEach((listener) => listener())
})

const PRESETS = [
  ["CircleTopRight", ThemeTransitionPreset.CircleTopRight],
  ["CircleFromOrigin", ThemeTransitionPreset.CircleFromOrigin],
  ["Fade", ThemeTransitionPreset.Fade],
  ["Blur", ThemeTransitionPreset.Blur],
]

// Plain RN styling on the chrome so labels and buttons stay readable no
// matter what the uniwind lane does to `text-*` / `bg-*`.
const BUTTON = { backgroundColor: "#0044ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }
const BUTTON_LABEL = { color: "#ffffff", fontSize: 12 }
const INFO_LABEL = { color: "#808080", fontSize: 11, width: 132 }

// Each row pairs a `text-foreground` glyph with a `bg-foreground` swatch.
// Same token, two lanes: if the glyph vanishes into the background while the
// swatch flips, the Text lane kept the previous theme.
const Row = ({ label, children }) => (
  <View className="flex-row items-center gap-2">
    <Text style={INFO_LABEL}>{label}</Text>
    <View className="w-16 items-center">{children}</View>
    <View className="size-6 bg-foreground" />
  </View>
)

// uniwind-pro #518: a concurrent Reanimated commit can clobber the theme's
// shadow-tree commit on subtrees under an Animated view. Both rows keep the
// glyph and the swatch inside the animated subtree so the two lanes are
// compared under identical conditions.
const AnimatedRow = ({ label, running }) => {
  const progress = useSharedValue(0)

  useEffect(() => {
    if (!running) {
      return
    }

    progress.value = withRepeat(withTiming(1, { duration: 900 }), -1, true)
  }, [progress, running])

  // A layout prop, so every frame is a full shadow-tree commit from the
  // Reanimated lane rather than a native-prop write.
  const style = useAnimatedStyle(() => ({
    opacity: 0.5 + progress.value * 0.5,
    paddingLeft: progress.value * 8,
  }))

  return (
    <View className="flex-row items-center gap-2">
      <Text style={INFO_LABEL}>{label}</Text>
      <Animated.View className="w-16 flex-row items-center gap-2" style={style}>
        <Text className="text-foreground">Aa</Text>
        <View className="size-6 bg-foreground" />
      </Animated.View>
    </View>
  )
}

// Driven from the host: `simctl openurl <udid> "com.repro.uniwindfrozenswap://flip?preset=4"`.
// preset=-1 heals via updateCSSVariables; any other value is a ThemeTransitionPreset,
// with 0 (None) meaning a plain setTheme.
Linking.addEventListener("url", ({ url }) => {
  const preset = Number(url.split("preset=")[1] ?? NaN)

  if (Number.isNaN(preset)) {
    return
  }

  if (preset === -1) {
    Uniwind.updateCSSVariables(Uniwind.currentTheme, {})

    return
  }

  const next = Uniwind.currentTheme === "dark" ? "light" : "dark"

  if (preset === ThemeTransitionPreset.None) {
    Uniwind.setTheme(next)

    return
  }

  Uniwind.setTheme(next, { preset })
})

export default function App() {
  const { theme } = useUniwind()
  const next = theme === "dark" ? "light" : "dark"
  const [batch, setBatch] = useState(lastBatch)

  useEffect(() => {
    const listener = () => setBatch(lastBatch)

    batchListeners.add(listener)

    return () => batchListeners.delete(listener)
  }, [])

  return (
    <View className="flex-1 justify-center gap-2 bg-background px-3">
      <Text style={INFO_LABEL}>{`theme=${theme} current=${Uniwind.currentTheme}`}</Text>
      <Text style={{ ...INFO_LABEL, width: 380, color: "#0044ff" }}>{`last commit -> ${batch}`}</Text>

      <Row label="plain">
        <Text className="text-foreground">Aa</Text>
      </Row>
      <Row label="nested">
        <Text className="text-foreground">
          <Text>Aa</Text>
        </Text>
      </Row>
      <Row label="+ style prop">
        <Text className="text-foreground" style={{ fontWeight: "600" }}>Aa</Text>
      </Row>
      <Row label="maxFontSizeMult">
        <Text className="text-foreground" maxFontSizeMultiplier={1.2}>Aa</Text>
      </Row>
      <Row label="in Freeze(false)">
        <Freeze freeze={false}>
          <Text className="text-foreground">Aa</Text>
        </Freeze>
      </Row>
      <Row label="alpha token">
        <Text className="text-foreground/50">Aa</Text>
      </Row>
      <Row label="in Pressable">
        <Pressable>
          <Text className="text-foreground">Aa</Text>
        </Pressable>
      </Row>
      <Row label="numberOfLines">
        <Text className="text-foreground" numberOfLines={1}>Aa</Text>
      </Row>
      <AnimatedRow label="under Animated" running={false} />
      <AnimatedRow label="under Animated+anim" running />
      <Row label="x40 siblings">
        <View className="flex-row flex-wrap">
          {Array.from({ length: 40 }, (_, i) => (
            <Text key={i} className="text-foreground text-[6px]">Aa</Text>
          ))}
        </View>
      </Row>

      <View className="flex-row flex-wrap gap-2 pt-2">
        {PRESETS.map(([name, preset]) => (
          <Pressable key={name} style={BUTTON} onPress={() => Uniwind.setTheme(next, { preset })}>
            <Text style={BUTTON_LABEL}>{name}</Text>
          </Pressable>
        ))}
        <Pressable style={BUTTON} onPress={() => Uniwind.setTheme(next)}>
          <Text style={BUTTON_LABEL}>Flip plain</Text>
        </Pressable>
        <Pressable
          style={BUTTON}
          onPress={() => Uniwind.updateCSSVariables(Uniwind.currentTheme, {})}
        >
          <Text style={BUTTON_LABEL}>Heal vars</Text>
        </Pressable>
      </View>
    </View>
  )
}
