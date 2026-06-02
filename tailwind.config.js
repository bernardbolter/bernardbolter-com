/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/providers/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      s: '550px',
      m: '768px',
      l: '979px',
      xl: '1200px',
    },
    extend: {
      colors: {
        // Legacy aliases (prefer surface-* / text-* tokens in new code)
        background: 'var(--surface-page)',
        dark: 'var(--text-dark)',
        medium: 'var(--text-medium)',
        light: 'var(--text-light)',

        // Surfaces
        'surface-page': 'var(--surface-page)',
        'surface-nav': 'var(--surface-nav)',
        'surface-nav-light': 'var(--surface-nav-light)',
        'surface-title': 'var(--surface-title)',
        'surface-side-light': 'var(--surface-side-light)',
        'surface-side-dark': 'var(--surface-side-dark)',
        'surface-panel': 'var(--surface-panel)',
        'surface-panel-heading': 'var(--surface-panel-heading)',
        'surface-panel-odd': 'var(--surface-panel-odd)',
        'surface-panel-even': 'var(--surface-panel-even)',

        // Text
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        strong: 'var(--text-strong)',
        muted: 'var(--text-muted)',

        // UI chrome
        'ui-icon': 'var(--ui-icon)',
        'ui-icon-light': 'var(--ui-icon-light)',
        'ui-face': 'var(--ui-face)',
        'ui-line': 'var(--ui-line)',
        'ui-highlight': 'var(--ui-highlight)',
        'ui-timeline': 'var(--ui-timeline)',
        'ui-filter-text': 'var(--ui-filter-text)',

        // Status
        'status-success': 'var(--status-success)',
        'status-warning': 'var(--status-warning)',
        'status-error': 'var(--status-error)',
        confirmation: 'var(--status-success)',
        warning: 'var(--status-warning)',
        error: 'var(--status-error)',

        // Series (reference — prefer getSeriesColor() in components)
        'series-ach': '#9DC3C2',
        'series-col': '#99C2A2',
        'series-dcs': '#F6BD60',
        'series-meg': '#FC7753',
        'series-war': '#6D2E46',
        'series-van': '#7B8CDE',
        'series-og': '#395B0E',
        'series-ins': '#A27E8E',
        'series-pho': '#2D4654',
        'series-vid': '#996a3e',
        'series-sold': '#d4af37',

        // Legacy series keys (art-*)
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

        nav: {
          background: 'var(--surface-nav)',
          'background-light': 'var(--surface-nav-light)',
          highlight: 'var(--ui-highlight)',
        },
        filter: {
          background: '#efefde',
          text: 'var(--ui-filter-text)',
        },
      },
      fontFamily: {
        body: ['var(--font-barlow)', 'sans-serif'],
        heading: ['var(--font-barlow-condensed)', 'sans-serif'],
        title: ['var(--font-staatliches)', 'sans-serif'],
        condensed: ['var(--font-barlow-condensed)', 'sans-serif'],
      },
      spacing: {
        'space-1': '0.25rem',
        'space-2': '0.375rem',
        'space-3': '0.5rem',
        'space-4': '0.625rem',
        'space-5': '0.75rem',
        'space-6': '0.875rem',
        'space-7': '1rem',
        'space-8': '1.25rem',
        'space-9': '1.5rem',
        'space-10': '1.875rem',
        'space-11': '2rem',
        'space-12': '3rem',
        'title-space': '0.9375rem',
      },
      zIndex: {
        artwork: '1000',
        chrome: '2000',
        nav: '3000',
        overlay: '4000',
        'ui-top': '5000',
        modal: '9000',
      },
      maxWidth: {
        grid: '1500px',
      },
    },
  },
  plugins: [],
}
