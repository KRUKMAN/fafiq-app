/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        surface: '#FAFAFA',
        border: '#E5E5E5',
        // Semantic tokens (avoid hardcoding gray/red/amber throughout screens/components)
        primary: '#111827', // gray-900
        'primary-hover': '#1F2937', // gray-800
        destructive: '#DC2626', // red-600
        'destructive-hover': '#B91C1C', // red-700
        muted: '#6B7280', // gray-500
        'muted-foreground': '#9CA3AF', // gray-400
      },
    },
  },
  plugins: [],
};
