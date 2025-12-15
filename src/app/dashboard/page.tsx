'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, ArrowRight } from 'lucide-react'
import Link from 'next/link'

async function fetchSubmissions() {
  const res = await fetch('/api/submissions')
  if (!res.ok) {
    throw new Error('Failed to fetch submissions')
  }
  return res.json()
}

export default function Dashboard() {
  const router = useRouter()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['submissions'],
    queryFn: fetchSubmissions,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 p-8 dark:from-zinc-900 dark:to-zinc-800">
      <div className="mx-auto max-w-6xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold">Dashboard</CardTitle>
                <CardDescription>
                  View and manage all exam submissions
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="py-8 text-center text-zinc-500">
                Loading submissions...
              </div>
            )}

            {error && (
              <div className="py-8 text-center text-red-500">
                Error loading submissions. Please try again.
              </div>
            )}

            {data && data.length === 0 && (
              <div className="py-8 text-center text-zinc-500">
                No submissions yet. Submit an exam to get started.
              </div>
            )}

            {data && data.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((submission: any) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {submission.studentName}
                      </TableCell>
                      <TableCell>{submission.studentEmail}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            submission.status === 'graded'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {submission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {submission.finalScore !== null
                          ? `${submission.finalScore}/100`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/grade/${submission.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

