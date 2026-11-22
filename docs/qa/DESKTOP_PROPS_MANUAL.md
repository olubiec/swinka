# Desktop Props Manual QA Checklist (Windows)

Run these 8 manual checks on Windows with `Cuy.exe` built in Release mode:

1. **Place prop**: Open Home and place an owned prop on the desktop (`props.place`). Verify the sprite appears at the expected normalized position inside `Screen.PrimaryScreen.WorkingArea` (above the taskbar) and does not steal window focus.
2. **Move prop**: Move the placed prop to a new `(x, y)` (`props.move`). Verify the overlay updates immediately without flicker or leftover pixels, and clicks pass through the overlay (`WS_EX_TRANSPARENT`) to desktop icons/windows underneath.
3. **Remove prop**: Remove the prop from the desktop (`props.remove`). Verify it disappears from the overlay and returns to the available/free pool.
4. **DPI 125% / 150%**: Set Windows display scaling to 125% and 150%. Verify sprites scale cleanly with nearest-neighbor rendering (`Math.Max(1, (int)Math.Round(DeviceDpi / 96.0) * 2)`) and remain inside the working area.
5. **Second monitor**: Connect/disconnect a secondary monitor or change display arrangement while props are visible. Verify `DisplaySettingsChanged` repositions the overlay cleanly without crashes.
6. **Fullscreen game / video**: Launch a fullscreen application or borderless fullscreen video. Verify the overlay does not break focus or crash, and props remain visible when returning to the desktop.
7. **Restart**: Close and relaunch `Cuy.exe`. Verify the overlay initializes cleanly with no orphaned windows or taskbar entries (`WS_EX_TOOLWINDOW`).
8. **Many props (limit 6)**: Place 6 props on the desktop and attempt to place a 7th. Verify all 6 render cleanly and the 7th is rejected with `"The desktop is full"`.
