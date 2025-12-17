import { Stack } from 'expo-router';
import React from 'react';

export default function DogsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
        }}
      />
    </Stack>
  );
}
