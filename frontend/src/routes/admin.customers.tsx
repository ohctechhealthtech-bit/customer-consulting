import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Eye, Search } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminFetch } from "@/lib/admin-api";

type QuestionResponse = {
  questionKey: string;
  label: string;
  section: string;
  fieldType: string;
  value: string;
};

type CustomerDetail = {
  id: number;
  reference: string;
  name: string;
  email: string;
  mobile: string | null;
  dateOfBirth: string | null;
  consent: "Accepted" | "Rejected";
  submittedAt: string | null;
  responses: QuestionResponse[];
};

export const Route = createFileRoute("/admin/customers")({
  head: () => ({ meta: [{ title: "Patients — Admin Console" }] }),
  component: CustomersPage,
});

type Customer = {
  id: number;
  reference: string;
  name: string;
  email: string;
  mobile: string;
  consent: "Accepted" | "Rejected";
  submittedAt: string;
};

type CustomersResponse = {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const PAGE_SIZE = 8;

function CustomersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<string>("date-desc");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomersResponse | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      params.set("sort", sort);
      if (q) params.set("search", q);
      if (status !== "all") params.set("status", status);

      const result = await adminFetch<CustomersResponse>(
        `/api/admin/customers?${params.toString()}`,
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }, [page, q, status, sort]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const customers = data?.customers ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

  const handleSearch = (value: string) => {
    setQ(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

  const handleView = async (customer: Customer) => {
    setView(customer);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await adminFetch<CustomerDetail>(
        `/api/admin/customers/${customer.id}`,
      );
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load patient detail");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <AdminLayout title="Patients">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, email, reference…"
              className="h-10 pl-9"
            />
          </div>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-10 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="h-10 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest first</SelectItem>
              <SelectItem value="date-asc">Oldest first</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Loading patients…
            </div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-500">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.reference}>
                    <TableCell className="font-mono text-xs">{c.reference}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell>{c.mobile}</TableCell>
                    <TableCell>
                      <Badge variant={c.consent === "Accepted" ? "default" : "secondary"}>
                        {c.consent}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(c.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleView(c)}>
                        <Eye className="mr-1 h-4 w-4" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No patients match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
          <div className="text-muted-foreground">
            Showing {customers.length} of {pagination.total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-xs">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{view?.name}</DialogTitle>
            <DialogDescription className="font-mono text-xs">{view?.reference}</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading patient detail…</div>
          ) : detailError ? (
            <div className="py-8 text-center text-sm text-red-500">{detailError}</div>
          ) : view && view.consent === "Rejected" ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info k="Email" v={view.email} />
              <Info k="Consent" v={view.consent} />
              <Info k="Submitted" v={new Date(view.submittedAt).toLocaleString()} />
            </dl>
          ) : detail ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info k="Email" v={detail.email} />
                <Info k="Mobile" v={detail.mobile} />
                <Info k="Date of Birth" v={detail.dateOfBirth ? new Date(detail.dateOfBirth).toLocaleDateString() : null} />
                <Info k="Consent" v={detail.consent} />
                <Info k="Submitted" v={detail.submittedAt ? new Date(detail.submittedAt).toLocaleString() : null} />
              </dl>
              {detail.responses.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Questionnaire Responses</h4>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    {detail.responses.map((r) => (
                      <Info key={r.questionKey} k={r.label} v={r.value} />
                    ))}
                  </dl>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Info({ k, v }: { k: string; v?: string | null }) {
  if (v == null || v === "") return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="font-medium">{v}</div>
    </div>
  );
}
