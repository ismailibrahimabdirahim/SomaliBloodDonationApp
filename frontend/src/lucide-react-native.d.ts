import type { SvgProps } from 'react-native-svg';

declare module 'lucide-react-native' {
  export interface LucideProps extends SvgProps {
    color?: string;
    size?: number | string;
    strokeWidth?: number | string;
    fill?: string;
    absoluteStrokeWidth?: boolean;
  }
}
