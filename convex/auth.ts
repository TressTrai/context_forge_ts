import { convexAuth } from "@convex-dev/auth/server"
import { Password } from "@convex-dev/auth/providers/Password"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
})

// Re-export auth helpers for use in other files
export const getAuthUserId = auth.getUserId
export const getAuthSessionId = auth.getSessionId
