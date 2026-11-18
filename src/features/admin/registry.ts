/** One page under /admin. */
export interface AdminPage {
  href: string;
  label: string;
  desc: string;
}

/** The /admin index; a new page is one entry here and one page under src/app/admin. */
export const ADMIN_PAGES: AdminPage[] = [
  { href: "/admin/messages", label: "Messages", desc: "Messages from signed-in players (the chat bubble and Send feedback) and the contact form: read, reply, close." },
];
