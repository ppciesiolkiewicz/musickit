/**
 * dependency-cruiser config for the `deps*` scripts in package.json.
 * Layers from the top down: app > features > components > lib. An import should point down or across, never up;
 * the rules below warn when one points up (the same check as /dev/structure and `npm run structure -- upward`).
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    { name: "lib-not-up", severity: "warn", comment: "lib is pure logic; it should not import UI or features", from: { path: "^src/lib/" }, to: { path: "^src/(app|features|components)/" } },
    { name: "components-not-up", severity: "warn", comment: "shared components should not import features or routes", from: { path: "^src/components/" }, to: { path: "^src/(app|features)/" } },
    { name: "features-not-app", severity: "warn", comment: "features should not import routes", from: { path: "^src/features/" }, to: { path: "^src/app/" } },
    { name: "no-circular", severity: "warn", from: {}, to: { circular: true } },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.tsx?$" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require", "node", "default"], extensions: [".ts", ".tsx", ".mts", ".js", ".mjs", ".cjs"] },
    reporterOptions: {
      // One box per package: src/features/plan, src/components/ui, src/lib/looper … (the loose files in src/lib are one box, lib; those in src/components are one box, components).
      archi: { collapsePattern: "^src/(app|features/[^/]+|components/[^/]+(?=/)|lib/[^/]+(?=/)|components|lib)" },
      dot: { collapsePattern: "node_modules/(@[^/]+/[^/]+|[^/]+)" },
    },
  },
};
