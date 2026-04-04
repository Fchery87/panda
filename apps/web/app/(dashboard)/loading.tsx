import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48 rounded-none" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-none" />
        <Skeleton className="h-32 rounded-none" />
        <Skeleton className="h-32 rounded-none" />
      </div>
    </div>
  )
}
