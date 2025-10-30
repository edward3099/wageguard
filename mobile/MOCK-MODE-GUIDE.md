# Mock Mode Testing Guide

## ✅ Mock Mode Enabled!

The app automatically enables **Mock Mode** when Supabase credentials are not configured. This allows you to test the entire UI and navigation flows without setting up a backend.

---

## 🎯 How to Test

### 1. **Start the App**
```bash
cd mobile
npm start
```

### 2. **Authentication**

**Phone Number**: Enter any phone number (e.g., `+1234567890`)

**OTP Code**: 
- For **Queen** role: Enter any 6-digit code (e.g., `123456`)
- For **Crew** role: Enter `crew123` as the OTP code

### 3. **Features You Can Test**

#### ✅ **Swipe Commander** (Crew)
- View profiles with photos (using placeholder images)
- Swipe left (pass) or right (like)
- See vote counts update
- View loading states and animations

#### ✅ **Queen Dashboard**
- See mock matches
- View pending bio proposals
- View pending date proposals
- See active chats
- Test "Approve All" button

#### ✅ **Bio Lab** (Crew)
- View current bio
- Create bio proposals
- Vote on proposals
- See vote counts

#### ✅ **Chat Reactor** (Crew)
- View list of active chats
- Navigate to individual chats
- See message history

#### ✅ **Chat Screen**
- View messages (mock data)
- Send new messages
- See message bubbles
- View crew reactions and takeovers

#### ✅ **Date DJ** (Crew)
- View date proposals
- Create new date proposals
- Vote on proposals

---

## 📝 Mock Data Details

### Profiles
- 20 mock profiles with names, bios, ages, locations
- Random placeholder images from picsum.photos
- Different genders and demographics

### Matches
- 5 mock matches with various statuses
- Mix of pending, approved, and matched states

### Messages
- 10 messages per chat
- Mix of messages from Queen and Match
- Some crew takeovers included

### Bio Proposals
- 3 mock bio proposals
- Different approval states

### Date Proposals
- 2 date proposals per match
- Various activities and locations

---

## 🔄 Switching Between Roles

To test different roles:

1. **Sign Out** from the current session
2. **Sign In** again with:
   - Queen: Any OTP code (e.g., `123456`)
   - Crew: Use `crew123` as OTP code

---

## ⚠️ Limitations in Mock Mode

### What Works:
- ✅ All UI screens and navigation
- ✅ Loading states and animations
- ✅ Form inputs and validation
- ✅ Button interactions
- ✅ Mock data display

### What Doesn't Work:
- ❌ Real-time updates (no Supabase Realtime)
- ❌ Persistent data (resets on app reload)
- ❌ Real authentication (no actual OTP sending)
- ❌ Image uploads
- ❌ Cross-device synchronization

---

## 🚀 Testing Checklist

- [ ] Authentication flow (phone → OTP → dashboard)
- [ ] Queen dashboard - view matches and approvals
- [ ] Crew room - navigate between tabs
- [ ] Swipe Commander - swipe on profiles
- [ ] Bio Lab - create and vote on proposals
- [ ] Chat Reactor - view chat list
- [ ] Chat Screen - send/receive messages
- [ ] Date DJ - create date proposals
- [ ] Loading states appear correctly
- [ ] Error boundaries work
- [ ] Navigation flows smoothly

---

## 💡 Tips

1. **Use Expo Go App**: Download Expo Go on your phone and scan the QR code for the best testing experience
2. **Refresh Data**: Pull down to refresh on list screens
3. **Test Interactions**: Try swiping, tapping, and scrolling to ensure smooth UX
4. **Check Loading States**: Wait for mock delays to see loading skeletons
5. **Test Error Handling**: Try invalid inputs to see error messages

---

## 🔧 Enabling Real Supabase

When you're ready to test with real backend:

1. Set up Supabase project (see `supabase/README.md`)
2. Create `.env` file:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_actual_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_actual_key
   ```
3. Restart Expo server
4. Mock mode will automatically disable

---

## 📊 Mock Mode Status

The app shows **"Mock Mode"** indicator in the console when running. Check your terminal/Expo logs to confirm mock mode is active.

**Happy Testing! 🎉**
