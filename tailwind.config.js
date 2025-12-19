/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Core surfaces
        background: '#FFFFFF',
        card: '#FFFFFF',
        surface: '#FAFAFA',
        border: '#E5E5E5',

        // Semantic tokens (avoid hardcoding gray/red/amber throughout screens/components)
        foreground: '#111827', // gray-900
        primary: '#111827', // gray-900
        'primary-hover': '#1F2937', // gray-800
        destructive: '#DC2626', // red-600
        'destructive-hover': '#B91C1C', // red-700
        warning: '#B45309', // amber-700
        success: '#16A34A', // green-600
        muted: '#6B7280', // gray-500
        'muted-foreground': '#9CA3AF', // gray-400
      },
    },
  },
  plugins: [],
};
