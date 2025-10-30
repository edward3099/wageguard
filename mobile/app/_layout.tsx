import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(queen)" />
        <Stack.Screen name="(crew)" />
        <Stack.Screen name="(match)" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
