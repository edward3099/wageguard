# WINGBOARD Framework - Quick Reference

## 🎯 The Acronym

```
W - Write Types First
I - Implement Services Layer
N - Navigate Routing Structure
G - Generate Components
B - Build State Management
O - Orchestrate UI Logic
A - Add Real-time Features
R - Refine UX & Animations
D - Debug & Test
```

## 📋 Step-by-Step Checklist

### W - Write Types First
```typescript
// types/[feature].ts
export interface FeatureEntity {
  id: string;
  // ... fields
}

export interface FeatureProps {
  // ... component props
}
```

### I - Implement Services Layer
```typescript
// services/[feature]Service.ts
export async function fetchFeature(): Promise<FeatureEntity[]> {
  const { data, error } = await supabase
    .from('table')
    .select('*');
  return data || [];
}
```

### N - Navigate Routing Structure
```typescript
// app/(role)/[screen].tsx
export default function FeatureScreen() {
  // Route guard, navigation setup
}
```

### G - Generate Components
```typescript
// components/[category]/FeatureCard.tsx
export function FeatureCard({ data }: FeatureCardProps) {
  return <View>...</View>;
}
```

### B - Build State Management
```typescript
// store/[feature]Store.ts
export const useFeatureStore = create((set) => ({
  data: [],
  loading: false,
  fetchData: async () => { /* ... */ },
}));
```

### O - Orchestrate UI Logic
```typescript
// app/(role)/[screen].tsx
const { data, fetchData } = useFeatureStore();
useEffect(() => { fetchData(); }, []);
```

### A - Add Real-time Features
```typescript
// hooks/useFeatureRealtime.ts
export function useFeatureRealtime(id: string) {
  useEffect(() => {
    const channel = supabase.channel(`feature-${id}`)
      .on('postgres_changes', { /* ... */ })
      .subscribe();
    return () => channel.unsubscribe();
  }, [id]);
}
```

### R - Refine UX & Animations
```typescript
// Add animations, loading states, haptic feedback
```

### D - Debug & Test
```typescript
// Error boundaries, logging, testing
```

## 🗂️ File Structure Pattern

```
Feature: Chat

types/
  └── chat.ts              # W - Types

services/
  └── chatService.ts       # I - Services

app/(crew)/
  └── chat.tsx             # N - Routing
                           # O - UI Logic

components/chat/
  ├── MessageList.tsx      # G - Components
  └── MessageBubble.tsx

store/
  └── chatStore.ts         # B - State

hooks/
  └── useChatRealtime.ts    # A - Real-time
```

## ✅ Quick Checklist

- [ ] W - Types in `types/`
- [ ] I - Services in `services/`
- [ ] N - Screen in `app/`
- [ ] G - Components in `components/`
- [ ] B - Store in `store/`
- [ ] O - Connected in screen
- [ ] A - Realtime hook in `hooks/`
- [ ] R - Animations added
- [ ] D - Tested & debugged

## 🚀 Template

See `.wingboard-template.tsx` for complete template.

## 📖 Full Documentation

See `docs/WINGBOARD-FRONTEND-FRAMEWORK.md` for comprehensive guide.
