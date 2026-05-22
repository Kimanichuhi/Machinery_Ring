// src/components/dashboard/MechanisationOverview.tsx
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Tractor,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { MechanisationJob, MechanisationStatus } from '@/types';
import { format } from 'date-fns';

interface MechanisationOverviewProps {
  jobs: MechanisationJob[];
}

export function MechanisationOverview({ jobs }: MechanisationOverviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.farmerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.machineryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.localMrName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort by date (most recent first)
  const sortedJobs = [...filteredJobs].sort((a, b) => 
    new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );

  // Status counts
  const statusCounts = {
    pending: jobs.filter(j => j.status === 'pending-approval').length,
    approved: jobs.filter(j => j.status === 'approved').length,
    inProgress: jobs.filter(j => j.status === 'in-progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    rejected: jobs.filter(j => j.status === 'rejected').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
  };

  const formatCurrency = (value: number) => {
    return `KES ${value.toLocaleString()}`;
  };

  const getStatusBadge = (status: MechanisationStatus) => {
    switch (status) {
      case 'pending-approval':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-blue-500 text-blue-600">
            <CheckCircle className="w-3 h-3" /> Approved
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge className="flex items-center gap-1 bg-blue-500">
            <Tractor className="w-3 h-3" /> In Progress
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Completed
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Cancelled
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{statusCounts.pending}</p>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{statusCounts.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2">
            <Tractor className="w-5 h-5 text-indigo-500" />
            <div>
              <p className="text-2xl font-bold">{statusCounts.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{statusCounts.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{statusCounts.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-gray-500">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-2xl font-bold">{statusCounts.cancelled}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card variant="elevated">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tractor className="w-5 h-5" />
            Mechanisation Jobs Overview
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[180px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending-approval">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Machinery</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Local MR</TableHead>
                  <TableHead className="text-center">Acreage</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedJobs.slice(0, 20).map((job) => (
                  <TableRow key={job.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{job.farmerName || 'N/A'}</TableCell>
                    <TableCell>{job.machineryName}</TableCell>
                    <TableCell className="capitalize">{job.serviceType}</TableCell>
                    <TableCell>{job.localMrName || 'N/A'}</TableCell>
                    <TableCell className="text-center">{job.acreage}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(job.totalPrice)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(job.scheduledDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {sortedJobs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No mechanisation jobs found matching your filters.
            </div>
          )}
          
          {sortedJobs.length > 20 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Showing 20 of {sortedJobs.length} jobs
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
