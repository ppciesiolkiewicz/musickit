/**
 * The design system: import everything from "@/components/ui", never from a folder inside it (lint enforces this).
 * Each component lives in its own folder; only that folder's index.ts is public, the other files are its private parts.
 *
 *   atoms      one element with one job: Button, Chip, Badge, Tag, Select, Slider, InfoButton, InfoBox
 *   molecules  a few atoms working together: ChipRow, Field, Info, InfoTip, Stepper
 *   organisms  self-contained blocks: Section, Modal
 */
export * from "./atoms/Badge";
export * from "./atoms/Button";
export * from "./atoms/Chip";
export * from "./atoms/InfoBox";
export * from "./atoms/InfoButton";
export * from "./atoms/Select";
export * from "./atoms/Slider";
export * from "./atoms/Tag";
export * from "./molecules/ChipRow";
export * from "./molecules/Field";
export * from "./molecules/Info";
export * from "./molecules/InfoTip";
export * from "./molecules/Stepper";
export * from "./organisms/Modal";
export * from "./organisms/Section";
