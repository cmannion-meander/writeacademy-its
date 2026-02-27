"use client";

import { Facebook, Twitter, Instagram, Mail, ChevronUp } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#F59E42] px-6 py-6 mt-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-900 hover:text-gray-700"
            aria-label="Facebook"
          >
            <Facebook className="h-5 w-5" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-900 hover:text-gray-700"
            aria-label="Twitter"
          >
            <Twitter className="h-5 w-5" />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-900 hover:text-gray-700"
            aria-label="Instagram"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href="mailto:support@writeacademy.com"
            className="text-gray-900 hover:text-gray-700"
            aria-label="Email support"
          >
            <Mail className="h-5 w-5" />
          </a>
        </div>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="text-gray-900 hover:text-gray-700 p-1"
          aria-label="Back to top"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      </div>
    </footer>
  );
}
