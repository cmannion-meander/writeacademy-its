import Link from "next/link";
import Image from "next/image";

export function TopNav() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="Write Academy"
            width={180}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>
        <nav className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-900 hover:text-gray-600"
          >
            Dashboard
          </Link>
          <Link
            href="/blog"
            className="text-sm font-medium text-gray-900 hover:text-gray-600"
          >
            Blog
          </Link>
          <Link
            href="/support"
            className="text-sm font-medium text-gray-900 hover:text-gray-600"
          >
            Support
          </Link>
        </nav>
      </div>
    </header>
  );
}
