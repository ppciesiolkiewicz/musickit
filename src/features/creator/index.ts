/**
 * The creator: music theory as plugins on a board, all following one key that can also be empty.
 *
 *   model/     the key choice, circle of fifths maths, chord voicings, general (no key) content: pure and tested
 *   plugins/   one component per theory panel, and the registry that lists them
 *   KeyProvider, KeyBar   the shared key and its selector
 *   CreatorApp   the page body
 *
 * Imports only the theory, sound and widgets features and the shared components. Never the looper or the guitar tools.
 */
export { default as CreatorApp } from "./CreatorApp";
export { useCreatorKey, CreatorKeyProvider, KeyScope } from "./KeyProvider";
export { default as KeyBar } from "./KeyBar";
export { EMPTY_KEY, keyContext, keyTitle, sanitiseKey, type KeyChoice } from "./model/key";
export { PLUGINS, type PluginDef } from "./plugins/registry";
