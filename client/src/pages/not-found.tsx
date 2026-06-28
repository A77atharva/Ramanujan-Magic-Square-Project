import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
      <h1 className="text-6xl font-bold font-serif text-purple-heading">404</h1>
      <p className="text-purple-heading/60 font-sans">Page not found.</p>
      <Link href="/" className="btn-gold px-8 py-3 text-sm font-semibold rounded-xl inline-block">Go Home</Link>
    </div>
  );
}
