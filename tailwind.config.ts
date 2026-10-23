import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { fontFamily: { sans: ["var(--font-inter)"], serif: ["var(--font-cormorant)"] }, colors: { ink: "#292724", paper: "#F7F4ED", sage: "#5F7257" } } }, plugins: [] } satisfies Config;
