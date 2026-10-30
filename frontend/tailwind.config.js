/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paytm: {
          dark: '#002970',
          navy: '#0F265C',
          blue: '#0055B8',
          cyan: '#00BAF2',
          lightBlue: '#F0F8FF',
          accent: '#00BAF2',
        },
        brand: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E8EDF4',
          subtle: '#F1F5F9',
          navy: '#0F172A',
          muted: '#64748B',
          teal: '#0D9488',
          violet: '#6366F1',
          success: '#10B981',
          successBg: '#ECFDF5',
          warning: '#F59E0B',
          warningBg: '#FFFBEB',
          danger: '#EF4444',
          dangerBg: '#FEF2F2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'elevated': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)',
        'glow': '0 0 15px rgba(0, 186, 242, 0.15)',
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '16px',
        '3xl': '20px',
      }
    },
  },
  plugins: [],
}
