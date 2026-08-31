# uniwind frozen-flip className-swap repro

Minimal reproduction for [uni-stack/uniwind#653](https://github.com/uni-stack/uniwind/issues/653): after a theme flip that lands while a subtree is frozen (react-freeze), the first **className swap** on a node of that subtree applies an **empty style** — on `Text`, React Native's default black ink — even though the token (`--color-on-brand: #ffffff`) is identical in every theme block.

## Run

```bash
bun install   # or npm install — uniwind-pro installs from the public npm registry
npx expo run:ios
```

## Steps

1. App boots in **dark**, pill **Alpha** selected (blue fill, white label).
2. Tap **Freeze** — the pills subtree freezes (react-freeze / Suspense, same path react-native-screens uses for covered tabs).
3. Tap **Light**.
4. Tap **Unfreeze** — the pills come back correctly re-themed.
5. Tap **Beta**.

**Expected:** Beta gets `bg-brand` + `text-on-brand` → blue fill, `#ffffff` label.

**Actual:** blue fill is correct, but the label paints **RN default black ink** — the `text-on-brand` resolution came back empty. Tap Alpha, then Beta again: still black through one more swap, then it heals. Flips performed while the subtree is visible do not reproduce.

Versions: `uniwind-pro 1.6.0`, `react-native 0.85.3`, `react 19.2.3`, `expo ~56`, `react-native-reanimated 4.3.1`.
