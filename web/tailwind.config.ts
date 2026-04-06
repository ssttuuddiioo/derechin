import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        "cloud-gray": "#f0f0f3",
        "near-black": "#1c2024",
        "slate-gray": "#60646c",
        "mid-slate": "#555860",
        silver: "#b0b4ba",
        "link-cobalt": "#0d74ce",
        "preview-purple": "#8145b5",
        "widget-sky": "#47c2ff",
        "warning-amber": "#ab6400",
        "border-lavender": "#e0e1e6",
        "input-border": "#d9d9e0",
        "dark-slate": "#363a3f",
      },
      borderRadius: {
        pill: "9999px",
      },
      boxShadow: {
        whisper:
          "rgba(0,0,0,0.08) 0px 3px 6px, rgba(0,0,0,0.07) 0px 2px 4px",
        elevated:
          "rgba(0,0,0,0.1) 0px 10px 20px, rgba(0,0,0,0.05) 0px 3px 6px",
      },
      letterSpacing: {
        display: "-3px",
        section: "-2px",
        subheading: "-0.25px",
      },
      fontSize: {
        display: ["64px", { lineHeight: "1.10", fontWeight: "700" }],
        section: ["48px", { lineHeight: "1.10", fontWeight: "600" }],
        subheading: ["20px", { lineHeight: "1.20", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.40", fontWeight: "400" }],
      },
    },
  },
  plugins: [],
};
export default config;
