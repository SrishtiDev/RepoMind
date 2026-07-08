"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFile = parseFile;
const tree_sitter_1 = __importDefault(require("tree-sitter"));
// @ts-ignore
const tree_sitter_typescript_1 = __importDefault(require("tree-sitter-typescript"));
// @ts-ignore
const tree_sitter_javascript_1 = __importDefault(require("tree-sitter-javascript"));
// Initialize parsers for the supported languages
const tsParser = new tree_sitter_1.default();
tsParser.setLanguage(tree_sitter_typescript_1.default.typescript);
const tsxParser = new tree_sitter_1.default();
tsxParser.setLanguage(tree_sitter_typescript_1.default.tsx);
const jsParser = new tree_sitter_1.default();
jsParser.setLanguage(tree_sitter_javascript_1.default);
/**
 * Parses a file's content into an AST using tree-sitter based on its extension.
 * Currently supports .ts, .tsx, .js, and .jsx files.
 * @param filepath - The path of the file being parsed
 * @param content - The source code of the file
 * @returns The parsed AST Tree, or null if the file extension is unsupported or parsing fails
 */
function parseFile(filepath, content) {
    try {
        if (filepath.endsWith(".ts"))
            return tsParser.parse(content);
        if (filepath.endsWith(".tsx"))
            return tsxParser.parse(content);
        if (filepath.endsWith(".js") || filepath.endsWith(".jsx"))
            return jsParser.parse(content);
        // Ignore unsupported files
        return null;
    }
    catch (err) {
        console.error(`[Structural Parser] Failed to parse file: ${filepath}`, err);
        return null;
    }
}
//# sourceMappingURL=parser.js.map