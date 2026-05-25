import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: keyof RootStackParamList, params?: any) {
  if (rootNavigationRef.isReady()) {
    // @ts-ignore
    rootNavigationRef.navigate(name, params);
  }
}
