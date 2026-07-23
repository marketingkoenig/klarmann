/** Tailwind-Konfiguration — identisch zur bisherigen CDN-Config in script.js */
module.exports = {
  content: ['./*.html', './en/*.html', './karriere.js', './script.js'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        headline: ['Anton', 'Impact', 'sans-serif'],
        body: ['"Work Sans"', 'sans-serif'],
        label: ['"Work Sans"', 'sans-serif'],
        logo: ['"Work Sans"', 'sans-serif'],
      },
      colors: {
        paper: '#FBFBF9',
        mist: '#EDF1F3',
        ink: '#101C26',
        steel: '#0C161E',
        stahl: '#1B6E99',
        stahlhell: '#3E93BF',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
