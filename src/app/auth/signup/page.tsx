import Link from 'next/link'
import { OrgSignupForm } from '@/components/auth/OrgSignupForm'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 dark:from-zinc-900 dark:to-zinc-800">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Get Started</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Create your organization account
          </p>
        </div>
        <OrgSignupForm />
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{' '}
          <Link href="/auth/signin" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

