import { Stack } from 'expo-router';

export default function QueenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="chat/[id]" />
    </Stack>
  );
}
