// Re-exports kept for compatibility. The canonical, typed auth helpers live
// in `@/lib/api-auth` (getSessionUser, isAdmin, isInstructor, isManager,
// canEditCourse). The loose `any`-typed hasRole/canEditCourse helpers that
// used to live here were removed — they duplicated the typed versions and
// could let a refactor introduce a bypass.
export { auth, handlers, signIn, signOut } from '@/auth'
