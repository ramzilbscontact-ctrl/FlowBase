import { redirect } from 'next/navigation'

// Root is handled by middleware:
// - authenticated → /dashboard
// - unauthenticated → /login
// This file only runs if middleware passes through (shouldn't happen in practice)
export default function RootPage() {
  redirect('/dashboard')
}
