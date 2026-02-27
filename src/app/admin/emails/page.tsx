'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Heading } from '@/components/ui/heading';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, Fieldset, Label } from '@/components/ui/fieldset';
import { Dialog } from '@/components/ui/dialog';
import { EmailLog, EmailStatus, EmailType } from '@prisma/client';
import toast from 'react-hot-toast';
import { getEmailStatusColor } from '@/lib/color-system';

interface EmailLogWithUser extends EmailLog {
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailLogWithUser | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<EmailStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<EmailType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page] = useState(1);

  const fetchEmails = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: '20',
      });
      
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (searchQuery) params.append('query', searchQuery);
      
      const response = await fetch(`/api/admin/emails?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setEmails(data.emails);
      } else {
        toast.error('Failed to fetch emails');
      }
    } catch (_error) {
      toast.error('Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery, page]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const getTypeLabel = (type: EmailType) => {
    switch (type) {
      case 'WELCOME':
        return 'Welcome';
      case 'PASSWORD_RESET':
        return 'Password Reset';
      case 'MAGIC_LINK':
        return 'Magic Link';
      case 'NOTIFICATION':
        return 'Notification';
      case 'SYSTEM':
        return 'System';
      default:
        return type;
    }
  };

  const viewEmailDetails = (email: EmailLogWithUser) => {
    setSelectedEmail(email);
    setShowPreview(true);
  };

  const extractMagicLink = (metadata: any) => {
    if (metadata?.mode === 'console' && selectedEmail?.type === 'MAGIC_LINK') {
      // Try to extract link from subject or metadata
      const linkMatch = selectedEmail.subject.match(/http[s]?:\/\/[^\s]+/);
      return linkMatch ? linkMatch[0] : null;
    }
    return null;
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Email Logs"
          description="Track all emails sent by the system"
        />

        {/* Filters */}
      <Fieldset className="mb-6">
        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field>
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as EmailStatus | 'ALL')}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="DELIVERED">Delivered</option>
                <option value="FAILED">Failed</option>
                <option value="BOUNCED">Bounced</option>
              </Select>
            </Field>

            <Field>
              <Label>Type</Label>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as EmailType | 'ALL')}
              >
                <option value="ALL">All Types</option>
                <option value="WELCOME">Welcome</option>
                <option value="PASSWORD_RESET">Password Reset</option>
                <option value="MAGIC_LINK">Magic Link</option>
                <option value="NOTIFICATION">Notification</option>
                <option value="SYSTEM">System</option>
              </Select>
            </Field>

            <Field className="sm:col-span-2">
              <Label>Search</Label>
              <Input
                type="search"
                placeholder="Search by email or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Field>
          </div>
        </FieldGroup>
      </Fieldset>

      {/* Email Table */}
      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Recipient</TableHeader>
              <TableHeader>Subject</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Environment</TableHeader>
              <TableHeader>Sent At</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : emails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No emails found
                </TableCell>
              </TableRow>
            ) : (
              emails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{email.to}</div>
                      {email.user && (
                        <div className="text-sm text-zinc-500">
                          {email.user.firstName} {email.user.lastName}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {email.subject}
                  </TableCell>
                  <TableCell>
                    <Badge color="blue">{getTypeLabel(email.type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color={getEmailStatusColor(email.status)}>
                      {email.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color="zinc">{email.environment || 'Unknown'}</Badge>
                  </TableCell>
                  <TableCell>
                    {email.sentAt
                      ? format(new Date(email.sentAt), 'MMM d, yyyy HH:mm')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      plain
                      onClick={() => viewEmailDetails(email)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)}>
        {selectedEmail && (
          <div className="p-6">
            <Heading level={3}>Email Details</Heading>
            
            <div className="mt-4 space-y-4">
              <div>
                <Label>To</Label>
                <p className="mt-1">{selectedEmail.to}</p>
              </div>
              
              <div>
                <Label>Subject</Label>
                <p className="mt-1">{selectedEmail.subject}</p>
              </div>
              
              <div>
                <Label>Type</Label>
                <Badge color="blue">{getTypeLabel(selectedEmail.type)}</Badge>
              </div>
              
              <div>
                <Label>Status</Label>
                <Badge color={getEmailStatusColor(selectedEmail.status)}>
                  {selectedEmail.status}
                </Badge>
              </div>
              
              {selectedEmail.failureReason && (
                <div>
                  <Label>Failure Reason</Label>
                  <p className="mt-1 text-sm text-red-600">
                    {selectedEmail.failureReason}
                  </p>
                </div>
              )}
              
              {selectedEmail.metadata && (
                <div>
                  <Label>Metadata</Label>
                  <pre className="mt-1 overflow-auto rounded bg-zinc-50 p-2 text-xs">
                    {JSON.stringify(selectedEmail.metadata, null, 2)}
                  </pre>
                </div>
              )}
              
              {extractMagicLink(selectedEmail.metadata) && (
                <div>
                  <Label>Magic Link (Dev Mode)</Label>
                  <div className="mt-1">
                    <Input
                      readOnly
                      value={extractMagicLink(selectedEmail.metadata) || ''}
                      className="font-mono text-xs"
                    />
                    <Button
                      className="mt-2"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          extractMagicLink(selectedEmail.metadata) || ''
                        );
                        toast.success('Link copied to clipboard');
                      }}
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button plain onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      </div>
    </Container>
  );
}