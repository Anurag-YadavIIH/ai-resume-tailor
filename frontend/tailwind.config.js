/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#EBEDF2",
        surface: "#FFFFFF",
        ink: "#15182A",
        muted: "#646B7E",
        line: "#DDE1EA",
        brand: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          soft: "#EEF0FF",
        },
        thread: "#E0603D", // signature accent: the tailor's thread
        ok: "#1E9E6A",
        warn: "#C9821E",
        bad: "#D2503C",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(21,24,42,0.04), 0 8px 24px rgba(21,24,42,0.06)",
        lift: "0 4px 12px rgba(21,24,42,0.08)",
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};
