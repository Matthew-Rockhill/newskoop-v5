'use client'

import { Container } from '@/components/ui/container'
import { PageHeader } from '@/components/ui/page-header'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Divider } from '@/components/ui/divider'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '@/components/ui/table'
import {
  DescriptionList,
  DescriptionTerm,
  DescriptionDetails,
} from '@/components/ui/description-list'

// ─── Table of Contents ──────────────────────────────────────────────────────

const TOC_SECTIONS = [
  { id: 'overview', label: 'System Overview' },
  { id: 'users', label: 'Users & Permissions' },
  { id: 'admin', label: 'Admin Section' },
  { id: 'newsroom', label: 'Newsroom Section' },
  { id: 'radio', label: 'Radio Station Zone' },
  { id: 'api', label: 'API Reference' },
]

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  INTERN: 'zinc',
  JOURNALIST: 'blue',
  SUB_EDITOR: 'violet',
  EDITOR: 'green',
  ADMIN: 'orange',
  SUPERADMIN: 'red',
} as const

const STAFF_ROLES = [
  { role: 'INTERN', description: 'Can create drafts and submit for review. Limited to own stories.' },
  { role: 'JOURNALIST', description: 'Reviews intern work, submits stories for editorial approval.' },
  { role: 'SUB_EDITOR', description: 'Approves stories, manages translations, publishes content.' },
  { role: 'EDITOR', description: 'Full editorial control including delete, archive, and workflow management.' },
  { role: 'ADMIN', description: 'Administrative access to user management, stations, and system settings.' },
  { role: 'SUPERADMIN', description: 'Complete system access including system health and audit tools.' },
] as const

// ─── Helpers ────────────────────────────────────────────────────────────────

function Check() {
  return <span className="text-green-600 font-medium">&#10003;</span>
}

function Dash() {
  return <span className="text-zinc-300">&mdash;</span>
}

function SectionHeading({ id, level, children }: { id?: string; level: 2 | 3; children: React.ReactNode }) {
  return (
    <Heading level={level} id={id} className={id ? 'scroll-mt-8' : ''}>
      {children}
    </Heading>
  )
}

