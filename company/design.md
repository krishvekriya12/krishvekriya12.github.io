# design.md — Material 3 Expressive (Android / Jetpack Compose)

> Source of truth for all UI work in this project. Every screen, component, and animation follows **Material 3 Expressive (M3E)**. If a choice here conflicts with a generic Material 3 habit, this file wins.

References
- Blog: https://m3.material.io/blog/building-with-m3-expressive
- Compose M3 docs: https://developer.android.com/develop/ui/compose/designsystems/material3
- Release notes: https://developer.android.com/jetpack/androidx/releases/compose-material3
- Adaptive release notes: https://developer.android.com/jetpack/androidx/releases/compose-material3-adaptive

---

## 0. Instructions for AI agents (read first)

1. Before creating a component, check `ui/components/` for an existing one. Reuse before you build.
2. If an Expressive API doesn't resolve or the signature differs from this file, **do not guess**. Check the release notes / API reference, and tell the developer which version you assumed.
3. Never hardcode colors, text sizes, corner radii, or animation durations (see §13 for wrong-vs-right examples).
4. Every new screen must have loading, empty, and error states, previews, and must pass the checklist in §14.
5. Don't add dependencies or bump versions without asking, except to fix a build error caused by this file.

---

## 1. Design principles

M3 Expressive is Material 3 with more emotion, personality, and clarity. The goal is UI that is faster to scan and more delightful, not just more decorated.

1. **Hierarchy through contrast.** The most important thing is obviously the most important: larger, bolder, more colorful. Quiet everything else.
2. **Shape is a signal.** Use varied, morphing shapes to show state, grouping, and emphasis.
3. **Motion has physics.** Springs, not fixed-duration tweens.
4. **Color is expressive but purposeful.** Dynamic color and tonal containers carry meaning, not decoration.
5. **Type is emphasized.** Use emphasized type styles to pull the eye to key content.
6. **Fit the platform.** Prefer system behaviors (edge-to-edge, predictive back, haptics) over custom ones.

---

## 2. Setup

### 2.1 Version policy (important)

Expressive availability depends on the `material3` version. As last verified (Aug 2026):

- **`material3` 1.4.0 (stable)** exposes only part of Expressive. Notably `ShortNavigationBar` and `WideNavigationRail` are public, but much of the rest (e.g. `MaterialExpressiveTheme`, emphasized type styles, flexible top app bars) is **not** publicly usable there.
- **`material3` 1.5.0-alpha\*** is required for the full Expressive set (toggle buttons, `ButtonGroup`, FAB menu, floating toolbars, wavy progress, `LoadingIndicator`, `MaterialShapes`, etc.). Many APIs have graduated from experimental in later alphas, but some (e.g. `LoadingIndicator`, `MaterialShapes`) may still need opt-in.
- **Adaptive libraries** (`adaptive`, `adaptive-layout`, `adaptive-navigation`) are stable at 1.3.0; 1.4.0 is in alpha.

**This project targets the 1.5.0 alpha line.** Pin an exact version in `libs.versions.toml` (do not use ranges or `+`), and re-verify against the release notes before upgrading. If the project must stay on stable 1.4.0, say so here and replace Expressive-only components with their stable equivalents.

### 2.2 Dependencies

```toml
# libs.versions.toml
[versions]
composeBom = "<BOM that maps to the pinned material3>"   # check the BOM mapping page
material3 = "1.5.0-alpha27"          # pinned; last verified Aug 2026 — re-check before bumping
material3Adaptive = "1.3.0"          # stable

[libraries]
androidx-compose-bom = { module = "androidx.compose:compose-bom", version.ref = "composeBom" }
androidx-compose-material3 = { module = "androidx.compose.material3:material3", version.ref = "material3" }
androidx-compose-material3-window-size = { module = "androidx.compose.material3:material3-window-size-class", version.ref = "material3" }
androidx-compose-material3-adaptive-navigation-suite = { module = "androidx.compose.material3:material3-adaptive-navigation-suite", version.ref = "material3" }
androidx-compose-material3-adaptive = { module = "androidx.compose.material3.adaptive:adaptive", version.ref = "material3Adaptive" }
androidx-compose-material3-adaptive-layout = { module = "androidx.compose.material3.adaptive:adaptive-layout", version.ref = "material3Adaptive" }
androidx-compose-material3-adaptive-navigation = { module = "androidx.compose.material3.adaptive:adaptive-navigation", version.ref = "material3Adaptive" }
```

