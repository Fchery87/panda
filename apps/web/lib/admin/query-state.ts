import * as React from 'react'

export type AdminQueryValue = string | number | boolean | null | undefined

interface SearchParamsLike {
  get(name: string): string | null
  toString(): string
}

export function readAdminQueryParam(
  searchParams: SearchParamsLike,
  key: string,
  fallback = ''
): string {
  const value = searchParams.get(key)
  return value && value.trim().length > 0 ? value : fallback
}

export function readAdminEnumQueryParam<T extends string>(
  searchParams: SearchParamsLike,
  key: string,
  allowedValues: readonly T[],
  fallback: T
): T {
  const value = readAdminQueryParam(searchParams, key)
  return (allowedValues.includes(value as T) ? (value as T) : fallback) as T
}

export function readAdminDateQueryParam(
  searchParams: SearchParamsLike,
  key: string,
  fallback = ''
): string {
  const value = readAdminQueryParam(searchParams, key)
  if (!value) return fallback
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback
}

export function buildAdminQueryHref(
  pathname: string,
  searchParams: SearchParamsLike,
  updates: Record<string, AdminQueryValue>
): string {
  const nextParams = new URLSearchParams(searchParams.toString())

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '') {
      nextParams.delete(key)
      continue
    }

    nextParams.set(key, String(value))
  }

  const nextQuery = nextParams.toString()
  return nextQuery ? `${pathname}?${nextQuery}` : pathname
}

interface AdminQueryRouter {
  replace: (href: string, options?: { scroll?: boolean }) => void
}

export function useAdminQueryUpdater(
  pathname: string,
  router: AdminQueryRouter,
  searchParams: SearchParamsLike
): (updates: Record<string, AdminQueryValue>) => void {
  const queryRef = React.useRef(searchParams.toString())

  React.useEffect(() => {
    queryRef.current = searchParams.toString()
  }, [searchParams])

  return React.useCallback(
    (updates: Record<string, AdminQueryValue>) => {
      const nextHref = buildAdminQueryHref(
        pathname,
        {
          get(name: string) {
            return new URLSearchParams(queryRef.current).get(name)
          },
          toString() {
            return queryRef.current
          },
        },
        updates
      )

      const nextQuery = nextHref.includes('?') ? nextHref.slice(nextHref.indexOf('?') + 1) : ''
      queryRef.current = nextQuery
      router.replace(nextHref, { scroll: false })
    },
    [pathname, router]
  )
}
