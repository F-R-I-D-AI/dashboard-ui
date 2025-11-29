import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "fade-in-blur": {
          "0%": {
            opacity: "0",
            transform: "scale(0.97)",
            filter: "blur(8px)",
          },
          "60%": {
            opacity: "1",
            transform: "scale(1.02)",
            filter: "blur(2px)",
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)",
            filter: "blur(0)",
          },
        },
      },
      animation: {
        "fade-in-blur": "fade-in-blur 1.3s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;