import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexQueryClient } from '@convex-dev/react-query'

import { routeTree } from './routeTree.gen'
import { getConfiguredConvexUrl } from './shared/lib/convex-env'

export function getRouter() {
  const convexUrl = getConfiguredConvexUrl()
  const convexQueryClient = convexUrl
    ? new ConvexQueryClient(convexUrl)
    : undefined

  const queryClient = new QueryClient({
    defaultOptions: convexQueryClient
      ? {
          queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
          },
        }
      : undefined,
  })

  convexQueryClient?.connect(queryClient)

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    context: { queryClient },
    Wrap: ({ children }) =>
      convexQueryClient ? (
        <ConvexAuthProvider client={convexQueryClient.convexClient}>
          {children}
        </ConvexAuthProvider>
      ) : (
        children
      ),
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
