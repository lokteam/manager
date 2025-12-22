---
alwaysApply: true
---

# React & Frontend Development Standards

This rule defines the coding standards, patterns, and architectural choices for the React-based frontend of the Manager project. Follow these strictly to ensure a maintainable, high-performance, and polished UI.

## Tech Stack

- **Framework**: React 19+ (Functional Components, Hooks)
- **Build Tool**: Vite
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix UI based)
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router
- **State Management**: Zustand (Client state), React Query (Server state)
- **Icons**: Lucide React

## Component Guidelines

- **Functional Components**: Always use `export function ComponentName() {}` or `const ComponentName = () => {}`.
- **Props**: Define props using interfaces. Use destructuring with default values.
- **Small Components**: Break down large components into smaller, single-responsibility sub-components.
- **Lucide Icons**: Use Lucide icons for all UI iconography.

## Styling & UX

- **Responsive Design**: Mobile-first approach using Tailwind's `sm:`, `md:`, `lg:` modifiers.
- **Dark Mode**: Support dark mode using Tailwind's `dark:` class.
- **Consistency**: Use the standard spacing and color palette defined in `tailwind.config.js`.
- **Polish**: Add subtle transitions and loading states (Skeletons) for all async actions.

## State & Data Fetching

- **Server State**: Use `useQuery` for fetching and `useMutation` for updates/deletes.
- **Loading/Error**: Always handle loading and error states explicitly in the UI.
- **Centralized API**: Create an `api/` directory with service functions for each resource (Accounts, Dialogs, etc.) as specified in the `@backend-api` rule.
- **Auth Token**: Securely store the JWT and inject it into the `Authorization` header using an Axios or Fetch interceptor.

## Folder Structure

```text
src/
  api/          # API client and service functions
  components/   # Reusable UI components (shadcn)
  features/     # Feature-specific components and logic
  hooks/        # Custom React hooks
  lib/          # Utilities (utils.ts, constants.ts)
  pages/        # Page-level components (routes)
  store/        # Zustand stores
  types/        # TypeScript interfaces/enums
```

## Performance & Quality

- **Memoization**: Use `useMemo` and `useCallback` for expensive calculations or to prevent unnecessary re-renders of children.
- **Form Handling**: Use `react-hook-form` with `zod` for validation.
- **Type Safety**: Avoid `any`. Use strict types for all API responses.
- **Clean Code**: 2-space indentation. No unused imports. Group imports (React, libraries, local).
