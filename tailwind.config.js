/** @type {import('tailwindcss').Config} */
export default {
  // Ensure Tailwind scans all folders where you use these classes
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/providers/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Palette (linked to CSS variables in global.css)
        background: 'var(--background)',
        dark: 'var(--dark)',
        medium: 'var(--medium)',
        light: 'var(--light)',
        
        // Art Series Palette
        art: {
          sold: '#d4af37',
          war: '#6D2E46',
          ach: '#9DC3C2',
          meg: '#FC7753',
          dcs: '#F6BD60',
          col: '#99C2A2',
          van: '#7B8CDE',
          og: '#395B0E',
          ins: '#A27E8E',
          pho: '#2D4654',
          vid: '#996a3e',
        },

        // UI Components
        nav: {
          background: 'rgba(255, 255, 255, 0.8)',
          'background-light': 'rgba(255, 255, 255, 0.3)',
          highlight: '#b9b9b9',
        },
        filter: {
          background: '#efefde',
          text: '#454565',
        },

        // Status
        confirmation: '#56ba5a',
        warning: '#f0ad4e',
        error: '#d9534f',
      },
      fontFamily: {
        // Linked to Next.js Local Fonts in your layout.tsx
        title: ['var(--font-staatliches)', 'sans-serif'],
        body: ['var(--font-barlow)', 'sans-serif'],
        condensed: ['var(--font-barlow-condensed)', 'sans-serif-condensed'],
      },
      spacing: {
        'title-space': '15px',
      },
    },
  },
  plugins: [],
}