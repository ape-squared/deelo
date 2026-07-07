import { Suspense } from 'react';
import AdminLoginForm from './login-form';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted">Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
