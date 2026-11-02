import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cocoa: { 950: '#24130F', 900: '#352018', 800: '#493025', 700: '#55382A' },
        caramel: '#C18A57',
        gold: '#D6AE78',
        ivory: '#F5E8D5',
        sand: '#C5AE98',
        muted: '#9C8573',
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-manrope)', 'Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderColor: { DEFAULT: 'rgba(220,180,140,0.16)' },
      boxShadow: {
        lux: '0 24px 60px -24px rgba(0,0,0,0.65)',
        glow: '0 0 0 1px rgba(214,174,120,0.35), 0 12px 40px -12px rgba(193,138,87,0.45)',
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        dash: { to: { strokeDashoffset: '-48' } },
      },
      animation: {
        shimmer: 'shimmer 2.4s linear infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        dash: 'dash 3s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
