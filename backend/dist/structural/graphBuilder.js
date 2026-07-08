"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGraph = buildGraph;
const graphology_1 = require("graphology");
const path_1 = __importDefault(require("path"));
/**
 * Builds a graphology DirectedGraph from extracted file data.
 * Call resolution works for:
 *  (a) same-file functions (direct matches by name)
 *  (b) cross-file functions (if explicitly imported and exported by the target file)
 * Unresolvable calls (e.g., globals, deeply nested members, dynamic imports) are skipped.
 */
function buildGraph(files) {
    const graph = new graphology_1.DirectedGraph({ multi: false, allowSelfLoops: true });
    const fileExports = new Map(); // filepath -> (functionName -> nodeKey)
    const fileFunctions = new Map(); // filepath -> (functionName -> nodeKey)
    // First pass: Create nodes and 'contains' edges
    for (const file of files) {
        graph.addNode(file.filepath, { type: "file" });
        if (!fileExports.has(file.filepath))
            fileExports.set(file.filepath, new Map());
        if (!fileFunctions.has(file.filepath))
            fileFunctions.set(file.filepath, new Map());
        for (const func of file.functions) {
            const nodeKey = `function:${file.filepath}:${func.name}:${func.startLine}`;
            graph.addNode(nodeKey, {
                type: "function",
                filepath: file.filepath,
                name: func.name,
                startLine: func.startLine,
                endLine: func.endLine,
            });
            graph.addDirectedEdge(file.filepath, nodeKey, { type: "contains" });
            fileFunctions.get(file.filepath).set(func.name, nodeKey);
            if (func.isExported) {
                fileExports.get(file.filepath).set(func.name, nodeKey);
            }
        }
        for (const cls of file.classes) {
            const nodeKey = `class:${file.filepath}:${cls.name}`;
            graph.addNode(nodeKey, {
                type: "class",
                filepath: file.filepath,
                name: cls.name,
                startLine: cls.startLine,
                endLine: cls.endLine,
                extendsClass: cls.extendsClass,
            });
            graph.addDirectedEdge(file.filepath, nodeKey, { type: "contains" });
        }
    }
    const resolveImportPath = (sourceFilepath, importSource) => {
        if (!importSource.startsWith("."))
            return null;
        const dir = path_1.default.dirname(sourceFilepath);
        const resolvedPathBase = path_1.default.normalize(path_1.default.join(dir, importSource));
        for (const ext of ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"]) {
            const tryPath = resolvedPathBase + ext;
            if (files.some((f) => f.filepath === tryPath))
                return tryPath;
        }
        return null;
    };
    // Second pass: Add relationship edges (imports, calls, extends)
    for (const file of files) {
        const importResolution = new Map(); // imported name -> target filepath
        // Process imports
        for (const imp of file.imports) {
            const targetPath = resolveImportPath(file.filepath, imp.source);
            if (targetPath) {
                if (!graph.hasEdge(file.filepath, targetPath)) {
                    graph.addDirectedEdge(file.filepath, targetPath, { type: "imports" });
                }
                for (const name of imp.importedNames) {
                    importResolution.set(name, targetPath);
                }
            }
            else {
                const extNodeKey = `external:${imp.source}`;
                if (!graph.hasNode(extNodeKey)) {
                    graph.addNode(extNodeKey, { type: "external", source: imp.source });
                }
                if (!graph.hasEdge(file.filepath, extNodeKey)) {
                    graph.addDirectedEdge(file.filepath, extNodeKey, { type: "imports" });
                }
            }
        }
        // Process calls
        for (const call of file.calls) {
            const callerKey = fileFunctions.get(file.filepath)?.get(call.callerName);
            if (!callerKey)
                continue; // Should not happen since we extract calls within functions
            // Rule a: Same file
            let calleeKey = fileFunctions.get(file.filepath)?.get(call.calleeName);
            // Rule b: Imported from another file
            if (!calleeKey && importResolution.has(call.calleeName)) {
                const targetPath = importResolution.get(call.calleeName);
                calleeKey = fileExports.get(targetPath)?.get(call.calleeName);
            }
            if (calleeKey) {
                if (!graph.hasEdge(callerKey, calleeKey)) {
                    graph.addDirectedEdge(callerKey, calleeKey, { type: "calls" });
                }
            }
        }
        // Process extends
        for (const cls of file.classes) {
            if (cls.extendsClass) {
                const clsKey = `class:${file.filepath}:${cls.name}`;
                let superKey = `class:${file.filepath}:${cls.extendsClass}`;
                if (!graph.hasNode(superKey)) {
                    if (importResolution.has(cls.extendsClass)) {
                        const targetPath = importResolution.get(cls.extendsClass);
                        superKey = `class:${targetPath}:${cls.extendsClass}`;
                    }
                }
                if (graph.hasNode(superKey)) {
                    if (!graph.hasEdge(clsKey, superKey)) {
                        graph.addDirectedEdge(clsKey, superKey, { type: "extends" });
                    }
                }
            }
        }
    }
    return graph;
}
//# sourceMappingURL=graphBuilder.js.map