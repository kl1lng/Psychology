/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f5f4',
          100: '#e7e5e4',
          200: '#d6d3d1',
          300: '#a8a29e',
          400: '#78716c',
          500: '#E1E0CC',
          600: '#cfcda9',
          700: '#b7b489',
          800: '#949169',
          900: '#787554',
        },
        accent: {
          50:  '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#E1E0CC',
          600: '#78716c',
          700: '#57534e',
          800: '#44403c',
          900: '#292524',
        },
        surface: {
          DEFAULT: '#09090B',
          card:    '#121214',
          border:  '#1f1f23',
          muted:   '#2a2a30',
        },
        risk: {
          low:      '#82C3A6',
          medium:   '#D4A373',
          high:     '#E76F51',
          critical: '#E63946',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #3b6ef0 0%, #e83b92 100%)',
        'gradient-card':  'linear-gradient(145deg, #1a1d27 0%, #12151e 100%)',
        'gradient-glow':  'radial-gradient(ellipse at top, rgba(59,110,240,0.15), transparent 60%)',
      },
      boxShadow: {
        'glow-brand':  '0 0 30px rgba(59,110,240,0.3)',
        'glow-accent': '0 0 30px rgba(232,59,146,0.3)',
        'card':        '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease-out',
        'slide-up':    'slideUp 0.4s ease-out',
        'pulse-glow':  'pulseGlow 2s infinite',
        'bounce-in':   'bounceIn 0.6s cubic-bezier(0.68,-0.55,0.265,1.55)',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 20px rgba(59,110,240,0.3)' }, '50%': { boxShadow: '0 0 40px rgba(59,110,240,0.6)' } },
        bounceIn:  { from: { opacity: '0', transform: 'scale(0.3)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
