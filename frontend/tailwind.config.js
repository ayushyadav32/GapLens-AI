/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── GapLens AI Brand Palette ──────────────────────────
        navy: {
          DEFAULT: '#111C25',
          50:  '#E8ECF0',
          100: '#C5D0D9',
          200: '#8FA4B3',
          300: '#5A7A8D',
          400: '#2D5267',
          500: '#111C25',
          600: '#0D1820',
          700: '#09131A',
          800: '#060E14',
          900: '#03090D',
        },
        ivory: {
          DEFAULT: '#F5F2EA',
          50:  '#FDFCFA',
          100: '#F5F2EA',
          200: '#EDE8D8',
          300: '#E0D9C3',
          400: '#D0C9AD',
        },
        teal: {
          DEFAULT: '#087F83',
          light: '#0A9BA0',
          dark: '#075B60',
          50:  '#E6F4F5',
          100: '#C0E4E5',
          200: '#80C9CB',
          300: '#40AEB1',
          400: '#0E9397',
          500: '#087F83',
          600: '#075B60',
          700: '#054347',
          800: '#032C2E',
          900: '#011517',
        },
        gold: {
          DEFAULT: '#D59A55',
          light: '#E0B070',
          dark: '#B8803A',
          50:  '#FDF5EB',
          100: '#F7E3C4',
          200: '#EFC88A',
          300: '#E5AF5E',
          400: '#D59A55',
          500: '#C4843A',
          600: '#A86B28',
        },
        coral: {
          DEFAULT: '#E47767',
          light: '#EA8F81',
          dark: '#CC5E4E',
          50:  '#FDF0EE',
          100: '#F8D5CF',
          200: '#F0AA9F',
          300: '#E47767',
          400: '#D05D4C',
          500: '#C96159',
        },
        // ── Semantic ──────────────────────────────────────────
        success: '#31856D',
        warning: '#D59A35',
        critical: '#C96159',
        // ── Text ──────────────────────────────────────────────
        ink: {
          DEFAULT: '#17252B',
          secondary: '#536268',
          muted: '#6E7E84',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        widest: '0.2em',
        'ultra-wide': '0.3em',
      },
      boxShadow: {
        'glass':     '0 4px 24px -4px rgba(17,28,37,0.08), 0 1px 4px rgba(17,28,37,0.04)',
        'card':      '0 2px 16px -2px rgba(17,28,37,0.10), 0 1px 4px rgba(17,28,37,0.06)',
        'card-hover':'0 8px 32px -4px rgba(17,28,37,0.14), 0 2px 8px rgba(17,28,37,0.08)',
        'teal':      '0 4px 24px -4px rgba(8,127,131,0.30)',
        'teal-sm':   '0 2px 12px -2px rgba(8,127,131,0.20)',
        'gold':      '0 4px 24px -4px rgba(213,154,85,0.30)',
        'gold-sm':   '0 2px 12px -2px rgba(213,154,85,0.20)',
        'nav':       '0 1px 0 0 rgba(17,28,37,0.06)',
        'modal':     '0 24px 64px -8px rgba(17,28,37,0.24)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl':   '1.5rem',
        '4xl':   '2rem',
      },
      backgroundImage: {
        // Landing page cinematic backgrounds
        'landing-gradient': 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(8,127,131,0.18) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(213,154,85,0.10) 0%, transparent 50%), linear-gradient(180deg, #111C25 0%, #0A1520 100%)',
        'hero-radial':      'radial-gradient(ellipse 100% 80% at 50% -10%, rgba(8,127,131,0.22) 0%, transparent 55%)',
        'gold-spot':        'radial-gradient(ellipse 40% 40% at 85% 15%, rgba(213,154,85,0.12) 0%, transparent 60%)',
        // Dashboard
        'ivory-gradient':   'linear-gradient(135deg, #F5F2EA 0%, #FDFCFA 100%)',
        // Card overlays
        'card-shine':       'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 100%)',
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease-out forwards',
        'fade-up':       'fadeUp 0.5s ease-out forwards',
        'fade-in-slow':  'fadeIn 0.8s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.4s ease-out forwards',
        'slide-in-right':'slideInRight 0.4s ease-out forwards',
        'scale-in':      'scaleIn 0.3s ease-out forwards',
        'spin-slow':     'spin 8s linear infinite',
        'float':         'float 6s ease-in-out infinite',
        'pulse-teal':    'pulseTeal 3s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        pulseTeal: {
          '0%, 100%': { opacity: '1',   boxShadow: '0 0 0 0 rgba(8,127,131,0)' },
          '50%':      { opacity: '0.85', boxShadow: '0 0 0 8px rgba(8,127,131,0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
    },
  },
  plugins: [],
}
