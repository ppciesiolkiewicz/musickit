"use client";

import { Component, type ReactNode } from "react";
import { Notice } from "@/components/ui";
import Icon from "@/components/Icon";

/**
 * Catches a tool that throws while it draws, so one broken tool shows a line in its place and the rest of the block
 * (its text, the other tools, the page) still works. Every tool cell in the reader sits in one.
 */
export default class ToolBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("A tool failed to draw", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Notice tone="warn" icon={<Icon name="alert-triangle" size={16} />}>
        This tool couldn&apos;t load. Reload the page to try again.
      </Notice>
    );
  }
}
