import baseConfig from '@extension/tailwindcss-config';
import type { Config } from 'tailwindcss';
import { withUI } from '@extension/ui';

export default withUI({
  ...baseConfig,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../packages/ui/lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  safelist: [
    'bg-gradient-to-br',
    'from-blue-50',
    'to-purple-50',
    'from-gray-900',
    'to-gray-800',
    'bg-white/50',
    'dark:bg-gray-800/50',
    'bg-gradient-to-r',
    'from-green-500',
    'to-green-600',
    'from-red-500',
    'to-red-600',
    'from-purple-500',
    'to-purple-600',
  ],
}) as Config;
