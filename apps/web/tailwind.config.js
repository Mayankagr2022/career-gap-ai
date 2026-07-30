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
        // Brand colors
        brand: {
          50: 'hsl(220, 100%, 97%)',
          100: 'hsl(220, 95%, 92%)',
          200: 'hsl(220, 90%, 84%)',
          300: 'hsl(220, 85%, 73%)',
          400: 'hsl(220, 80%, 62%)',
          500: 'hsl(220, 75%, 53%)',
          600: 'hsl(220, 70%, 44%)',
          700: 'hsl(220, 65%, 36%)',
          800: 'hsl(220, 60%, 28%)',
          900: 'hsl(220, 55%, 22%)',
          950: 'hsl(220, 50%, 14%)',
        },
        violet: {
          500: 'hsl(263, 70%, 50%)',
          600: 'hsl(263, 70%, 42%)',
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
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        'spin-slow': 'spin 3s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
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
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px hsl(220, 75%, 53%), 0 0 10px hsl(220, 75%, 53%)' },
          '100%': { boxShadow: '0 0 20px hsl(220, 75%, 53%), 0 0 40px hsl(220, 75%, 53%)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, hsl(220, 75%, 8%) 0%, hsl(263, 50%, 12%) 50%, hsl(220, 70%, 10%) 100%)',
        'card-gradient': 'linear-gradient(145deg, hsl(220, 30%, 12%), hsl(220, 25%, 10%))',
        shimmer: 'linear-gradient(90deg, transparent 0%, hsl(220, 30%, 20%) 50%, transparent 100%)',
      },
      boxShadow: {
        glow: '0 0 20px hsl(220, 75%, 53% / 0.3)',
        'glow-lg': '0 0 40px hsl(220, 75%, 53% / 0.4)',
        'card': '0 4px 24px hsl(220, 40%, 4% / 0.6)',
        'card-hover': '0 8px 40px hsl(220, 40%, 4% / 0.8)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
