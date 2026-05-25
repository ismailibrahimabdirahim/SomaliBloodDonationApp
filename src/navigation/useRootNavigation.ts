import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

export function useRootNavigation(): NativeStackNavigationProp<RootStackParamList> {
  const nav = useNavigation();
  const parent = nav.getParent();
  return (parent ?? nav) as unknown as NativeStackNavigationProp<RootStackParamList>;
}
