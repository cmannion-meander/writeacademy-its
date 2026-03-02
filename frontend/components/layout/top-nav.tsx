import Link from "next/link";
import Image from "next/image";

export function TopNav() {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between px-6 h-14">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/images/logo.png"
            alt="Write Academy"
            width={160}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/blog"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:inline"
          >
            Blog
          </Link>
          <Link
            href="/support"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:inline"
          >
            Support
          </Link>
          {/* Student avatar placeholder */}
          <div className="w-8 h-8 rounded-full bg-[#F59E42] flex items-center justify-center text-white text-xs font-bold shrink-0">
            S
          </div>
        </nav>
      </div>
    </header>
  );
}
