/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		keyframes: {
  			'float-slow': {
  				'0%, 100%': { transform: 'translateY(0) translateX(0)' },
  				'50%': { transform: 'translateY(-24px) translateX(12px)' },
  			},
  			'float-slower': {
  				'0%, 100%': { transform: 'translateY(0) scale(1)' },
  				'50%': { transform: 'translateY(28px) scale(1.06)' },
  			},
  			'pulse-glow': {
  				'0%, 100%': { boxShadow: '0 0 24px rgba(255,255,255,0.15), 0 4px 24px rgba(0,0,0,0.2)' },
  				'50%': { boxShadow: '0 0 48px rgba(255,255,255,0.35), 0 8px 32px rgba(0,0,0,0.25)' },
  			},
  			'gradient-shift': {
  				'0%, 100%': { backgroundPosition: '0% 50%' },
  				'50%': { backgroundPosition: '100% 50%' },
  			},
  			'fade-up': {
  				'0%': { opacity: '0', transform: 'translateY(24px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' },
  			},
  			'shimmer': {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' },
  			},
  		},
  		animation: {
  			'float-slow': 'float-slow 9s ease-in-out infinite',
  			'float-slower': 'float-slower 14s ease-in-out infinite',
  			'pulse-glow': 'pulse-glow 3.5s ease-in-out infinite',
  			'gradient-shift': 'gradient-shift 18s ease infinite',
  			'fade-up': 'fade-up 0.7s ease-out forwards',
  			'shimmer': 'shimmer 3s linear infinite',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

