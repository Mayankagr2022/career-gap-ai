/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Brand colour: electric violet
        brand: {
          50: 'hsl(262, 100%, 97%)',
          100: 'hsl(262, 95%, 93%)',
          200: 'hsl(262, 95%, 86%)',
          300: 'hsl(262, 92%, 78%)',
          400: 'hsl(262, 90%, 72%)',
          500: 'hsl(262, 90%, 66%)',
          600: 'hsl(262, 75%, 54%)',
          700: 'hsl(262, 70%, 44%)',
          800: 'hsl(262, 65%, 34%)',
          900: 'hsl(262, 60%, 24%)',
          950: 'hsl(262, 55%, 14%)',
        },
        // Second gradient colour (used as "from-brand-500 to-violet-500"): hot pink
        violet: {
          400: 'hsl(325, 95%, 72%)',
          500: 'hsl(325, 90%, 60%)',
          600: 'hsl(325, 80%, 50%)',
        },
        emerald: {
          500: 'hsl(152, 68%, 48%)',
          600: 'hsl(152, 72%, 40%)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        'spin-slow': 'spin 3s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-ring': 'pulseRing 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 hsl(262 90% 66% / 0.55)' },
          '100%': { boxShadow: '0 0 0 14px hsl(262 90% 66% / 0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 8px hsl(262 90% 66% / 0.5), 0 0 16px hsl(262 90% 66% / 0.3)' },
          '100%': { boxShadow: '0 0 22px hsl(262 90% 66% / 0.8), 0 0 44px hsl(325 90% 60% / 0.4)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, hsl(252, 60%, 8%) 0%, hsl(280, 55%, 12%) 50%, hsl(230, 60%, 10%) 100%)',
        'card-gradient': 'linear-gradient(145deg, hsl(252, 30%, 12%), hsl(252, 28%, 8%))',
        'brand-gradient': 'linear-gradient(120deg, hsl(262 90% 62%), hsl(300 85% 60%), hsl(325 90% 60%))',
      },
      boxShadow: {
        glow: '0 0 24px hsl(262 90% 66% / 0.4)',
        'glow-lg': '0 0 48px hsl(262 90% 66% / 0.5)',
        'glow-pink': '0 0 32px hsl(325 90% 60% / 0.4)',
        card: '0 10px 40px hsl(252 60% 2% / 0.6)',
        'card-hover': '0 20px 60px hsl(262 90% 66% / 0.25)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
