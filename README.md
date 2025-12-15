# 📝 PaperTalk

> **AI-Powered Exam Grading Platform for Educational Institutions**

PaperTalk revolutionizes the exam grading process by combining artificial intelligence with intuitive workflow management. Teachers can create tests, students submit via secure magic links, and AI assists in providing comprehensive feedback with audio narration.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.1-2D3748?style=flat-square&logo=prisma)
![Supabase](https://img.shields.io/badge/Supabase-2.87-3ECF8E?style=flat-square&logo=supabase)

---

## 🎯 Problem Statement

Traditional exam grading is time-consuming and labor-intensive. Teachers spend countless hours:
- Manually reviewing handwritten exam papers
- Providing repetitive feedback
- Managing submission logistics
- Ensuring consistent grading standards

This process is especially challenging for institutions handling large volumes of exams, leading to delayed feedback and reduced time for actual teaching.

## ✨ Solution

PaperTalk streamlines the entire exam lifecycle with AI-powered assistance:

1. **Easy Test Creation**: Teachers upload test papers and organize them by courses
2. **Secure Student Submission**: Students submit exams via unique magic links with image capture
3. **AI-Assisted Grading**: Google Gemini AI analyzes exam images and generates detailed feedback
4. **Audio Feedback**: ElevenLabs converts written feedback into natural-sounding audio narration
5. **Multi-Tenant Architecture**: Complete data isolation for schools and organizations

---

## 🚀 Key Features

### For Teachers & Administrators

- **📚 Course & Test Management**
  - Create and organize courses
  - Upload test papers (PDF/images)
  - Generate secure magic links for student access
  - Track all submissions in one dashboard

- **🤖 AI-Powered Grading**
  - Automatic draft feedback generation using Google Gemini 1.5 Pro
  - Analyze multiple exam images simultaneously
  - Customize and refine AI-generated feedback
  - Assign scores with detailed explanations

- **🎙️ Audio Feedback**
  - Convert written feedback to natural speech using ElevenLabs
  - Background audio generation for improved performance
  - Real-time status updates during audio generation
  - Intelligent quota management with AI-optimized summaries
  - Voice selection: Choose from male, female, or custom voices
  - Voice cloning: Clone your own voice for personalized feedback
  - Downloadable audio files for offline access

- **👥 Team Management**
  - Add and manage teachers within your organization
  - Role-based access control (Super Admin, Org Admin, Teacher)
  - Organization-level data isolation

- **✅ Feedback Workflow**
  - Approve feedback before sending to students
  - Individual and bulk send capabilities
  - Auto-approve and auto-send settings at organization level
  - Track feedback approval and send status

### For Students

- **📸 Flexible Submission**
  - Capture exam images via webcam, mobile camera, or file upload
  - Submit multiple images per exam
  - No account required - access via secure magic links

- **🔒 Privacy & Security**
  - One-time use magic links
  - Automatic expiration
  - Secure image storage

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **TanStack Query** - Server state management

### Backend
- **Next.js Server Actions** - Type-safe API endpoints
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Relational database
- **Supabase** - Authentication & file storage

### AI & Services
- **Google Gemini 1.5 Pro** - Vision AI for exam analysis and feedback optimization
- **ElevenLabs** - Text-to-speech for audio feedback (with voice cloning support)
- **Supabase Storage** - Secure file hosting

### Infrastructure
- **Vercel** - Deployment platform
- **Prisma Migrations** - Database version control

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PaperTalk Platform                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────┐ │
│  │   Teachers   │    │  Students    │    │   Admins  │ │
│  │   Dashboard  │    │  Submission │    │  Settings │ │
│  └──────┬───────┘    └──────┬───────┘    └─────┬─────┘ │
│         │                    │                   │       │
│         └────────────────────┼───────────────────┘       │
│                              │                           │
│                    ┌─────────▼─────────┐                │
│                    │  Next.js App      │                │
│                    │  (Server Actions) │                │
│                    └─────────┬─────────┘                │
│                              │                           │
│         ┌────────────────────┼─────────────────────┐    │
│         │                    │                     │    │
│  ┌──────▼──────┐    ┌────────▼────────┐   ┌──────▼───┐ │
│  │   Prisma    │    │   Supabase      │   │  Gemini  │ │
│  │  PostgreSQL │    │  Auth + Storage │   │    AI    │ │
│  └─────────────┘    └─────────────────┘   └──────────┘ │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Test Creation**: Teacher uploads test paper → Stored in Supabase Storage
2. **Magic Link Generation**: System creates unique, expirable link
3. **Student Submission**: Student captures/uploads images → Stored in Supabase Storage
4. **AI Grading**: Gemini AI analyzes images → Generates feedback draft
5. **Teacher Review**: Teacher edits feedback → Assigns score → Selects voice (optional)
6. **Audio Generation** (Background): ElevenLabs converts feedback to speech asynchronously
   - If quota exceeded: AI generates optimized summary → Truncates if needed → Generates audio
7. **Feedback Approval**: Teacher reviews and approves feedback (or auto-approved based on settings)
8. **Send Feedback**: Teacher sends feedback individually or in bulk (or auto-sent based on settings)
9. **Finalization**: Feedback + score + audio + approval status saved to database

---

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js 20+ and pnpm (or npm/yarn)
- PostgreSQL database
- Supabase account (for auth & storage)
- Google Cloud API key (for Gemini)
- ElevenLabs API key (for text-to-speech)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd papertalk
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/papertalk"
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" # Required for server-side storage uploads
   
   # AI Services
   GOOGLE_GEMINI_API_KEY="your-gemini-api-key"
   ELEVENLABS_API_KEY="your-elevenlabs-api-key"
   ELEVENLABS_VOICE_ID="21m00Tcm4TlvDq8ikWAM" # Optional default voice
   
   # Node Environment
   NODE_ENV="development"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   pnpm db:generate
   
   # Run migrations
   pnpm db:migrate
   # OR push schema (for development)
   pnpm db:push
   ```

5. **Configure Supabase Storage**
   
   - Go to your Supabase project dashboard → Storage
   - Create a new bucket named `exams`
   - Set the bucket to **Public** (for file access)
   - **Important**: Get your Service Role Key from Settings → API → service_role key (secret)
   - Add `SUPABASE_SERVICE_ROLE_KEY` to your `.env` file
   
   > **Note**: The service role key bypasses RLS policies and should NEVER be exposed to the client. It's only used server-side for file uploads.

6. **Run the development server**
   ```bash
   pnpm dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. **Create an Organization**
   - Visit `/auth/signup`
   - Sign up as an organization admin
   - Your organization will be created automatically

2. **Add Teachers** (Optional)
   - Go to `/admin/teachers`
   - Add teachers to your organization

3. **Create a Course**
   - Navigate to `/teacher/courses/new`
   - Create your first course

4. **Create a Test**
   - Go to `/teacher/courses/[id]/tests/new`
   - Upload a test paper and create a test

5. **Generate Magic Link**
   - View your test details
   - Generate a magic link for students

---

## 📖 Usage Guide

### Creating and Grading Exams

1. **Create Course** → `/teacher/courses/new`
2. **Create Test** → Upload test paper, add description
3. **Generate Magic Link** → Share link with students
4. **Student Submits** → Student captures/uploads exam images
5. **AI Generates Draft** → Automatic feedback generation
6. **Review & Edit** → Teacher reviews and customizes feedback
7. **Assign Score** → Enter score (0-100)
8. **Select Voice** (Optional) → Choose voice for audio feedback
9. **Finalize** → System generates audio feedback in background
10. **Approve Feedback** → Review and approve feedback (or auto-approved)
11. **Send Feedback** → Send to student individually or in bulk (or auto-sent)

### Voice Management

1. **Select Voice** → Choose from available ElevenLabs voices (male/female/custom)
2. **Clone Your Voice** → Upload audio sample (1-5 minutes) to clone your voice
3. **Set Preferences** → Save voice preferences for future use
4. **Organization Settings** → Configure auto-approve and auto-send feedback settings

### Managing Your Organization

- **View Submissions**: `/teacher/submissions`
- **Manage Teachers**: `/admin/teachers`
- **Organization Settings**: `/admin/settings`
  - Configure auto-approve feedback
  - Configure auto-send feedback
  - Manage organization preferences

---

## 🔐 Security Features

- **Multi-tenant Architecture**: Complete data isolation between organizations
- **Role-Based Access Control**: Granular permissions for different user roles
- **Secure Magic Links**: One-time use, expirable links for student submissions
- **Supabase Authentication**: Industry-standard auth with session management
- **Server-Side Validation**: All actions validated on the server
- **API Key Protection**: All API keys stored server-side, never exposed to client

---

## 🎨 UI/UX Highlights

- **Modern Design**: Clean, intuitive interface built with Tailwind CSS
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile
- **Dark Mode**: Full dark mode support
- **Accessible Components**: Built with Radix UI for accessibility
- **Real-time Updates**: TanStack Query for efficient data fetching
- **Visual Feedback**: Loading indicators and status messages for background processes
- **Audio Player**: Built-in audio playback for generated feedback

---

## 🚧 Future Enhancements

- [ ] Email notifications for grade completion (send feedback integration)
- [ ] Export grades to CSV/Excel
- [ ] Student dashboard to view grades and feedback
- [ ] Advanced analytics and reporting
- [ ] Integration with Learning Management Systems (LMS)
- [ ] Multi-language support
- [ ] Custom grading rubrics
- [ ] Collaborative grading features
- [ ] Voice preview before finalizing
- [ ] Batch voice cloning for multiple teachers

---

## 📝 License

This project is built for hackathon purposes. All rights reserved.

---

## 👥 Contributing

This is a hackathon project. Contributions and feedback are welcome!

---

## 🙏 Acknowledgments

- **Google Gemini** for powerful vision AI capabilities
- **ElevenLabs** for natural-sounding text-to-speech
- **Supabase** for authentication and storage infrastructure
- **Next.js Team** for the amazing framework
- **Vercel** for seamless deployment

---

## 📞 Support

For questions or issues, please open an issue in the repository.

---

**Built with ❤️ for educators and students**