Notes
- `NavigableListDetailPaneScaffold` and `SupportingPaneScaffold` need `adaptive-layout` and `adaptive-navigation`, not just `adaptive`.
- Since `material3` 1.4.0, `material-icons-core` is **no longer pulled in transitively**. Add icon dependencies explicitly (see §9).
- If the BOM and an explicit `material3` version disagree, the explicit version wins. Keep them intentional.

### 2.3 Theme

Always wrap the app in `MaterialExpressiveTheme`. **Never plain `MaterialTheme` at the root.**

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        darkTheme -> AppDarkColorScheme    // fallback: expressiveDarkColorScheme() or Theme Builder output
        else -> AppLightColorScheme        // fallback: expressiveLightColorScheme() or Theme Builder output
    }

    MaterialExpressiveTheme(
        colorScheme = colorScheme,
        motionScheme = MotionScheme.expressive(),
        shapes = AppShapes,          // or omit to use expressive defaults
        typography = AppTypography,  // or omit to use expressive defaults
        content = content,
    )
}
```

Rules
- `MotionScheme.expressive()` for the app. `MotionScheme.standard()` only for dense, utilitarian surfaces (data tables) where bounce would hurt.
- Call `enableEdgeToEdge()` in `MainActivity` and respect `WindowInsets`.
- Access tokens only through `MaterialTheme.*` (`colorScheme`, `typography`, `shapes`, `motionScheme`).

---

## 3. Color

- **Dynamic color is the default** on Android 12+. The fallback scheme for older devices is either the library's `expressiveLightColorScheme()` / `expressiveDarkColorScheme()` or a branded scheme generated with Material Theme Builder. Pick one and keep it in `Color.kt`.
- Use semantic roles, not raw colors:

| Intent | Role |
|---|---|
| Primary action / key emphasis | `primary` / `onPrimary` |
| Softer emphasis, selected states | `primaryContainer` / `onPrimaryContainer` |
| Secondary / supporting | `secondaryContainer` / `onSecondaryContainer` |
| Accent, highlights, delight | `tertiary` / `tertiaryContainer` |
| Screen background | `surface` |
| Cards, sheets, grouped content | `surfaceContainerLowest` → `surfaceContainerHighest` |
| Outlines, dividers | `outline`, `outlineVariant` |
| Errors | `error` / `errorContainer` |

- **Expressive color usage:** let one container color own a screen region (a hero card in `primaryContainer`, a floating toolbar in `tertiaryContainer`). Keep it to 1–2 accent regions per screen.
- Group with `surfaceContainer*` tones rather than elevation shadows.
- Always pair containers with their matching `on*` color.
- Contrast: body text ≥ 4.5:1, large text and icons ≥ 3:1. Test with several dynamic-color wallpapers, not just the fallback.

---

## 4. Typography

- Use the type scale from `MaterialTheme.typography`. No ad-hoc `fontSize`.
- M3E adds **emphasized** variants (heavier weight, tighter tracking) per role, e.g. `headlineMediumEmphasized`, `titleLargeEmphasized`, `labelLargeEmphasized`. Verify they are public in the pinned version (see §2.1).

| Use | Style |
|---|---|
| Hero numbers / display text | `displaySmall` |
| Screen title | `headlineLargeEmphasized` |
| Section headers | `titleLargeEmphasized` |
| Card titles, list headlines | `titleMedium` (use `titleMediumEmphasized` for the one key item in a group) |
| Body content | `bodyLarge` / `bodyMedium` |
| Buttons, chips, tabs | `labelLarge` (`labelLargeEmphasized` for selected tab) |
| Captions, metadata | `bodySmall` / `labelSmall` |

- Emphasize **one** element per group. If everything is emphasized, nothing is.
- If you customize the typeface, use a variable font with weight/width axes (e.g. Roboto Flex).
- Respect system font scaling. Layouts must survive 200% text size.

---

## 5. Shape

- Use `MaterialTheme.shapes` for standard corners. Expressive shapes add larger radii (e.g. `largeIncreased`, `extraLargeIncreased`, `extraExtraLarge`); use them on hero containers.
- Use the **`MaterialShapes`** library (expressive polygons such as `Cookie9Sided`, `Sunny`, `Clover4Leaf`, `Pill`, `SoftBurst`) for avatars, hero images, decorative badges, and empty-state art.
- **Shape morphing** (`Morph` / `RoundedPolygon` / `toShape()`): morph on state change, e.g. a toggle button going round → square when checked.

```kotlin
Image(
    painter = painterResource(R.drawable.cover),
    contentDescription = null,
    modifier = Modifier
        .size(96.dp)
        .clip(MaterialShapes.Cookie9Sided.toShape()),
)
```

Rules
- Shape communicates state: selected is rounder or squarer than unselected; pressed morphs.
- Max 2–3 distinct shape families per screen.
- Touch targets ≥ 48dp regardless of visual shape.

---

## 6. Motion

- All animation specs come from `MaterialTheme.motionScheme`. No hardcoded `tween(300)`.
- Two spring types:
  - **Spatial** (`defaultSpatialSpec`, `fastSpatialSpec`, `slowSpatialSpec`) for movement, size, shape, position. May overshoot.
  - **Effects** (`defaultEffectsSpec`, `fastEffectsSpec`, `slowEffectsSpec`) for color and alpha. Never overshoots.

```kotlin
val scale by animateFloatAsState(
    targetValue = if (pressed) 0.96f else 1f,
    animationSpec = MaterialTheme.motionScheme.fastSpatialSpec(),
)
val tint by animateColorAsState(
    targetValue = if (selected) MaterialTheme.colorScheme.primary
                  else MaterialTheme.colorScheme.onSurfaceVariant,
    animationSpec = MaterialTheme.motionScheme.defaultEffectsSpec(),
)
```

- Press feedback: spring (scale / shape morph) plus haptics where appropriate (§12).
- Navigation transitions: shared-element / container transform for clear parent → child relationships; support **predictive back** (§8).
- Reduced motion: when `ANIMATOR_DURATION_SCALE` is 0, skip bounce and use simple fades or instant changes.

---

## 7. Components

Prefer the Expressive component when one exists, and when it is available in the pinned version. Don't hand-roll what the library provides.

### Actions
| Need | Use |
|---|---|
| Primary / secondary actions | `Button`, `FilledTonalButton`, `OutlinedButton`, `TextButton` with **size** variants (XS–XL) and **shape** (round or square) |
| Icon actions | `IconButton` / `FilledIconButton` / `FilledTonalIconButton` with size + width options |
| On/off actions | `ToggleButton` (round ↔ square morph) |
| Related actions grouped | `ButtonGroup` (items shift on press); `SplitButton` for primary + menu |
| Primary screen action | `FloatingActionButton` (+ medium/large); `FloatingActionButtonMenu` for multiple related actions |
| Contextual toolbar | `HorizontalFloatingToolbar` / `VerticalFloatingToolbar` |

### Navigation
| Need | Use |
|---|---|
| Compact phones | `ShortNavigationBar` (preferred over the classic `NavigationBar`) |
| Tablets / foldables / landscape | `WideNavigationRail` (collapsed ↔ expanded) |
| Adaptive switching between the two | `NavigationSuiteScaffold` (from `material3-adaptive-navigation-suite`) |
| Top bars | `TopAppBar`, `MediumFlexibleTopAppBar`, `LargeFlexibleTopAppBar` (title + subtitle, collapses on scroll) |
| Search | `AppBarWithSearch` + `ExpandedFullScreenSearchBar` / `ExpandedDockedSearchBar` |
| Tabs | Primary / secondary tabs; emphasized label for the selected tab |

### Progress & feedback
| Need | Use |
|---|---|
| Indeterminate loading (short waits) | `LoadingIndicator` / `ContainedLoadingIndicator` |
| Determinate / long progress | `LinearWavyProgressIndicator` / `CircularWavyProgressIndicator` |
| Value selection | `Slider` with expressive sizes/styles, `RangeSlider` |

### Containment & selection
- `Card` / `ElevatedCard` / `OutlinedCard` with larger corner radii and `surfaceContainer*` colors.
- Grouped lists: related rows in one container, tight inner corners, larger outer corners.
- `Chip`s, `Switch`, `Checkbox`, `RadioButton`, `SegmentedButton` / `ToggleButton` rows for selection.
- `ModalBottomSheet`, `AlertDialog`, `DatePicker`, `TimePicker` pick up M3E tokens under `MaterialExpressiveTheme`.

---

## 8. Layout, adaptivity & navigation

### Layout
- **4dp base unit.** Spacing values come from the set `4, 8, 12, 16, 24, 32, 48`. Define them once as constants (e.g. `AppSpacing`) and use those.
- Screen horizontal padding: 16dp (compact), 24dp (medium+).
- Content max width on large screens: ~840dp for reading content.
- Handle insets (status/nav bar, IME, cutouts); scrollable content pads for `WindowInsets.safeDrawing`.
- `LazyColumn` / `LazyVerticalGrid` with stable `key`s for all lists.

### Window size classes (`currentWindowAdaptiveInfo()`)
- Compact → `ShortNavigationBar`, single pane
- Medium → `WideNavigationRail` (collapsed), list-detail where useful
- Expanded+ → `WideNavigationRail` (expanded), multi-pane via `NavigableListDetailPaneScaffold` / `SupportingPaneScaffold`

### Navigation & back
- Use **Navigation Compose** or **Navigation 3** — pick one per project and note it here: `Navigation: <TBD>`. Don't mix.
- Enable predictive back (`android:enableOnBackInvokedCallback="true"` in the manifest) and use `PredictiveBackHandler` / the library's back transitions for custom screens.
- Pass IDs between destinations, not whole objects. Screens load their own state from a `ViewModel`.

---

## 9. Iconography & imagery

- **Icon source:** Material Symbols (rounded style by default), added as vector drawables in `res/drawable` (exported from Google Fonts Icons, weight 400, optical size 24) **or** via a Symbols library chosen by the team. State the choice here: `Icons: <TBD>`.
- Don't mix Symbols with the legacy `Icons.Filled.*` set on the same screen. If using legacy `material-icons-core` / `material-icons-extended`, add the dependency explicitly (not transitive since material3 1.4.0), and keep `extended` out of release builds unless minification/R8 is confirmed, since it is very large.
- Filled variant for selected, outlined for unselected.
- 24dp default icon size; 20dp inside dense controls; 32–48dp for empty states.
- Hero imagery uses expressive shape clips (§5). `contentDescription` for meaningful images, `null` for decorative.

---

## 10. Accessibility (non-negotiable)

- Touch targets ≥ 48×48dp.
- Contrast ≥ 4.5:1 text, ≥ 3:1 icons/boundaries.
- Don't convey state by color or shape alone: add a label, icon, or semantics.
- Provide `contentDescription`, `Role`, `stateDescription`, and merged semantics for composite rows.
- Support TalkBack, Switch Access, font scale 200%, and display-size changes.
- Honor reduced-motion settings (§6).

---

## 11. Localization, performance & testing

### Localization
- No hardcoded user-facing strings. Use `stringResource` / plurals.
- Support RTL: use `start`/`end`, never `left`/`right`. Mirror directional icons (back arrows) with `autoMirrored`.
- Leave room for 30–40% longer text in other languages; avoid fixed-width text containers.

### Performance
- Hoist state; keep composables stateless where possible.
- Use `remember` / `derivedStateOf` for derived values; avoid allocating lambdas/objects in hot paths of lists.
- Use stable, immutable UI state (`@Immutable` / `@Stable`, or immutable collections) to keep skipping effective.
- Don't run heavy work in composition; use `LaunchedEffect` / the ViewModel.
- Ship a **Baseline Profile** for the main user journeys.
- Avoid animating layout-triggering properties when a `graphicsLayer` transform works.

### Testing
- Compose UI tests for key flows (`createComposeRule`), asserting on semantics, not pixels.
- Screenshot tests (e.g. Roborazzi or Paparazzi) for light/dark, 200% font, and compact/expanded widths.
- Accessibility checks enabled in UI tests where supported.

---

## 12. Haptics

- Use `LocalHapticFeedback` for meaningful moments: toggle changes, long-press, drag-snap, confirmation of a destructive action. Not on every tap.
- Prefer standard feedback types (e.g. toggle on/off, confirm, reject) over custom vibration patterns.
- Never rely on haptics alone to communicate state.

---

## 13. Code conventions & patterns

- Stateless composables take state + lambdas; screens read from a `ViewModel` via `collectAsStateWithLifecycle()`.
- One composable per file when > ~80 lines.
- Every reusable component takes `modifier: Modifier = Modifier` as the first optional parameter.
- Shared design pieces live in `ui/components/` and are named by role (`AppSectionHeader`, `AppEmptyState`), not by look.
- **Experimental opt-in:** use file-level `@file:OptIn(ExperimentalMaterial3ExpressiveApi::class)` in UI files that need it; never opt in at module level. Don't add opt-ins to files that don't use experimental APIs.
- Previews: light/dark, 200% font, compact and expanded widths.

Suggested structure

```
ui/
  theme/        Theme.kt, Color.kt, Type.kt, Shape.kt, Spacing.kt
  components/   shared expressive building blocks
  navigation/   nav graph, destinations
  feature/<name>/  <Name>Screen.kt, <Name>ViewModel.kt, <Name>UiState.kt
