import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProvider } from 'convex/react'

import { routeTree } from './routeTree.gen'

export function getRouter() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL
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
        <ConvexProvider client={convexQueryClient.convexClient}>
          {children}
        </ConvexProvider>
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
