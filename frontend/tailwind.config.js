var config = {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                heading: ["Space Grotesk", "Manrope", "sans-serif"],
                body: ["Manrope", "Segoe UI", "sans-serif"]
            },
            colors: {
                brand: {
                    50: "#fdf6ef",
                    100: "#faead7",
                    200: "#f4d0ac",
                    300: "#eeb17f",
                    400: "#e79252",
                    500: "#db7436",
                    600: "#bc5829",
                    700: "#974022",
                    800: "#74311f",
                    900: "#59281c"
                },
                slateWarm: {
                    900: "#1a1f2a",
                    800: "#252b3a",
                    700: "#364057"
                }
            },
            boxShadow: {
                soft: "0 12px 40px rgba(20, 24, 35, 0.10)",
                insetGlow: "inset 0 1px 0 rgba(255,255,255,0.22)"
            }
        }
    },
    plugins: []
};
export default config;