function Arrow() {
  return <span className="text-zinc-400 mx-1">&rarr;</span>
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SystemDocsContent() {
  return (
    <div className="min-h-screen bg-white py-10">
      <Container>
        <div className="space-y-8">
          <PageHeader
            title="System Documentation"
            description="Complete reference for the Newskoop platform — users, permissions, workflows, and integrations."
          />

          <div className="flex gap-10">
            {/* ToC sidebar */}
            <aside className="hidden lg:block w-56 shrink-0">
              <nav className="sticky top-8 space-y-1">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  On this page
                </p>
                {TOC_SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm text-zinc-600 hover:text-zinc-900 py-1.5 transition-colors"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0 space-y-14">
              <OverviewSection />
              <Divider />
              <UsersSection />
              <Divider />
              <AdminSection />
              <Divider />
              <NewsroomSection />
              <Divider />
              <RadioSection />
              <Divider />
              <ApiSection />
            </main>
          </div>
        </div>
      </Container>
    </div>
  )
}

// ─── Section 1: Overview ────────────────────────────────────────────────────

function OverviewSection() {
  return (
    <section id="overview" className="scroll-mt-8 space-y-6">
      <SectionHeading id="overview" level={2}>
        System Overview
      </SectionHeading>

      <Text>
        Newskoop is a multilingual newsroom content management system designed for radio broadcast networks.
        It supports end-to-end editorial workflows — from story creation and peer review through translation,
        bulletin scheduling, and distribution to radio stations with audience-specific content filtering.
      </Text>

      <div className="flex flex-wrap gap-2">
        {['Next.js 15', 'PostgreSQL / Prisma', 'NextAuth JWT', 'Vercel Blob', 'TipTap Editor', 'Tailwind / Headless UI'].map((t) => (
          <Badge key={t} color="zinc">{t}</Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 space-y-2">
          <Heading level={4}>Admin Zone</Heading>
          <Text>
            User management, station configuration, announcements, analytics, and system health monitoring.
            Accessible to ADMIN and SUPERADMIN roles.
          </Text>
        </Card>
        <Card className="p-5 space-y-2">
          <Heading level={4}>Newsroom Zone</Heading>
          <Text>
            Story creation, editorial review, translations, bulletins, shows, and content organisation.
            Accessible to all staff roles with permissions based on role level.
          </Text>
        </Card>
        <Card className="p-5 space-y-2">
          <Heading level={4}>Radio Station Zone</Heading>
          <Text>
            Content consumption dashboard for radio stations. Stories filtered by language, religion, and locality.
            Bulletin and show access with dynamic category navigation.
          </Text>
        </Card>
      </div>
    </section>
  )
}

// ─── Section 2: Users & Permissions ─────────────────────────────────────────

function UsersSection() {
  return (
    <section id="users" className="scroll-mt-8 space-y-8">
      <SectionHeading id="users" level={2}>
        Users &amp; Permissions
      </SectionHeading>

      {/* Staff Role Hierarchy */}
      <div className="space-y-4">
        <SectionHeading level={3}>Staff Role Hierarchy</SectionHeading>
        <div className="space-y-3">
          {STAFF_ROLES.map(({ role, description }) => (
            <div key={role} className="flex items-start gap-3">
              <Badge color={ROLE_COLORS[role as keyof typeof ROLE_COLORS]} className="mt-0.5 shrink-0">
                {role.replace('_', ' ')}
              </Badge>
              <Text className="!mt-0">{description}</Text>
            </div>
          ))}
        </div>
      </div>

      {/* Radio Users */}
      <div className="space-y-3">
        <SectionHeading level={3}>Radio Users</SectionHeading>
        <Text>
          Radio users are a separate user type scoped to a specific station. They can access published content
          filtered by their station&apos;s language, religion, and locality settings. They cannot create or
          edit newsroom content.
        </Text>
      </div>

      {/* Story Permission Matrix */}
      <div className="space-y-3">
        <SectionHeading level={3}>Story Permission Matrix</SectionHeading>
        <Table striped grid>
          <TableHead>
            <TableRow>
              <TableHeader>Role</TableHeader>
              <TableHeader>Create</TableHeader>
              <TableHeader>Read</TableHeader>
              <TableHeader>Edit Own</TableHeader>
              <TableHeader>Edit Any</TableHeader>
              <TableHeader>Delete</TableHeader>
              <TableHeader>Approve</TableHeader>
              <TableHeader>Publish</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {([
              ['INTERN',      true,  true,  true,  false, false, false, false],
              ['JOURNALIST',  true,  true,  true,  false, false, false, false],
              ['SUB_EDITOR',  true,  true,  true,  true,  true,  true,  true],
              ['EDITOR',      true,  true,  true,  true,  true,  true,  true],
              ['ADMIN',       true,  true,  true,  true,  true,  true,  true],
              ['SUPERADMIN',  true,  true,  true,  true,  true,  true,  true],
            ] as const).map(([role, ...perms]) => (
              <TableRow key={role}>
                <TableCell>
                  <Badge color={ROLE_COLORS[role as keyof typeof ROLE_COLORS]}>
                    {role.replace('_', ' ')}
                  </Badge>
                </TableCell>
                {perms.map((p, i) => (
                  <TableCell key={i}>{p ? <Check /> : <Dash />}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Stage Transition Matrix */}
      <div className="space-y-3">
        <SectionHeading level={3}>Stage Transition Matrix</SectionHeading>
        <Text>
          Shows which roles can move stories between workflow stages. Each transition requires the
          user to have the appropriate role level.
        </Text>
        <Table dense striped grid>
          <TableHead>
            <TableRow>
              <TableHeader>Transition</TableHeader>
              <TableHeader>Minimum Role</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ['DRAFT → NEEDS_JOURNALIST_REVIEW', 'INTERN'],
              ['DRAFT → NEEDS_SUB_EDITOR_APPROVAL', 'JOURNALIST'],
              ['NEEDS_JOURNALIST_REVIEW → NEEDS_SUB_EDITOR_APPROVAL', 'JOURNALIST'],
              ['NEEDS_JOURNALIST_REVIEW → DRAFT (revision)', 'JOURNALIST'],
              ['NEEDS_SUB_EDITOR_APPROVAL → APPROVED', 'SUB_EDITOR'],
              ['NEEDS_SUB_EDITOR_APPROVAL → DRAFT (revision)', 'SUB_EDITOR'],
              ['APPROVED → TRANSLATED', 'SUB_EDITOR'],
              ['TRANSLATED → PUBLISHED', 'SUB_EDITOR'],
              ['Any → DRAFT (send back)', 'SUB_EDITOR'],
            ].map(([transition, role]) => (
              <TableRow key={transition}>
                <TableCell className="font-mono text-sm">{transition}</TableCell>
                <TableCell>
                  <Badge color={ROLE_COLORS[role as keyof typeof ROLE_COLORS]}>
                    {role.replace('_', ' ')}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

// ─── Section 3: Admin ───────────────────────────────────────────────────────

function AdminSection() {
  return (
    <section id="admin" className="scroll-mt-8 space-y-8">
      <SectionHeading id="admin" level={2}>
        Admin Section
      </SectionHeading>

      <Text>
        The Admin section is accessible to ADMIN and SUPERADMIN roles. It provides system-level
        management tools for users, stations, announcements, analytics, and audit trails.
      </Text>

      <div className="space-y-6">
        <div className="space-y-3">
          <SectionHeading level={3}>User Management</SectionHeading>
          <Text>
            Create new staff and radio users. New users receive a magic link email to set their password
            and complete onboarding. Admins can edit user details, change roles, and deactivate accounts.
            Deactivated users cannot log in but their content is preserved.
          </Text>
        </div>

        <div className="space-y-3">
          <SectionHeading level={3}>Station Management</SectionHeading>
          <Text>
            Radio stations are created through a 4-step wizard: basic details, content filtering
            (languages, religions, blocked categories), contact information, and user assignment.
            Each station&apos;s filters determine which published content is visible to its radio users.
          </Text>
        </div>

        <div className="space-y-3">
          <SectionHeading level={3}>Announcements</SectionHeading>
          <Text>
            System-wide announcements with publish and expiry dates. Announcements appear across both
            newsroom and radio interfaces. Users can dismiss announcements individually.
          </Text>
        </div>

        <div className="space-y-3">
          <SectionHeading level={3}>Analytics</SectionHeading>
          <Text>
            Usage dashboard with time-series charts, top content metrics, and station activity data.
            Analytics are aggregated via a cron job and exportable for reporting.
          </Text>
        </div>

        <div className="space-y-3">
          <SectionHeading level={3}>Email Logs</SectionHeading>
          <Text>
            Audit trail of all emails sent by the system — magic links, password resets, and notifications.
            Each log entry records the recipient, template, status, and timestamp.
          </Text>
        </div>

        <div className="space-y-3">
          <SectionHeading level={3}>SUPERADMIN Panel</SectionHeading>
          <Text>
            Available only to SUPERADMIN users. Includes system health checks (database connectivity,
            storage, email service), active user monitoring, audit warning detection, and function tests
            for verifying core system operations. The function tests panel runs both unit tests
            (permissions, validations, slug generation) and integration tests (station content
            filtering, editorial stage transitions, translation cascade) with results grouped by module.
          </Text>
        </div>
      </div>
    </section>
  )
}

// ─── Section 4: Newsroom ────────────────────────────────────────────────────

function NewsroomSection() {
  return (
    <section id="newsroom" className="scroll-mt-8 space-y-8">
      <SectionHeading id="newsroom" level={2}>
        Newsroom Section
      </SectionHeading>

      <Text>
        The Newsroom is the primary workspace for all staff roles. It handles the full content
        lifecycle from drafting through publishing, including translations and bulletin creation.
      </Text>

      {/* Story Lifecycle */}
      <div className="space-y-4">
        <SectionHeading level={3}>Story Lifecycle</SectionHeading>
        <div className="flex flex-wrap items-center gap-1 py-3">
          <Badge color="zinc">DRAFT</Badge><Arrow />
          <Badge color="blue">NEEDS JOURNALIST REVIEW</Badge><Arrow />
          <Badge color="violet">NEEDS SUB-EDITOR APPROVAL</Badge><Arrow />
          <Badge color="green">APPROVED</Badge><Arrow />
          <Badge color="amber">TRANSLATED</Badge><Arrow />
          <Badge color="emerald">PUBLISHED</Badge>
        </div>
        <Text>
          Stories can be sent back to <Badge color="zinc">DRAFT</Badge> at the
          review or approval stage for revision. SUB_EDITOR and above can send any story back to DRAFT.
        </Text>
      </div>

      {/* Stage Descriptions */}
      <div className="space-y-4">
        <SectionHeading level={3}>Stage Descriptions</SectionHeading>
        <DescriptionList>
          <DescriptionTerm>DRAFT</DescriptionTerm>
          <DescriptionDetails>
            Initial creation state. The author can edit freely. Submit for journalist review or,
            if the author is a journalist or above, directly for sub-editor approval.
          </DescriptionDetails>

          <DescriptionTerm>NEEDS_JOURNALIST_REVIEW</DescriptionTerm>
          <DescriptionDetails>
            Under tier-1 review. Journalists review intern work. Story is locked from editing.
            Reviewer can advance to sub-editor approval or send back to DRAFT for revision.
          </DescriptionDetails>

          <DescriptionTerm>NEEDS_SUB_EDITOR_APPROVAL</DescriptionTerm>
          <DescriptionDetails>
            Under tier-2 review. Sub-editors and editors approve or reject. Story is locked from editing.
            Can be approved or sent back to DRAFT for revision.
          </DescriptionDetails>

          <DescriptionTerm>APPROVED</DescriptionTerm>
          <DescriptionDetails>
            Story has passed editorial review. Translations can be requested at this stage.
            When all translations reach APPROVED status, the story auto-transitions to TRANSLATED.
            Stories in English with no translations needed can skip the translation step.
          </DescriptionDetails>

          <DescriptionTerm>TRANSLATED</DescriptionTerm>
          <DescriptionDetails>
            All requested translations are complete and approved. The story and its translations
            are ready for publishing. A sub-editor or above can publish.
          </DescriptionDetails>

          <DescriptionTerm>PUBLISHED</DescriptionTerm>
          <DescriptionDetails>
            Live and visible to radio stations (subject to station content filters).
            When a parent story is published, all approved translations are automatically published as well.
          </DescriptionDetails>
        </DescriptionList>
      </div>

      {/* Translations */}
      <div className="space-y-3">
        <SectionHeading level={3}>Translations</SectionHeading>
        <Text>
          Stories are linked through the StoryGroup model. When a translation is created, a new Story
          record is made with <code className="text-sm bg-zinc-100 px-1 rounded">originalStoryId</code> pointing
          to the source. Translations follow their own status workflow: PENDING → IN_PROGRESS → NEEDS_REVIEW → APPROVED → PUBLISHED.
          Rejected translations return to IN_PROGRESS for correction. When all translations for a story
          reach APPROVED status, the parent story automatically transitions to the TRANSLATED stage.
          Translations are automatically published when the parent story is published.
        </Text>
      </div>

      {/* Bulletins */}
      <div className="space-y-3">
        <SectionHeading level={3}>Bulletins</SectionHeading>
        <Text>
          News bulletins are assembled by SUB_EDITOR, EDITOR, ADMIN, and SUPERADMIN. Each bulletin has an optional intro and outro,
          a curated list of stories in a defined order, and scheduling metadata. Schedules support
          weekday, weekend, and holiday time slots. Bulletins become available to radio stations once published.
        </Text>
      </div>

      {/* Shows & Episodes */}
      <div className="space-y-3">
        <SectionHeading level={3}>Shows &amp; Episodes</SectionHeading>
        <Text>
          SUB_EDITOR can create shows and edit their own. EDITOR and above can edit any show and delete
          shows. Each show can have a cover image and description. Episodes are added to shows with
          audio content uploaded to Vercel Blob. Episodes can be published individually, making them
          available in the Radio Station Zone.
        </Text>
      </div>

      {/* Audio Library */}
      <div className="space-y-3">
        <SectionHeading level={3}>Audio Library</SectionHeading>
        <Text>
          Central repository for audio clips stored in Vercel Blob. Files are tracked via the AudioClip
          model with metadata (title, duration, format). Audio can be attached to stories and episodes.
          Maximum upload size is 10 MB per file.
        </Text>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <SectionHeading level={3}>Categories</SectionHeading>
        <Text>
          Hierarchical category system with a maximum of 3 levels (parent → sub → sub-sub).
          Categories can be created by SUB_EDITOR and above. Editing and deletion requires EDITOR
          or above. Parent categories cannot be edited once created. Stories are assigned to categories
          for organisation and filtering. Radio stations can block specific categories.
        </Text>
      </div>

      {/* Tags */}
      <div className="space-y-3">
        <SectionHeading level={3}>Tags</SectionHeading>
        <Text>
          Tags are topical labels used for editorial organisation. They are free-form and can be
          created by staff to categorise stories by topic or theme. Content filtering by language,
          religion, and locality is handled separately through the Classifications system.
        </Text>
      </div>

      {/* Classifications */}
      <div className="space-y-3">
        <SectionHeading level={3}>Classifications</SectionHeading>
        <Text>
          Classifications are managed by EDITOR, ADMIN, and SUPERADMIN. They define the available
          language, religion, and locality values that can be assigned to stories and shows. Station
          content filtering uses these classifications to determine which published content each
          station receives. Stories must have at least one matching language AND one matching religion
          classification to appear for a given station.
        </Text>
      </div>

      {/* Menu Builder */}
      <div className="space-y-3">
        <SectionHeading level={3}>Menu Builder</SectionHeading>
        <Text>
          Builds the dynamic category navigation that radio station users see. Menu items are
          linked to categories and can be reordered via drag-and-drop. Available to EDITOR and above.
        </Text>
      </div>

      {/* Editorial Dashboard */}
      <div className="space-y-3">
        <SectionHeading level={3}>Editorial Dashboard</SectionHeading>
        <Text>
          Pipeline metrics showing stories at each workflow stage, workload distribution across staff,
          approval queue lengths, and time-sensitive content flags. The default landing page for EDITOR role.
        </Text>
      </div>

      {/* Diary & Follow-ups */}
      <div className="space-y-3">
        <SectionHeading level={3}>Diary &amp; Follow-ups</SectionHeading>
        <Text>
          Editorial event tracking through the diary system. Stories can have follow-up dates set for
          editorial tracking — these appear in the diary view and surface upcoming deadlines.
        </Text>
      </div>
    </section>
  )
}

// ─── Section 5: Radio ───────────────────────────────────────────────────────

function RadioSection() {
  return (
    <section id="radio" className="scroll-mt-8 space-y-8">
      <SectionHeading id="radio" level={2}>
        Radio Station Zone
      </SectionHeading>

      <Text>
        The Radio Station Zone is the content consumption interface for radio users. It provides
        access to published stories, bulletins, shows, and announcements filtered by the station&apos;s
        configuration.
      </Text>

      <div className="space-y-6">
        <div className="space-y-3">
          <SectionHeading level={3}>Dashboard &amp; Content Access</SectionHeading>
          <Text>
            Radio users see a dashboard with recent stories, upcoming bulletins, and latest episodes.
            All content is filtered based on the station&apos;s language, religion, and locality settings.
            Blocked categories are excluded from all views.
          </Text>
        </div>

        <div className="space-y-3">
          <SectionHeading level={3}>Content Filtering</SectionHeading>
          <Text>
            Each station stores allowed language and religion names. At query time, these are resolved
            to Classification records. Stories must have at least one matching language classification
            AND one matching religion classification to be visible to the station&apos;s users.
            Blocked categories are excluded by category ID. Filtering is applied at the API level.
          </Text>
        </div>

        <div className="space-y-3">
          <SectionHeading level={3}>Bulletins &amp; Scheduling</SectionHeading>
          <Text>
            Radio users can view published bulletins and their associated time schedules (weekday,
            weekend, holiday). Bulletins display their intro, story list, and outro in the configured order.
          </Text>
        </div>

        <div className="space-y-3">
          <SectionHeading level={3}>Shows &amp; Episodes</SectionHeading>
          <Text>
            Published shows and their episodes are available for streaming. Each episode includes
            audio playback and associated metadata.
          </Text>
        </div>

        <div className="space-y-3">
          <SectionHeading level={3}>Dynamic Category Navigation</SectionHeading>
          <Text>
            The sidebar navigation for radio users is generated from the Menu Builder configuration
            in the newsroom. This allows editors to control how content categories are presented to
            radio stations without requiring code changes.
          </Text>
        </div>
      </div>
    </section>
  )
}

// ─── Section 6: API Reference ───────────────────────────────────────────────

function ApiSection() {
  return (
    <section id="api" className="scroll-mt-8 space-y-8">
      <SectionHeading id="api" level={2}>
        API Reference
      </SectionHeading>

      <Text>
        All API routes follow Next.js 15 App Router conventions. Authentication is required for
        all endpoints except public auth routes.
      </Text>

      {/* Auth */}
      <div className="space-y-3">
        <SectionHeading level={3}>Authentication</SectionHeading>
        <Table dense>
          <TableHead>
            <TableRow>
              <TableHeader>Method</TableHeader>
              <TableHeader>Endpoint</TableHeader>
              <TableHeader>Description</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ['POST', '/api/auth/[...nextauth]', 'NextAuth.js handler (login, session, callbacks)'],
              ['POST', '/api/auth/reset-password', 'Request password reset email'],
              ['POST', '/api/auth/set-password', 'Set password via magic link or reset token'],
            ].map(([method, endpoint, desc]) => (
              <TableRow key={endpoint}>
                <TableCell><Badge color="blue">{method}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{endpoint}</TableCell>
                <TableCell>{desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Admin */}
      <div className="space-y-3">
        <SectionHeading level={3}>Admin</SectionHeading>
        <Table dense>
          <TableHead>
            <TableRow>
              <TableHeader>Method</TableHeader>
              <TableHeader>Endpoint</TableHeader>
              <TableHeader>Description</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ['GET/POST', '/api/users', 'List or create users'],
              ['GET/PUT', '/api/users/[id]', 'Get or update a specific user'],
              ['GET/POST', '/api/stations', 'List or create stations'],
              ['GET/PUT', '/api/stations/[id]', 'Get or update a specific station'],
              ['GET/POST', '/api/stations/[id]/users', 'Manage station user assignments'],
              ['PUT', '/api/stations/[id]/primary-contact', 'Update station primary contact'],
              ['GET/POST', '/api/admin/announcements', 'List or create announcements'],
              ['GET/PUT/DELETE', '/api/admin/announcements/[id]', 'Manage a specific announcement'],
              ['GET', '/api/admin/emails', 'View email logs'],
              ['GET', '/api/admin/analytics/overview', 'Analytics overview metrics'],
              ['GET', '/api/admin/analytics/timeseries', 'Time-series analytics data'],
              ['GET', '/api/admin/analytics/top-content', 'Top content metrics'],
              ['GET', '/api/admin/analytics/stations', 'Station activity data'],
              ['GET', '/api/admin/analytics/export', 'Export analytics data'],
              ['GET', '/api/admin/super/system-health', 'System health checks (SUPERADMIN)'],
              ['GET', '/api/admin/super/active-users', 'Active user monitoring (SUPERADMIN)'],
              ['GET', '/api/admin/super/audit-warnings', 'Audit warning detection (SUPERADMIN)'],
              ['GET', '/api/admin/super/function-tests', 'List available test modules (SUPERADMIN)'],
              ['POST', '/api/admin/super/function-tests', 'Run function tests (SUPERADMIN)'],
            ].map(([method, endpoint, desc]) => (
              <TableRow key={endpoint}>
                <TableCell><Badge color="orange">{method}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{endpoint}</TableCell>
                <TableCell>{desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Newsroom */}
      <div className="space-y-3">
        <SectionHeading level={3}>Newsroom</SectionHeading>
        <Table dense>
          <TableHead>
            <TableRow>
              <TableHeader>Method</TableHeader>
              <TableHeader>Endpoint</TableHeader>
              <TableHeader>Description</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ['GET/POST', '/api/newsroom/stories', 'List or create stories'],
              ['GET/PUT/DELETE', '/api/newsroom/stories/[id]', 'Manage a specific story'],
              ['PUT', '/api/newsroom/stories/[id]/stage', 'Update story workflow stage'],
              ['PUT', '/api/newsroom/stories/[id]/status', 'Update story status'],
              ['PUT', '/api/newsroom/stories/[id]/reassign', 'Reassign story author'],
              ['POST', '/api/newsroom/stories/[id]/publish', 'Publish a story'],
              ['POST', '/api/newsroom/stories/[id]/create-translations', 'Create translation requests'],
              ['GET/POST', '/api/newsroom/stories/[id]/comments', 'Story comments'],
              ['PUT/DELETE', '/api/newsroom/stories/[id]/comments/[commentId]', 'Manage a comment'],
              ['GET/PUT', '/api/newsroom/stories/[id]/review-checklist', 'Review checklist'],
              ['GET', '/api/newsroom/stories/[id]/revisions', 'Story revision history'],
              ['PUT', '/api/newsroom/stories/[id]/flag', 'Flag story for attention'],
              ['GET/POST', '/api/newsroom/stories/[id]/audio', 'Story audio attachments'],
              ['GET', '/api/newsroom/stories/follow-ups', 'Stories with follow-up dates'],
              ['GET/POST', '/api/newsroom/bulletins', 'List or create bulletins'],
              ['GET/PUT/DELETE', '/api/newsroom/bulletins/[id]', 'Manage a bulletin'],
              ['GET/PUT', '/api/newsroom/bulletins/[id]/stories', 'Manage bulletin story list'],
              ['GET/POST', '/api/newsroom/bulletins/schedules', 'Bulletin schedules'],
              ['GET/PUT/DELETE', '/api/newsroom/bulletins/schedules/[id]', 'Manage a schedule'],
              ['GET/POST', '/api/newsroom/shows', 'List or create shows'],
              ['GET/PUT/DELETE', '/api/newsroom/shows/[id]', 'Manage a show'],
              ['PUT', '/api/newsroom/shows/[id]/cover', 'Upload show cover image'],
              ['GET/POST', '/api/newsroom/shows/[id]/episodes', 'List or create episodes'],
              ['GET/PUT/DELETE', '/api/newsroom/shows/[id]/episodes/[episodeId]', 'Manage an episode'],
              ['POST', '/api/newsroom/shows/[id]/episodes/[episodeId]/publish', 'Publish an episode'],
              ['POST', '/api/newsroom/shows/[id]/episodes/[episodeId]/audio', 'Upload episode audio'],
              ['GET/POST', '/api/newsroom/categories', 'List or create categories'],
              ['GET/PUT/DELETE', '/api/newsroom/categories/[id]', 'Manage a category'],
              ['GET/POST', '/api/newsroom/tags', 'List or create tags'],
              ['GET/PUT/DELETE', '/api/newsroom/tags/[id]', 'Manage a tag'],
              ['GET/POST', '/api/newsroom/classifications', 'List or create classifications'],
              ['GET/PUT/DELETE', '/api/newsroom/classifications/[id]', 'Manage a classification'],
              ['GET/POST', '/api/newsroom/menu', 'List or create menu items'],
              ['PUT/DELETE', '/api/newsroom/menu/[id]', 'Manage a menu item'],
              ['PUT', '/api/newsroom/menu/reorder', 'Reorder menu items'],
              ['GET/POST', '/api/newsroom/announcements', 'Newsroom announcements'],
              ['GET/POST', '/api/newsroom/diary', 'Diary entries'],
              ['GET/PUT/DELETE', '/api/newsroom/diary/[id]', 'Manage a diary entry'],
              ['GET', '/api/newsroom/diary/upcoming', 'Upcoming diary events'],
              ['GET', '/api/newsroom/audio-library', 'List audio clips'],
              ['DELETE', '/api/newsroom/audio-library/[id]', 'Delete audio clip'],
              ['GET', '/api/newsroom/dashboard/editorial-metrics', 'Editorial dashboard metrics'],
              ['GET', '/api/newsroom/dashboard/my-stories', 'Current user stories'],
              ['GET', '/api/staff/profile', 'Current staff user profile'],
            ].map(([method, endpoint, desc]) => (
              <TableRow key={endpoint}>
                <TableCell><Badge color="green">{method}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{endpoint}</TableCell>
                <TableCell>{desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Radio */}
      <div className="space-y-3">
        <SectionHeading level={3}>Radio</SectionHeading>
        <Table dense>
          <TableHead>
            <TableRow>
              <TableHeader>Method</TableHeader>
              <TableHeader>Endpoint</TableHeader>
              <TableHeader>Description</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ['GET', '/api/radio/stories', 'List published stories (filtered by station)'],
              ['GET', '/api/radio/stories/[id]', 'Get a specific published story'],
              ['GET', '/api/radio/recent-stories', 'Recently published stories'],
              ['GET', '/api/radio/bulletins', 'List published bulletins'],
              ['GET', '/api/radio/bulletins/[id]', 'Get a specific bulletin'],
              ['GET', '/api/radio/bulletin-schedules', 'Bulletin time schedules'],
              ['GET', '/api/radio/shows', 'List published shows'],
              ['GET', '/api/radio/shows/[id]', 'Get a specific show'],
              ['GET', '/api/radio/shows/episodes', 'List published episodes'],
              ['GET', '/api/radio/shows/[id]/episodes', 'Episodes for a specific show'],
              ['GET', '/api/radio/categories', 'Categories (filtered by station)'],
              ['GET', '/api/radio/news-categories', 'News categories'],
              ['GET', '/api/radio/sports-categories', 'Sports categories'],
              ['GET', '/api/radio/finance-categories', 'Finance categories'],
              ['GET', '/api/radio/speciality-categories', 'Speciality categories'],
              ['GET', '/api/radio/locality-tags', 'Locality tags'],
              ['GET', '/api/radio/menu', 'Dynamic menu navigation'],
              ['GET', '/api/radio/announcements', 'Active announcements'],
              ['POST', '/api/radio/announcements/[id]/dismiss', 'Dismiss an announcement'],
              ['GET', '/api/radio/station', 'Current station details'],
              ['PUT', '/api/radio/station/upload-logo', 'Upload station logo'],
              ['GET/PUT', '/api/radio/profile', 'Radio user profile'],
              ['PUT', '/api/radio/profile/upload-picture', 'Upload profile picture'],
              ['POST', '/api/radio/profile/reset-password', 'Reset password'],
            ].map(([method, endpoint, desc]) => (
              <TableRow key={endpoint}>
                <TableCell><Badge color="violet">{method}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{endpoint}</TableCell>
                <TableCell>{desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
