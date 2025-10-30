# WINGBOARD Feature Development Checklist

Use this checklist for every new feature you build.

## 📋 Feature: ________________

### **W** - Write Types First
- [ ] Entity types defined in `types/`
- [ ] API response types defined
- [ ] Component props types defined
- [ ] State types defined for store
- [ ] All types exported properly
- [ ] Types match database schema

### **I** - Implement Services Layer
- [ ] Service file created in `services/[feature].ts`
- [ ] CRUD operations implemented
- [ ] Error handling added (try-catch)
- [ ] Input validation added
- [ ] JSDoc documentation complete
- [ ] Functions tested manually

### **N** - Navigate Routing Structure
- [ ] Screen file created in `app/(role)/[screen].tsx`
- [ ] Route added to layout if needed
- [ ] Navigation params typed
- [ ] Route guards implemented (auth/role)
- [ ] Deep linking handled (if needed)
- [ ] Navigation tested

### **G** - Generate Components
- [ ] Component file created in `components/[category]/`
- [ ] Props interface defined
- [ ] Component logic implemented
- [ ] Styling added (responsive)
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Accessibility labels added
- [ ] Component exported properly

### **B** - Build State Management
- [ ] Store file created in `store/[feature]Store.ts`
- [ ] State interface defined
- [ ] Data fetching actions implemented
- [ ] Update actions implemented
- [ ] Delete actions implemented (if needed)
- [ ] UI state actions (modals, etc.)
- [ ] Selectors added (computed values)
- [ ] Error handling in store
- [ ] Loading states managed
- [ ] Store exported

### **O** - Orchestrate UI Logic
- [ ] Store connected to screen (useStore hook)
- [ ] User interactions handled (button presses, etc.)
- [ ] Component lifecycle managed (useEffect)
- [ ] Loading states displayed
- [ ] Error states displayed
- [ ] Optimistic updates (if applicable)
- [ ] Form handling (if applicable)
- [ ] Navigation handled
- [ ] UI responsive to state changes

### **A** - Add Real-time Features
- [ ] Realtime hook created in `hooks/use[Feature]Realtime.ts`
- [ ] Channel subscribed with correct filters
- [ ] INSERT events handled
- [ ] UPDATE events handled
- [ ] DELETE events handled (if needed)
- [ ] Store updated on events
- [ ] Unsubscribe on unmount
- [ ] Connection state handled
- [ ] Errors handled
- [ ] Debouncing applied (if needed)

### **R** - Refine UX & Animations
- [ ] Loading animations added
- [ ] Transitions smooth
- [ ] Haptic feedback added (if applicable)
- [ ] Success animations (confetti, etc.)
- [ ] Error feedback clear
- [ ] Skeleton screens (if applicable)
- [ ] Image optimization
- [ ] Accessibility improved
- [ ] Animations tested on device

### **D** - Debug & Test
- [ ] Happy path tested
- [ ] Error cases tested
- [ ] Edge cases tested
- [ ] Tested on physical device
- [ ] Error boundaries added
- [ ] Logging added (dev only)
- [ ] Performance acceptable
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Accessibility tested
- [ ] Code reviewed

---

## 🎯 Quick Copy Template

```
Feature: [Name]

W: Types defined
I: Services implemented  
N: Routes configured
G: Components created
B: State management added
O: UI logic completed
A: Real-time connected
R: UX polished
D: Tested & debugged
```

---

## 📝 Notes

[Add any notes, decisions, or gotchas discovered during development]

---

## 🔗 Related Files

- Types: `types/[feature].ts`
- Services: `services/[feature]Service.ts`
- Store: `store/[feature]Store.ts`
- Components: `components/[category]/`
- Screen: `app/(role)/[screen].tsx`
- Hook: `hooks/use[Feature]Realtime.ts`
