import type { ComponentProps, ReactNode } from "react";
import PageShell from "@/components/PageShell";
import Icon from "@/components/Icon";
import { Notice } from "@/components/ui";

/**
 * The frame of every course page (the index and each section): `PageShell` on `/course`, with the
 * work-in-progress notice over the page's own header, so a player on any section sees the course is still being written.
 */
export default function CourseShell({ header, children, ...rest }: Omit<ComponentProps<typeof PageShell>, "active" | "header"> & { header: ReactNode }) {
  return (
    <PageShell
      {...rest}
      active="/course"
      header={
        <div className="flex flex-col gap-5">
          <Notice tone="warn" icon={<Icon name="pencil" size={16} />}>
            <strong className="font-semibold text-slate-100">This course is a work in progress.</strong> New sections are added often, and some are still being written.
          </Notice>
          {header}
        </div>
      }
    >
      {children}
    </PageShell>
  );
}
