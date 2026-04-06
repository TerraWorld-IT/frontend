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
          pink: '#F5A0B1',
          cream: '#FFF5E6',
          dark: '#2D2D2D',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
    },
  },
}
