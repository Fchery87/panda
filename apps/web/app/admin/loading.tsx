import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div className="space-y-6 p-8">
      <Skeleton className="h-8 w-64 rounded-none" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-none" />
        <Skeleton className="h-40 rounded-none" />
      </div>
      <Skeleton className="h-64 rounded-none" />
    </div>
  )
}
