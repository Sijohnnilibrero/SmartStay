/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        teal: {
          50:  '#E1F5EE',
          100: '#9FE1CB',
          200: '#5DCAA5',
          400: '#1D9E75',
          600: '#0F6E56',
          800: '#085041',
          900: '#04342C',
        },
        brand: {
          primary:   '#0F6E56',
          light:     '#E1F5EE',
          mid:       '#1D9E75',
          amber:     '#BA7517',
          amberLight:'#FAEEDA',
          coral:     '#D85A30',
          coralLight:'#FAECE7',
          purple:    '#534AB7',
          purpleLight:'#EEEDFE',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
