import type { Permission } from "@/features/account/model";

/** One card on /admin: a half of the admin area and the permission that opens it. */
export interface HubSection {
  href: "/admin/content" | "/admin/admin";
  label: string;
  desc: string;
  permission: Permission;
}

export const HUB_SECTIONS: HubSection[] = [
  { href: "/admin/content", label: "Content", desc: "The library, the learning path, the riff maker and the other tools for writing and recording lessons.", permission: "content" },
  { href: "/admin/admin", label: "Admin", desc: "Players' messages, accounts and teacher invites.", permission: "admin" },
];

/** The cards for what the viewer may open. */
export const hubSections = (open: readonly Permission[]): HubSection[] => HUB_SECTIONS.filter((s) => open.includes(s.permission));
