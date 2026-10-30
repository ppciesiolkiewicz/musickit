import ts from "typescript";

export interface PropDoc { name: string; type: string; required: boolean; description: string }
export interface ComponentDoc { name: string; kind: "basic" | "guided" | "shape"; description: string; props: PropDoc[] }

const KINDS = ["basic", "guided", "shape"];

function commentText(c: string | ts.NodeArray<ts.JSDocComment> | undefined): string {
  return typeof c === "string" ? c : c ? ts.getTextOfJSDocComment(c) ?? "" : "";
}

/** Extract docs for every interface tagged `@component <name> <kind>`. */
export function extractDocs(source: string): ComponentDoc[] {
  const sf = ts.createSourceFile("props.ts", source, ts.ScriptTarget.Latest, true);
  const out: ComponentDoc[] = [];
  sf.forEachChild((node) => {
    if (!ts.isInterfaceDeclaration(node)) return;
    const tag = ts.getJSDocTags(node).find((t) => t.tagName.text === "component");
    if (!tag) return;
    const [name, kind] = commentText(tag.comment).trim().split(/\s+/);
    if (!name || !KINDS.includes(kind)) throw new Error(`${node.name.text}: @component needs "<name> <basic|guided|shape>"`);
    const doc = node.getChildren(sf).filter(ts.isJSDoc).pop();
    const props: PropDoc[] = [];
    for (const m of node.members) {
      if (!ts.isPropertySignature(m) || !m.type) continue;
      const pd = m.getChildren(sf).filter(ts.isJSDoc).pop();
      props.push({ name: m.name.getText(sf), type: m.type.getText(sf), required: !m.questionToken, description: commentText(pd?.comment).trim() });
    }
    out.push({ name, kind: kind as ComponentDoc["kind"], description: commentText(doc?.comment).trim(), props });
  });
  return out;
}
