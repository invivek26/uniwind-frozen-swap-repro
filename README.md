# uniwind theme-transition lane repro

Branch `transition-text-ink`. One screen, no navigation: a column of
`text-foreground` glyphs, each paired with a `bg-foreground` swatch. Both
sides read the **same** token through **different** uniwind lanes, so a flip
that leaves `Text` on the old theme shows up as a glyph that disappears into
the background while its swatch flips.

The screen also prints every shadow-tree update uniwind commits
(`UniwindDiagnostics.onShadowTreeUpdate`) as `#<n> Text:<count> View:<count>`,
so "the Text lane got nothing" and "no commit happened at all" are
distinguishable without reading pixels.

## Result

**`ThemeTransitionPreset` does NOT strand `Text` color on the previous theme.**
Across `CircleTopRight`, `CircleFromOrigin`, `Fade`, `Blur` and plain
`setTheme`, in both directions, on iOS 26.4 and iOS 26.5, every glyph matched
its swatch on every frame. Each flip lands as a single commit carrying both
lanes together (`Text:60 View:18` for the full matrix).

Configurations tried, all clean: plain `Text`; nested `Text`; `Text` with a
`style` prop; `maxFontSizeMultiplier`; inside `<Freeze freeze={false}>`; an
alpha-modified token (`text-foreground/50`); inside a `Pressable`;
`numberOfLines`; 40 siblings sharing one class string; and inside an
`Animated.View` whose `useAnimatedStyle` drives a layout prop, so Reanimated
commits to the shadow tree every frame across the flip. React Compiler is on
(`experiments.reactCompiler`), which was the required ingredient for the
earlier frozen-swap bug in this repo's history.

### Custom fontFamily is not the trigger either

The app under test narrowed its own case to `Text` carrying a custom font
class — stripping `font-aeonik-light` from a Settings row made it follow the
theme again. That does not reproduce here. The repro now ships the same three
Aeonik TTFs, registered through the same `expo-font` config plugin, with the
same `--font-aeonik` / `--font-aeonik-light` / `--font-aeonik-bold` tokens and
the same `--text-*: initial` reset, so `font-aeonik-light text-lg
text-foreground` resolves to a byte-identical payload:

```
{"fontFamily":"Aeonik-Light","fontSize":16,"color":"#ffffff"}
```

Rows covering `font-aeonik`, `font-aeonik-light`, `font-aeonik-bold`,
`font-[System]`, a raw `style={{ fontFamily }}`, and the same className routed
through a `CustomText` wrapper (so uniwind sees a forwarded prop at the host
site rather than a literal at the JSX site) all flip correctly under every
preset. The on-screen resolver line prints what uniwind resolves for
`font-aeonik-light`, so a payload regression would be visible without reading
pixels.

iOS resolves `fontFamily` by the TTF's internal family name, which is why the
token value is `"Aeonik-Regular"` and not the filename.

## Second finding: `updateCSSVariables(theme, {})` commits nothing

`Uniwind.updateCSSVariables(Uniwind.currentTheme, {})` is the documented
workaround for uniwind-pro #518 (a concurrent Reanimated commit clobbering the
theme commit). Here it produces **no shadow-tree update at all** — the commit
counter does not advance, after a plain flip or after a preset flip.

Mechanism: it reaches JS as `StyleDependency.Variables` only, and
`getClassNamesForDependencies` returns just the entries that declare that
dependency. Classes built on `@theme` tokens compile to a per-theme literal
and declare `Theme`, not `Variables`, so `text-foreground` and `bg-background`
are never re-resolved. The heal is inert for exactly the nodes it was written
to rescue; only `ScopedVariables` subtrees carry a `Variables` dependency.

## Run

```bash
bun install                 # uniwind-pro installs from the public npm registry
npx expo run:ios --device <udid> --port 8090
```

Flips are driven by deep link so a specific simulator can be addressed while
others are booted (Maestro targets the wrong one when several simulators are
up):

```bash
xcrun simctl openurl <udid> "com.repro.uniwindfrozenswap://flip?preset=4"   # CircleTopRight
xcrun simctl openurl <udid> "com.repro.uniwindfrozenswap://flip?preset=0"   # plain setTheme
xcrun simctl openurl <udid> "com.repro.uniwindfrozenswap://flip?preset=-1"  # updateCSSVariables heal
```

`preset` is a `ThemeTransitionPreset` value from
`node_modules/uniwind/src/specs/NativePlatform.nitro.ts`. The handler is
registered at module scope, so the app must be relaunched (not just
fast-refreshed) after editing it.

Versions: `uniwind-pro 1.7.0`, `expo ~57.0.20`, `react-native 0.86.3`,
`react 19.2.3`, `react-native-nitro-modules 0.37.1`,
`react-native-reanimated 4.5.1`, `react-native-worklets 0.10.1`,
`react-native-screens 4.26.2`, `babel-plugin-react-compiler 1.0.0`.

## Gotchas

- `userInterfaceStyle: "automatic"` must stay in `app.json`, or the native
  runtime never reports a theme change.
- `Uniwind.setTheme` at module scope is lost — the native runtime is not bound
  yet. Call it from a lazy `useState` initializer or a deep-link handler.
- `uniwind-pro` installs from the public npm registry under the
  `uniwind: npm:uniwind-pro@<v>` alias; its postinstall needs
  `UNIWIND_AUTH_TOKEN` or keychain creds. `~/.uniwind/cache/pro/<v>/` holds
  the tarball, and `node_modules/uniwind/pre/postinstall/index.js` can be
  re-run if the postinstall is blocked.
- uniwind-pro 1.7.0 does not compile on react-native < 0.86.3
  (`nativePropsMutex`).

## Earlier issues

Three other bugs were reproduced on this repo at `uniwind-pro 1.6.0` and live
in the git history before this branch: the frozen-flip className swap
([#653](https://github.com/uni-stack/uniwind/issues/653)), the `data-*`
fan-out ([#663](https://github.com/uni-stack/uniwind/issues/663)) and the
`vw`/`vh` collapse after backgrounding
([#665](https://github.com/uni-stack/uniwind/issues/665)). The `data-*`
fan-out is fixed in 1.7.0 — `getMutationKey` now folds `dataAttributes` and
`scopedTheme` into the key.
