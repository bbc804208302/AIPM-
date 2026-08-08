"use client";

import { Activity, Database, Inbox, LayoutDashboard, Radio } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "产品需求看板", icon: LayoutDashboard },
  { href: "/intelligence", label: "AI 产品情报池", icon: Radio },
  { href: "/demands", label: "内部需求池", icon: Inbox },
  { href: "/sources", label: "数据源", icon: Database },
  { href: "/tasks", label: "采集任务", icon: Activity },
];

export function SidebarNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="工作空间">
      <ul className="nav-list">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link className={`nav-item${active ? " active" : ""}`} href={href} aria-current={active ? "page" : undefined}>
                <Icon size={15} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
