import type { Config } from 'tailwindcss'

export default <Config>{
  content: [],
  theme: {
    extend: {
      colors: {
        riso: {
          red: '#E3505F',
          blue: '#0078BF',
          green: '#00A95C',
          yellow: '#FFE800',
          orange: '#FF6C2F',
          pink: '#E8A0BF',
          cream: '#FFF8EB',
          dark: '#2D2D2D',
          sage: '#7B9E6B',
          terracotta: '#C67B5C',
          navy: '#2D3A6E',
          walnut: '#8B6F4E',
          butter: '#F4E4BA',
          forest: '#5B7C5A',
          peach: '#FFD4B2',
          sky: '#A8D8EA',
          lavender: '#C3AED6',
          grass: '#A8C686',
          earth: '#B8926A',
          poppy: '#E07A5F',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        drift: {
          from: { transform: 'translateX(-40px)' },
          to: { transform: 'translateX(calc(100% + 40px))' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        drift: 'drift 20s linear infinite',
        sway: 'sway 3s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
}