```

### UI state pattern (loading / empty / error / content)

```kotlin
sealed interface ItemsUiState {
    data object Loading : ItemsUiState
    data object Empty : ItemsUiState
    data class Error(val message: String) : ItemsUiState
    data class Content(val items: List<ItemUi>) : ItemsUiState
}

@Composable
fun ItemsScreen(state: ItemsUiState, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    when (state) {
        ItemsUiState.Loading -> Box(modifier.fillMaxSize(), Alignment.Center) { LoadingIndicator() }
        ItemsUiState.Empty -> AppEmptyState(modifier = modifier /* shape-clipped art + message + action */)
        is ItemsUiState.Error -> AppErrorState(state.message, onRetry, modifier)
        is ItemsUiState.Content -> LazyColumn(
            modifier = modifier,
            contentPadding = WindowInsets.safeDrawing.asPaddingValues(),
            verticalArrangement = Arrangement.spacedBy(AppSpacing.Small),
        ) {
            items(state.items, key = { it.id }) { ItemRow(it) }
        }
    }
}
```

### Wrong vs. right

```kotlin
// ❌ Hardcoded color / size / duration / old components
Text("Total", color = Color(0xFF6750A4), fontSize = 22.sp)
Box(Modifier.clip(RoundedCornerShape(12.dp)))
animateFloatAsState(target, animationSpec = tween(300))
CircularProgressIndicator()

