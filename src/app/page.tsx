import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Users, FileText, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            <span className="text-xl font-bold">PaperTalk</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          AI-Powered Exam Grading
          <br />
          <span className="text-zinc-600 dark:text-zinc-400">
            Made Simple for Schools
          </span>
        </h1>
        <p className="mb-8 max-w-2xl text-xl text-zinc-600 dark:text-zinc-400">
          Streamline your exam grading process with AI assistance. Create tests,
          generate magic links for students, and grade submissions with
          intelligent feedback.
        </p>
        <div className="flex gap-4">
          <Link href="/auth/signup">
            <Button size="lg">Start Free Trial</Button>
          </Link>
          <Link href="/auth/signin">
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-zinc-50 py-24 dark:bg-zinc-900">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Everything You Need to Grade Exams
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <Users className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Multi-Tenant Support</CardTitle>
                <CardDescription>
                  Perfect for schools and institutions. Each organization has
                  isolated data and user management.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>Easy Test Creation</CardTitle>
                <CardDescription>
                  Teachers can create courses and tests, upload test papers, and
                  generate magic links for students.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Sparkles className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>AI-Powered Grading</CardTitle>
                <CardDescription>
                  Get intelligent feedback suggestions from AI, then customize
                  and finalize grades with audio feedback.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24">
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Ready to Get Started?</CardTitle>
            <CardDescription className="text-lg">
              Join schools already using PaperTalk to streamline their grading
              process.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/auth/signup">
              <Button size="lg">Create Your Organization</Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>&copy; 2024 PaperTalk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
