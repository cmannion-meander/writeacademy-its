"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  BookOpen,
  LayoutGrid,
  Library,
  List,
  Plus,
  Rocket,
  Tag,
  User,
  Wrench,
} from "lucide-react";

const navItems = [
  { title: "My Account", href: "/dashboard", icon: User },
  { title: "Courses", icon: Rocket, isCategory: true },
  {
    title: "Write Storybooks for ...",
    href: "/learn/write-storybooks-for-children/l1",
    indent: true,
  },
  { title: "Write Poetry", href: "/course/write-poetry", indent: true },
  {
    title: "Write Fiction Books",
    href: "/course/write-fiction-books",
    indent: true,
  },
  {
    title: "Write Romance Ficti...",
    href: "/course/write-romance-fiction",
    indent: true,
  },
  {
    title: "Write Young Adult Fi...",
    href: "/course/write-young-adult-fiction",
    indent: true,
  },
  {
    title: "Write Short Stori...",
    href: "/course/write-short-stories",
    icon: Plus,
    indent: true,
  },
  { title: "Free Writing Webi...", href: "/webinar", icon: Bookmark },
  { title: "Mini Courses", href: "/mini-courses", icon: BookOpen },
  { title: "Members Booksto...", href: "/bookstore", icon: Library },
  { title: "Writer's Toolbox", href: "/toolbox", icon: Wrench },
  { title: "Plot Library", href: "/plot-library", icon: LayoutGrid },
  { title: "A-Z Directory", href: "/directory", icon: List },
  { title: "Deals", href: "/deals", icon: Tag },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col py-4">
      {navItems.map((item, index) => {
        if (item.isCategory) {
          const Icon = item.icon as React.ElementType;
          return (
            <div
              key={index}
              className="px-4 py-2 text-xs font-semibold text-gray-400 flex items-center gap-2"
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.title}
            </div>
          );
        }

        const Icon = item.icon as React.ElementType | undefined;
        const isActive = item.href ? pathname.startsWith(item.href.split("/").slice(0, 3).join("/")) : false;

        return (
          <Link
            key={index}
            href={item.href || "#"}
            className={cn(
              "px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-900 transition-colors",
              item.indent && "pl-8",
              isActive ? "bg-gray-900 text-white" : "text-gray-300"
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
