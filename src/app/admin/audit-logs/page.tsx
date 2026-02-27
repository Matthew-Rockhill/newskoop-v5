'use client';

import { useState, useCallback, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, Fieldset, Label } from '@/components/ui/fieldset';
import { Text } from '@/components/ui/text';

interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    name: string;
  };
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

const ACTION_CATEGORIES = [
  { value: '', label: 'All Actions' },
  { value: 'auth.login', label: 'Login' },
  { value: 'auth.login.failed', label: 'Failed Login' },
  { value: 'auth.logout', label: 'Logout' },
  { value: 'auth.password', label: 'Password Changes' },
  { value: 'user.create', label: 'User Created' },
  { value: 'user.update', label: 'User Updated' },
  { value: 'user.delete', label: 'User Deleted' },
  { value: 'station.create', label: 'Station Created' },
  { value: 'station.update', label: 'Station Updated' },
  { value: 'content.create', label: 'Content Created' },
  { value: 'content.update', label: 'Content Updated' },
  { value: 'content.publish', label: 'Content Published' },
];

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    'auth.login': 'Login',
    'auth.login.failed': 'Failed Login',
    'auth.logout': 'Logout',
    'auth.password.reset.request': 'Password Reset Request',
    'auth.password.reset': 'Password Reset',
    'auth.password.change': 'Password Change',
    'user.create': 'User Created',
    'user.update': 'User Updated',
    'user.delete': 'User Deleted',
    'user.activate': 'User Activated',
    'user.deactivate': 'User Deactivated',
    'station.create': 'Station Created',
    'station.update': 'Station Updated',
    'station.delete': 'Station Deleted',
    'station.activate': 'Station Activated',
    'station.deactivate': 'Station Deactivated',
    'content.create': 'Content Created',
    'content.update': 'Content Updated',
    'content.delete': 'Content Deleted',
    'content.publish': 'Content Published',
    'content.unpublish': 'Content Unpublished',
  };
  return labels[action] || action;
}

function getActionColor(action: string): 'blue' | 'green' | 'red' | 'yellow' | 'zinc' {
  if (action.includes('failed')) return 'red';
  if (action.startsWith('auth')) return 'blue';
  if (action.includes('delete') || action.includes('deactivate')) return 'red';
  if (action.includes('create') || action.includes('activate') || action.includes('publish')) return 'green';
  return 'zinc';
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, perPage: 25, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('30');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: '25',
      });

      if (actionFilter) params.set('action', actionFilter);

      if (dateRangeFilter) {
        const days = parseInt(dateRangeFilter);
        params.set('startDate', startOfDay(subDays(new Date(), days)).toISOString());
        params.set('endDate', endOfDay(new Date()).toISOString());
      }

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const data: AuditLogResponse = await response.json();

      if (response.ok) {
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (_error) {
      console.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, dateRangeFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Audit Logs"
          description="Track all system actions and user activity"
        />

        {/* Filters */}
        <Fieldset className="mb-6">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <Label>Action</Label>
                <Select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  {ACTION_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field>
                <Label>Date Range</Label>
                <Select
                  value={dateRangeFilter}
                  onChange={(e) => {
                    setDateRangeFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </Select>
              </Field>

              <Field>
                <Label>Total Results</Label>
                <Input
                  readOnly
                  value={`${pagination.total} entries`}
                  className="bg-zinc-50"
                />
              </Field>
            </div>
          </FieldGroup>
        </Fieldset>

        {/* Audit Log Table */}
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Timestamp</TableHeader>
                <TableHeader>User</TableHeader>
                <TableHeader>Action</TableHeader>
                <TableHeader>Target</TableHeader>
                <TableHeader>IP Address</TableHeader>
                <TableHeader>Details</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <>
                    <TableRow key={log.id} className="cursor-pointer hover:bg-zinc-50">
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{log.user.name}</div>
                          <div className="text-xs text-zinc-500">{log.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge color={getActionColor(log.action)}>
                          {formatAction(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600">
                        {log.entityType || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500 font-mono">
                        {log.ipAddress || '-'}
                      </TableCell>
                      <TableCell>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <Button
                            plain
                            onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                          >
                            {expandedRow === log.id ? 'Hide' : 'View'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedRow === log.id && log.metadata && (
                      <TableRow key={`${log.id}-detail`}>
                        <TableCell colSpan={6}>
                          <pre className="overflow-auto rounded bg-zinc-50 p-3 text-xs font-mono max-h-48">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Text className="text-sm text-zinc-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </Text>
            <div className="flex gap-2">
              <Button
                color="white"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                color="white"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
