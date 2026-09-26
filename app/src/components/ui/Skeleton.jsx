import { cn } from '../../utils/helpers'
import { Card, CardContent } from './Card'

export function Skeleton({ className, ...props }) {
  return (
    <div className={cn('skeleton shimmer', className)} {...props} />
  )
}

export function ManhwaCardSkeleton() {
  return (
    <div className="card h-full">
      <Skeleton className="aspect-[2/3] w-full" />
      <CardContent className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </CardContent>
    </div>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-6 text-center">
          <CardContent>
            <Skeleton className="h-10 w-20 mx-auto mb-2 rounded-xl" />
            <Skeleton className="h-4 w-24 mx-auto rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function LibraryListSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ManhwaCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ChapterListSkeleton({ count = 10 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-bl-cream dark:bg-gray-800 rounded-xl border border-bl-sand/20 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <Skeleton className="h-5 w-20 rounded-xl" />
        </div>
      ))}
    </div>
  )
}

export function SearchResultsSkeleton({ count = 5 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-bl-cream dark:bg-gray-800 rounded-xl border border-bl-sand/20 dark:border-gray-700">
          <Skeleton className="w-20 h-28 rounded-lg shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}