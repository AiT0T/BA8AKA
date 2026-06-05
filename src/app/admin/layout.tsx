"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { name: "网站信息管理", href: "/admin/site" },
  { name: "文章管理", href: "/admin/articles" },
  { name: "书签管理", href: "/admin/bookmarks" },
  { name: "任务清单", href: "/admin/todos" },
  { name: "友链管理", href: "/admin/friends" },
  { name: "相册管理", href: "/admin/photos" },
  { name: "健康管理", href: "/admin/fitness" },
  { name: "旅行管理", href: "/admin/travel" },
  { name: "图像影调分析", href: "/admin/image-analysis" },
  { name: "时间线管理", href: "/admin/timelines" },
  { name: "灵感管理", href: "/admin/inspirations" },
  { name: "项目管理", href: "/admin/projects" },
  { name: "Demo 管理", href: "/admin/demos" },
  { name: "技术栈", href: "/admin/stacks" },
  { name: "工作空间管理", href: "/admin/workspaces" },
  { name: "社交链接管理", href: "/admin/social-links" },
  { name: "工作经历管理", href: "/admin/work-experience" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isFullScreenEditPage =
    pathname === "/admin/articles/new" ||
    pathname.includes("/admin/articles/edit/") ||
    pathname === "/admin/timelines/new" ||
    pathname.includes("/admin/timelines/edit/") ||
    pathname.includes("/admin/project-requirements/edit/");

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth", {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="flex min-h-screen flex-1">
      {!isFullScreenEditPage && (
        <>
          {isDrawerOpen && (
            <div
              className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
              onClick={() => setIsDrawerOpen(false)}
            />
          )}

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="fixed left-4 top-4 z-20 rounded-md bg-white p-2 shadow-md lg:hidden"
            aria-label="打开后台菜单"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </>
      )}

      {!isFullScreenEditPage && (
        <aside
          className={`fixed z-30 h-full w-64 transform border-r bg-gray-50 transition-transform duration-300 ease-in-out lg:static ${
            isDrawerOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          <div className="flex items-center justify-between border-b p-4">
            <h1 className="text-xl font-bold">后台管理</h1>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              退出
            </button>
          </div>
          <nav className="h-[calc(100vh-61px)] overflow-auto p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsDrawerOpen(false)}
                      className={`block rounded-md px-4 py-2 ${
                        isActive
                          ? "bg-gray-200 text-gray-900"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      )}

      <main
        className={`h-[100vh] flex-1 overflow-auto bg-white ${
          isFullScreenEditPage ? "p-0" : "p-4 lg:ml-0 lg:p-6"
        }`}
      >
        <div className={isFullScreenEditPage ? "" : "mx-auto max-w-7xl"}>
          {children}
        </div>
      </main>
    </div>
  );
}
