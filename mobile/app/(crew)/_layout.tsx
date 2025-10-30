import { Stack } from 'expo-router';

export default function CrewLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="room" />
    </Stack>
  );
}