// ✅ Tokens, expressive components
Text("Total", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleLargeEmphasized)
Box(Modifier.clip(MaterialTheme.shapes.extraLargeIncreased))
animateFloatAsState(target, animationSpec = MaterialTheme.motionScheme.defaultSpatialSpec())
LoadingIndicator()
```

---

## 14. Do / Don't

**Do**
- Use `MaterialExpressiveTheme` + `MotionScheme.expressive()`.
- Make the primary action visually dominant (larger size, filled container).
- Use dynamic color, tonal containers, and one or two bold accent regions.
- Morph shapes and spring on interaction.
- Use Expressive components (`ButtonGroup`, `ShortNavigationBar`, `LoadingIndicator`, floating toolbar, wavy progress) where the pinned version provides them.

**Don't**
- Don't ship the default Material 3 look unchanged; if a screen could be mistaken for stock M3, push contrast, shape, or type further.
- Don't hardcode colors, text sizes, corner radii, durations, or user-facing strings.
- Don't use `tween` / `LinearEasing` for spatial motion.
- Don't emphasize every label, or use more than 2–3 shape families per screen.
- Don't use bouncy motion on color/alpha changes (use effects specs).
- Don't use the classic bottom `NavigationBar` or `CircularProgressIndicator` for new work when the Expressive equivalent exists.

---

## 15. Screen checklist (before merging any UI)

- [ ] Wrapped in `MaterialExpressiveTheme`; all values from `MaterialTheme.*`
- [ ] One clear primary action per screen, visually dominant
- [ ] Expressive components used where available in the pinned version
- [ ] Shape and color communicate state; max 1–2 accent regions
- [ ] Spring motion from `motionScheme`; reduced-motion handled; predictive back works
- [ ] Works on compact / medium / expanded widths, with insets and edge-to-edge
- [ ] Dark mode + dynamic color verified (more than one wallpaper)
- [ ] 200% font scale, RTL, and TalkBack pass
- [ ] No hardcoded strings
- [ ] Loading, empty, and error states designed (not blank)
- [ ] Previews added; UI/screenshot tests added or updated
