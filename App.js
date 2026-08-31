import "./global.css"

import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Freeze } from "react-freeze"
import { Uniwind } from "uniwind"

// The bug needs the app to BOOT in one theme and flip to the other while the
// pills are frozen — boot dark, like a stored dark preference re-applied at
// startup.
Uniwind.setTheme("dark")

const OPTIONS = ["Alpha", "Beta", "Gamma"]

const Pills = ({ selected, onSelect }) => (
  <View className="flex-row gap-2">
    {OPTIONS.map((option) => (
      <Pressable
        key={option}
        onPress={() => onSelect(option)}
        className={
          option === selected
            ? "rounded-full bg-brand px-4 py-2"
            : "rounded-full bg-fill px-4 py-2"
        }
      >
        <Text
          className={option === selected ? "text-on-brand" : "text-fg"}
        >
          {option}
        </Text>
      </Pressable>
    ))}
  </View>
)

export default function App() {
  const [frozen, setFrozen] = useState(false)
  const [selected, setSelected] = useState("Alpha")

  return (
    <View className="flex-1 items-center justify-center gap-8 bg-background px-6">
      <View className="h-12 justify-center">
        <Freeze freeze={frozen}>
          <Pills selected={selected} onSelect={setSelected} />
        </Freeze>
      </View>
      <View className="flex-row gap-2">
        <Pressable
          className="rounded-lg bg-fill px-3 py-2"
          onPress={() => setFrozen((current) => !current)}
        >
          <Text className="text-fg">{frozen ? "Unfreeze" : "Freeze"}</Text>
        </Pressable>
        <Pressable
          className="rounded-lg bg-fill px-3 py-2"
          onPress={() => Uniwind.setTheme("light")}
        >
          <Text className="text-fg">Light</Text>
        </Pressable>
        <Pressable
          className="rounded-lg bg-fill px-3 py-2"
          onPress={() => Uniwind.setTheme("dark")}
        >
          <Text className="text-fg">Dark</Text>
        </Pressable>
      </View>
      <Text className="text-center text-fg">
        Repro: boot (dark, Alpha selected) → Freeze → Light → Unfreeze → tap
        Beta. Beta's label paints RN default black ink instead of
        --color-on-brand (#ffffff); its bg-brand fill is correct. Tap Alpha,
        then Beta again — still black once, then it heals.
      </Text>
    </View>
  )
}
