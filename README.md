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

## Second issue on the same screens: data-* fan-out

The **data-*** button opens a screen for the companion report: three pills share ONE class string (`... bg-fill data-[selected=true]:bg-brand`), only their `data-selected` prop differs (Alpha true). Run: Open Settings → Light → back. The flip lane resolves the shared string once — with one arbitrary sibling's data value — and fans the payload out to all three: **every pill comes back `bg-brand`**, including the two with `data-selected={false}`. No React Compiler required for this one; the mutation key drops the per-node `dataAttributes`.

## Third issue: `vw`/`vh` collapse to 0 after the app returns from background (iOS)

The **vw** button opens a screen for [uni-stack/uniwind#665](https://github.com/uni-stack/uniwind/issues/665): a `w-[100vw]` bar measured with `onLayout`, a `w-[50vw]` box, and a log line per app-state change showing what uniwind resolved for `100vw` next to `Dimensions.get("window").width`.

Mechanism: `ios/NativePlatform+ios.swift` `getScreenDimensions()` returns `Dimensions(0, 0)` when `RCTPresentedViewController().view.window` is nil, and `RCTKeyWindow()` is nil while the scene is `.background`. The iOS 17 `registerForTraitChanges` listener in `NativePlatformListener+ios.swift` has no app-state guard, and iOS delivers a deferred appearance change at wake-up while the app is still in the background state, so uniwind caches a 0×0 screen. Same bug as react-native-unistyles #527, fixed there in #540.

Steps (simulator, iOS 26.5, iPhone 17 Pro):

1. Open **vw**, tap `setTheme("system")` — an explicit theme sets `overrideUserInterfaceStyle` on the window, which suppresses the trait callback entirely.
2. Press Home.
3. `xcrun simctl ui booted appearance dark` (flip once and leave it; flipping back cancels the pending change).
4. Return to the app.

To see the sample itself, apply the probe patch and rebuild:

```bash
patch -p1 -d node_modules/uniwind < patches/uniwind-pro-1.6.0-probe.patch
npx expo run:ios
xcrun simctl spawn booted log stream --predicate 'process == "UniwindRepro"' | grep -E "uniwind-probe|InterfaceStyle"
```

Captured output:

```
08:09:50.660 [com.apple.UIKit:InterfaceStyle] Scene did update interface style to 1
08:09:50.661 [uniwind-probe] window trait change appState=2        <- UIApplicationStateBackground
08:09:50.661 [uniwind-probe] sample ZERO appState=2 keyWindow=0 presentedVC=0
08:09:50.705 [com.apple.UIKit:Application] Deactivation reason removed ...
08:09:50.708 [uniwind-probe] notification RCTUserInterfaceStyleDidChangeNotification appState=1
08:09:50.708 [uniwind-probe] sample ok 402x874 appState=1 keyWindow=1
```

On the simulator React Native's own `RCTUserInterfaceStyleDidChangeNotification` followed 47 ms later, after the scene became foreground-inactive, and re-sampled correctly, so the bar heals before it paints. That notification is skipped by `RCTSurfaceHostingView` while `applicationState == Background`; when React Native's trait update lands before the state transition — what production users on devices hit — the 0×0 runtime persists until the next rotation or theme change, and every `vw`/`vh` style stays collapsed.
