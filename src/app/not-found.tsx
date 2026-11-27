import Link from "next/link";

/** 404: on brand, plain, with a way back. */
export default function NotFound() {
  return (
    <main className="not-found">
      <p className="label">404</p>
      <h1 className="font-display not-found-title">This page is not here.</h1>
      <p className="not-found-text">The address may have changed.</p>
      <Link href="/" className="btn-primary">
        Back to SLAY BRAIDS
      </Link>
    </main>
  );
}
