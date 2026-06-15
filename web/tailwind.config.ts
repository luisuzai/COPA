import type { Config } from "tailwindcss";

/**
 * Design system COPA.
 * Cores apontam para CSS variables definidas em globals.css — assim o tema
 * fica num único lugar e é fácil de ajustar. Uma cor de destaque (azul), o
 * resto é escala de cinzas. `up`/`down` são semânticos p/ deltas de dados.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        foreground: "var(--text)",
        muted: "var(--muted)",
        accent: {
          DEFAULT: "var(--accent)",
          strong: "var(--accent-strong)",
        },
        up: "var(--up)",
        down: "var(--down)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        content: "64rem",
      },
      letterSpacing: {
        eyebrow: "0.2em",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
