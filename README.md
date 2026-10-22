# AuraCalc — Modern Precision Calculator

A modern, high-precision web calculator built with Vanilla HTML5, CSS3 (Glassmorphism), and JavaScript. Features interactive tactile feedback, expandable scientific functions, history logging, memory registers, and theme switching.

![AuraCalc Banner](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Standard & Scientific Modes**:
  - Full arithmetic operations: `+`, `−`, `×`, `÷`, `%`, `±`.
  - Floating-point precision error handling (`0.1 + 0.2 = 0.3`).
  - Expandable scientific drawer (`fx`): trigonometric functions (`sin`, `cos`, `tan`), angle mode (`DEG`/`RAD`), powers (`x²`, `xʸ`), square root (`√x`), factorial (`x!`), logarithms (`log`, `ln`), reciprocal (`1/x`), constants (`π`, `e`), and parentheses `()`.
- **Memory Operations**:
  - `MC` (Clear), `MR` (Recall), `M+` (Add), `M−` (Subtract), `MS` (Store) with persistent storage and visual indicator.
- **History Drawer**:
  - Slide-over calculation log with timestamped expressions.
  - Click any past calculation to load the result back onto the display.
  - Option to clear history.
- **Themes**:
  - **Midnight Obsidian** (Default dark glassmorphism with subtle indigo radial glow)
  - **Cyber Neon** (High-contrast cyan & electric amber accents)
  - **Aurora Glass** (Emerald teal & cosmic violet)
  - **Titanium Luxe** (Ultra-clean pearlescent light theme)
- **Audio Feedback**:
  - Web Audio API haptic click sound synthesis with pitch modulation (zero external audio dependencies).
  - Quick toggle button to mute/unmute.
- **Full Keyboard Navigation**:
  - Number pad & top-row numbers (`0-9`).
  - Operators (`+`, `-`, `*`, `/`).
  - Enter / `=` to calculate, `Esc` or `C` to clear, `Backspace` to delete digit.
  - Parentheses and scientific shortcut keys.
  - Visual on-screen button flash corresponding to physical key presses.
- **One-Click Clipboard Copy**:
  - Quick copy button with toast notification feedback.

## Getting Started

Simply open `index.html` in any modern web browser, or serve it locally:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .
```

Then visit `http://localhost:8000` in your browser.

## Tech Stack

- **HTML5**: Semantic document layout and accessibility attributes (`aria-live`, `aria-label`).
- **Vanilla CSS3**: Glassmorphism (`backdrop-filter`), CSS custom properties, grid layouts, fluid typography, and micro-animations.
- **Vanilla JavaScript**: Pure ES6+ state management, expression parsing, Web Audio synthesis, and `localStorage` persistence.
