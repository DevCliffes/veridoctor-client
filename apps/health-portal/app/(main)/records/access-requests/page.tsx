"use client";

import { useEffect, useState, useCallback } from "react";
import { axiosClient } from "@veridoctor/api-client";
import { LucideChevronLeft, LucideChevronRight, LucideLoader2, LucideSearch } from "@veridoctor/design/icons";
import Link from "next/link";

type AccessRequestStatus = "pending" | "approved" | "denied" | "all";

type AccessRequest = {
  id: string;
  provider_name: string;
  speciality: string;
  access_status: "pending" | "approved" | "denied";
  created_at: string;
};

type PaginatedResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AccessRequest[];
};

const PAGE_SIZE = 20;

const TABS: { label: string; value: AccessRequestStatus }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Denied", value: "denied" },
  { label: "All", value: "all" },
];

const STATUS_STYLES: Record<AccessRequest["access_status"], string> = {
  pending: "text-amber-600 bg-amber-50",
  approved: "text-green-600 bg-green-50",
  denied: "text-red-600 bg-red-50",
};

export default function AccessRequestsPage() {
  const [activeTab, setActiveTab] = useState<AccessRequestStatus>("pending");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input so we don't fire a request on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 whenever the tab or search term changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get<PaginatedResponse>("records/access-requests/", {
        params: {
          status: activeTab,
          page,
          page_size: PAGE_SIZE,
          search: debouncedSearch || undefined,
        },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Couldn't load access requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, debouncedSearch]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <Link href="/records" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <LucideChevronLeft className="h-4 w-4" />
          Back to Health Records
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-1">Access Requests</h1>
      <p className="text-gray-500 mb-6">
        {data ? `${data.count} total request${data.count === 1 ? "" : "s"}` : "Loading…"}
      </p>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by doctor name or speciality"
          className="w-full pl-9 pr-3 h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LucideLoader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <p className="text-red-600 text-center py-8">{error}</p>
      ) : !data || data.results.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No requests found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.results.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3"
            >
              <div>
                <p className="font-medium">{req.provider_name}</p>
                <p className="text-sm text-gray-500">{req.speciality}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(req.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full capitalize ${STATUS_STYLES[req.access_status]}`}
              >
                {req.access_status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.count > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!data.previous || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40"
          >
            <LucideChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data.next || loading}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40"
          >
            Next
            <LucideChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
