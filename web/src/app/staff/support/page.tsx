import Link from 'next/link';

export default function StaffSupportPage() {
  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-bold mb-2">Support tools</h1>
      <p className="text-muted text-sm mb-8">Quick links for helping users.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/staff/guilds" className="card p-6 hover:border-accent/40 transition">
          <h2 className="font-semibold">Guild lookup</h2>
          <p className="text-sm text-muted mt-1">Inspect plan, prefix, and subscription by server ID.</p>
        </Link>
        <Link href="/admin/users" className="card p-6 hover:border-accent/40 transition">
          <h2 className="font-semibold">Dashboard users</h2>
          <p className="text-sm text-muted mt-1">Email admin panel — requires admin login.</p>
        </Link>
        <Link href="/status" className="card p-6 hover:border-accent/40 transition">
          <h2 className="font-semibold">Public status</h2>
          <p className="text-sm text-muted mt-1">Share outage page with users.</p>
        </Link>
      </div>
    </div>
  );
}
