# WingBoard Mobile App

React Native mobile app for WingBoard built with Expo and Supabase.

## Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Fill in your Supabase credentials
```

3. **Start Development Server**
```bash
npm start
```

4. **Run on Device/Simulator**
```bash
# iOS
npm run ios

# Android
npm run android
```

## Project Structure

- `app/` - Expo Router screens (file-based routing)
- `components/` - Reusable React components
- `services/` - API clients and services (Supabase, Auth)
- `store/` - Zustand state management
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions
- `utils/` - Helper functions
- `constants/` - App constants and config

## Key Features

- Phone authentication via Supabase
- Role-based routing (Queen, Crew, Match)
- Real-time updates via Supabase Realtime
- Crew collaboration tools
- Date proposal system

## Development

### Adding a New Screen

1. Create file in `app/(role)/screen-name.tsx`
2. Expo Router will automatically create the route
3. Update navigation as needed

### Adding State Management

Create a new Zustand store in `store/`:

```typescript
import { create } from 'zustand';

interface MyStore {
  data: any[];
  fetchData: () => Promise<void>;
}

export const useMyStore = create<MyStore>((set) => ({
  data: [],
  fetchData: async () => {
    // Fetch logic
  },
}));
```

### Supabase Queries

Use the Supabase client from `services/supabase.ts`:

```typescript
import { supabase } from '@/services/supabase';

const { data, error } = await supabase
  .from('table_name')
  .select('*');
```

## Building for Production

```bash
# Build with EAS
eas build --platform ios
eas build --platform android
```

## Environment Variables

Required:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Optional:
- `TWILIO_ACCOUNT_SID` (for SMS invites)
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
