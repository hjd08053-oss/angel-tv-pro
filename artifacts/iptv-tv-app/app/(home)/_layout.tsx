import { Stack } from "expo-router";

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="player" />
      <Stack.Screen name="series-detail" />
      <Stack.Screen name="movie-detail" />
      <Stack.Screen name="category-content" />
      <Stack.Screen name="my-subscription" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="family-vote" />
    </Stack>
  );
}
