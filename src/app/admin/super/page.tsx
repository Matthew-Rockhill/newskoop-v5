'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { RealtimeStatus } from '@/components/ui/RealtimeStatus';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '@/components/ui/table';
import {
  ServerIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  CogIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface SystemHealthResponse {
  database: {
    connected: boolean;
    latencyMs: number;
    error?: string;
  };
  environment: string;
  timestamp: string;
}

interface ActiveUsersResponse {
  total: number;
  staff: number;
  radio: number;
  users: {
    id: string;
    name: string;
    email: string;
    userType: string;
    staffRole: string | null;
    lastLoginAt: string;
  }[];
}

interface AuditWarningsResponse {
  failedLogins: number;
  totalWarnings: number;
  events: {
    id: string;
    action: string;
    ipAddress: string | null;
    createdAt: string;
    user: {
      name: string;
      email: string;
    } | null;
  }[];
}

interface HealthCheck {
  name: string;
  category: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  latencyMs?: number;
}

interface HealthCheckResponse {
  checks: HealthCheck[];
  summary: { total: number; passed: number; warnings: number; failed: number };
  timestamp: string;
  error?: string;
}

export default function SuperAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [healthResults, setHealthResults] = useState<HealthCheckResponse | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Redirect non-SUPERADMIN users
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.staffRole !== 'SUPERADMIN') {
      router.push('/admin');
    }
  }, [session, status, router]);

  // Mutation for running health checks
  const runChecksMutation = useMutation({
    mutationFn: async (): Promise<HealthCheckResponse> => {
      const res = await fetch('/api/admin/super/function-tests', {
        method: 'POST',
      });
      if (!res.ok && res.status !== 500) {
        throw new Error('Failed to run health checks');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setHealthResults(data);
      // Expand categories that have issues
      const categoriesWithIssues = new Set(
        data.checks
          .filter((c) => c.status !== 'pass')
          .map((c) => c.category)
      );
      setExpandedCategories(categoriesWithIssues);
    },
  });

  // Group health checks by category
  const groupedChecks = healthResults?.checks.reduce(
    (acc, check) => {
      if (!acc[check.category]) {
        acc[check.category] = [];
      }
      acc[check.category].push(check);
      return acc;
    },
    {} as Record<string, HealthCheck[]>
  );

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Fetch system health
  const { data: healthData, isLoading: healthLoading } =
    useQuery<SystemHealthResponse>({
      queryKey: ['system-health'],
      queryFn: async () => {
        const res = await fetch('/api/admin/super/system-health');
        if (!res.ok) throw new Error('Failed to fetch system health');
        return res.json();
      },
      refetchInterval: 30000, // Refresh every 30 seconds
    });

  // Fetch active users
  const { data: usersData, isLoading: usersLoading } =
    useQuery<ActiveUsersResponse>({
      queryKey: ['active-users'],
      queryFn: async () => {
        const res = await fetch('/api/admin/super/active-users?hours=24');
        if (!res.ok) throw new Error('Failed to fetch active users');
        return res.json();
      },
      refetchInterval: 60000, // Refresh every minute
    });

  // Fetch audit warnings
  const { data: auditData, isLoading: auditLoading } =
    useQuery<AuditWarningsResponse>({
      queryKey: ['audit-warnings'],
      queryFn: async () => {
        const res = await fetch('/api/admin/super/audit-warnings?hours=24');
        if (!res.ok) throw new Error('Failed to fetch audit warnings');
        return res.json();
      },
      refetchInterval: 60000, // Refresh every minute
    });

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format action name for display
  const formatAction = (action: string) => {
    return action
      .replace(/\./g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (status === 'loading') {
    return (
      <Container>
        <div className="flex items-center justify-center py-12">
          <Text>Loading...</Text>
        </div>
      </Container>
    );
  }

  if (session?.user.staffRole !== 'SUPERADMIN') {
    return null;
  }

  return (
    <Container>
      <PageHeader
        title="System Status Dashboard"
        description="Real-time system health monitoring and security overview"
        actions={
          <div className="flex items-center gap-4">
            <RealtimeStatus />
            <Badge color="red">SUPERADMIN</Badge>
          </div>
        }
      />

      {/* Status Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Database Status */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <ServerIcon className="h-5 w-5 text-zinc-600" />
            </div>
            <Heading level={3}>Database</Heading>
          </div>
          {healthLoading ? (
            <Text className="text-zinc-500">Checking...</Text>
          ) : healthData?.database.connected ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Badge color="green">Online</Badge>
                <Text className="text-sm text-zinc-500">
                  {healthData.database.latencyMs}ms
                </Text>
              </div>
              <Text className="text-sm text-zinc-600">
                Database responding normally
              </Text>
            </>
          ) : (
            <>
              <Badge color="red">Offline</Badge>
              <Text className="text-sm text-red-600 mt-2">
                {healthData?.database.error || 'Connection failed'}
              </Text>
            </>
          )}
        </Card>

        {/* Active Users */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <UsersIcon className="h-5 w-5 text-zinc-600" />
            </div>
            <Heading level={3}>Active Users</Heading>
          </div>
          {usersLoading ? (
            <Text className="text-zinc-500">Loading...</Text>
          ) : (
            <>
              <Text className="text-2xl font-semibold text-zinc-900 mb-2">
                {usersData?.total || 0}
              </Text>
              <Text className="text-sm text-zinc-600">
                {usersData?.staff || 0} Staff, {usersData?.radio || 0} Radio
              </Text>
              <Text className="text-xs text-zinc-400 mt-1">Last 24 hours</Text>
            </>
          )}
        </Card>

        {/* Environment */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <CogIcon className="h-5 w-5 text-zinc-600" />
            </div>
            <Heading level={3}>Environment</Heading>
          </div>
          <Badge
            color={healthData?.environment === 'production' ? 'green' : 'amber'}
          >
            {healthData?.environment || 'unknown'}
          </Badge>
          <Text className="text-sm text-zinc-600 mt-2">Vercel / Neon</Text>
        </Card>
      </div>

      {/* Audit Warnings */}
      <div className="mt-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-100 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-zinc-600" />
              </div>
              <div>
                <Heading level={3}>Audit Warnings</Heading>
                <Text className="text-sm text-zinc-500">Last 24 hours</Text>
              </div>
            </div>
            {!auditLoading && (
              <Badge color={auditData?.failedLogins ? 'amber' : 'green'}>
                {auditData?.failedLogins || 0} failed login
                {auditData?.failedLogins === 1 ? '' : 's'}
              </Badge>
            )}
          </div>

          {auditLoading ? (
            <Text className="text-zinc-500">Loading audit events...</Text>
          ) : auditData?.events && auditData.events.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Time</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>IP Address</TableHeader>
                  <TableHeader>Action</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditData.events.slice(0, 10).map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{formatTime(event.createdAt)}</TableCell>
                    <TableCell>{event.user?.email || 'Unknown'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {event.ipAddress || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge color="amber">{formatAction(event.action)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Text className="text-zinc-500">
                No security warnings in the last 24 hours
              </Text>
            </div>
          )}
        </Card>
      </div>

      {/* Health Checks */}
      <div className="mt-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-100 rounded-lg">
                <ShieldCheckIcon className="h-5 w-5 text-zinc-600" />
              </div>
              <div>
                <Heading level={3}>Health Checks</Heading>
                <Text className="text-sm text-zinc-500">
                  Production service status
                </Text>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {healthResults && (
                <Badge
                  color={
                    healthResults.summary.failed > 0
                      ? 'red'
                      : healthResults.summary.warnings > 0
                        ? 'amber'
                        : 'green'
                  }
                >
                  {healthResults.summary.failed === 0 && healthResults.summary.warnings === 0
                    ? 'ALL HEALTHY'
                    : `${healthResults.summary.failed + healthResults.summary.warnings} ISSUE${healthResults.summary.failed + healthResults.summary.warnings === 1 ? '' : 'S'}`}
                </Badge>
              )}
              <Button
                onClick={() => runChecksMutation.mutate()}
                disabled={runChecksMutation.isPending}
                color="secondary"
              >
                {runChecksMutation.isPending ? 'Checking...' : 'Run Checks'}
              </Button>
            </div>
          </div>

          {runChecksMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full" />
                <Text className="text-zinc-500">Running health checks...</Text>
              </div>
            </div>
          ) : healthResults ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4 p-3 bg-zinc-50 rounded-lg">
                <Text className="text-sm text-zinc-600">
                  <span className="font-semibold">
                    {healthResults.summary.passed}/{healthResults.summary.total}
                  </span>{' '}
                  checks passing
                </Text>
                {healthResults.summary.warnings > 0 && (
                  <>
                    <Text className="text-sm text-zinc-400">|</Text>
                    <Text className="text-sm text-amber-600">
                      {healthResults.summary.warnings} warning{healthResults.summary.warnings === 1 ? '' : 's'}
                    </Text>
                  </>
                )}
                {healthResults.timestamp && (
                  <>
                    <Text className="text-sm text-zinc-400">|</Text>
                    <Text className="text-sm text-zinc-500">
                      {new Date(healthResults.timestamp).toLocaleTimeString()}
                    </Text>
                  </>
                )}
              </div>

              {/* Health Checks by Category */}
              {groupedChecks &&
                Object.entries(groupedChecks).map(([category, checks]) => {
                  const hasIssues = checks.some((c) => c.status !== 'pass');
                  const hasFail = checks.some((c) => c.status === 'fail');
                  const isExpanded = expandedCategories.has(category);

                  return (
                    <div
                      key={category}
                      className="border border-zinc-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between p-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${
                              hasFail
                                ? 'text-red-600'
                                : hasIssues
                                  ? 'text-amber-600'
                                  : 'text-zinc-900'
                            }`}
                          >
                            {category}
                          </span>
                          <Badge
                            color={hasFail ? 'red' : hasIssues ? 'amber' : 'green'}
                          >
                            {checks.filter((c) => c.status === 'pass').length}/{checks.length}
                          </Badge>
                        </div>
                        <svg
                          className={`h-4 w-4 text-zinc-400 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-zinc-100">
                          {checks.map((check, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 p-3"
                            >
                              {check.status === 'pass' ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                              ) : check.status === 'warn' ? (
                                <ExclamationCircleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <Text
                                  className={`text-sm font-medium ${
                                    check.status === 'fail'
                                      ? 'text-red-600'
                                      : check.status === 'warn'
                                        ? 'text-amber-600'
                                        : 'text-zinc-700'
                                  }`}
                                >
                                  {check.name}
                                </Text>
                                <Text className="text-xs text-zinc-500 mt-0.5">
                                  {check.message}
                                </Text>
                              </div>
                              {check.latencyMs !== undefined && (
                                <Text className="text-xs text-zinc-400 flex-shrink-0">
                                  {check.latencyMs}ms
                                </Text>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

              {healthResults.error && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <Text className="text-sm text-red-600">
                    Error: {healthResults.error}
                  </Text>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Text className="text-zinc-500">
                Click &quot;Run Checks&quot; to verify production services
              </Text>
            </div>
          )}
        </Card>
      </div>
    </Container>
  );
}
