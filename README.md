# uniwind frozen-flip className-swap repro

Minimal reproduction for [uni-stack/uniwind#653](https://github.com/uni-stack/uniwind/issues/653): after a theme flip that lands while a screen is frozen (`freezeOnBlur` under react-native-screens), the first **className swap** on a node of that screen applies a **stale/empty ink** — the label keeps the previous class's color (in our production app it paints React Native's default black) instead of the new class's `--color-on-brand: #ffffff`, a token identical in every theme block.

**React Compiler is a required ingredient**: with `experiments.reactCompiler` removed from `app.json`, the same sequence renders correctly. The git history contains five progressively-closer variants that do NOT reproduce (plain react-freeze; + `CircleTopRight` transition; + freeze/thaw cycles; + `GlassView` containment; + native-stack `freezeOnBlur`) — only adding React Compiler makes it fire, deterministically.

## Run

```bash
bun install   # or npm install — uniwind-pro installs from the public npm registry
npx expo run:ios
```

## Steps

1. App boots in **dark**, pill **Alpha** selected (blue fill, white label).
2. Tap **Open Settings** (Home freezes under `freezeOnBlur`).
3. Tap **Light**.
4. Tap **Back** — Home comes back correctly re-themed.
5. Tap **Beta**.

**Expected:** Beta gets `bg-brand` + `text-on-brand` → blue fill, `#ffffff` label.

**Actual:** blue fill is correct, but the label paints `#2d2d2d` — the light theme's `--color-fg`, i.e. the *previous* class's ink; the `text-on-brand` swap never applied. Pixel-sampled: 48 glyph pixels at `rgb(45,45,45)` inside the selected pill. Tap Alpha, then Beta again: heals. Flips performed while the screen is visible do not reproduce.

Versions: `uniwind-pro 1.6.0`, `react-native 0.85.3`, `react 19.2.3`, `expo ~56`, `react-native-reanimated 4.3.1`, `react-native-screens 4.25.2`, `babel-plugin-react-compiler` via `experiments.reactCompiler`.
