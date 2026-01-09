import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        nav: ['Raleway', 'sans-serif'],
      },
      colors: {
        landing: {
          navy: '#1A2332',
          gold: '#C4A053',
          text: {
            primary: '#2C3E50',
            secondary: '#6B7280',
          },
          divider: '#E5E7EB',
        },
        prime: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          gold: '#C5A059',
          goldLight: '#E5C687',
          goldDark: '#997B3D',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      scale: {
        '103': '1.03',
      },
      backdropBlur: {
        'xl': '24px',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.02)', opacity: '0.95' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-left": {
          "0%": {
            opacity: "0",
            transform: "translateX(30px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)"
          }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(var(--primary) / 0.5)" },
        },
        "slide-in-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        'float-delayed': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "zoom-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(197, 160, 89, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(197, 160, 89, 0.5)" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        "border-glow": {
          "0%, 100%": { borderColor: "hsl(var(--primary) / 0.3)" },
          "50%": { borderColor: "hsl(var(--primary) / 0.8)" },
        },
        "particle-float": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)", opacity: "0.3" },
          "25%": { transform: "translateY(-20px) rotate(90deg)", opacity: "0.8" },
          "50%": { transform: "translateY(-10px) rotate(180deg)", opacity: "0.3" },
          "75%": { transform: "translateY(-30px) rotate(270deg)", opacity: "0.6" },
        },
        "scroll-indicator": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "50%": { transform: "translateY(8px)", opacity: "0.5" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "card-hover-glow": {
          "0%": { boxShadow: "0 0 0 rgba(197, 160, 89, 0)" },
          "100%": { boxShadow: "0 20px 60px rgba(197, 160, 89, 0.3)" },
        },
        "text-shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "reveal-up": {
          "0%": { opacity: "0", transform: "translateY(60px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ken-burns": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.15)" },
        },
        "counter-pop": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "hero-badge-enter": {
          "0%": { opacity: "0", transform: "translateY(-20px) scale(0.9)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "hero-title-reveal": {
          "0%": { opacity: "0", transform: "translateY(40px)", filter: "blur(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "stat-card-enter": {
          "0%": { opacity: "0", transform: "translateY(30px) scale(0.9)" },
          "60%": { transform: "translateY(-5px) scale(1.02)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "glow-border-pulse": {
          "0%, 100%": { borderColor: "rgba(197, 160, 89, 0.3)", boxShadow: "0 0 20px rgba(197, 160, 89, 0.1)" },
          "50%": { borderColor: "rgba(197, 160, 89, 0.8)", boxShadow: "0 0 40px rgba(197, 160, 89, 0.3)" },
        },
        "float-particle": {
          "0%, 100%": { transform: "translateY(0) translateX(0)", opacity: "0.2" },
          "25%": { transform: "translateY(-30px) translateX(10px)", opacity: "0.6" },
          "50%": { transform: "translateY(-15px) translateX(-5px)", opacity: "0.4" },
          "75%": { transform: "translateY(-40px) translateX(15px)", opacity: "0.8" },
        },
        "number-slot": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fadeIn 0.5s ease-in-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
        "float": "float 2s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "fade-in-left": "fade-in-left 0.6s ease-out forwards",
        "scale-in": "scale-in 0.4s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in-up": "slide-in-up 0.4s ease-out",
        'float-delayed': 'float-delayed 6s ease-in-out 3s infinite',
        shimmer: 'shimmer 2s linear infinite',
        "fade-in-down": "fade-in-down 0.6s ease-out",
        "slide-in-left": "slide-in-left 0.5s ease-out",
        "zoom-in": "zoom-in 0.4s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
        "gradient-shift": "gradient-shift 3s ease infinite",
        "gradient-x": "gradient-x 3s ease infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        "particle-float": "particle-float 8s ease-in-out infinite",
        "scroll-indicator": "scroll-indicator 2s ease-in-out infinite",
        "card-hover-glow": "card-hover-glow 0.3s ease forwards",
        "text-shimmer": "text-shimmer 3s linear infinite",
        "reveal-up": "reveal-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "ken-burns": "ken-burns 30s ease-out forwards",
        "counter-pop": "counter-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "hero-badge-enter": "hero-badge-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "hero-title-reveal": "hero-title-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "stat-card-enter": "stat-card-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "glow-border-pulse": "glow-border-pulse 3s ease-in-out infinite",
        "float-particle": "float-particle 8s ease-in-out infinite",
        "number-slot": "number-slot 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
