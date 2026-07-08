import { Tree } from "tree-sitter";
/**
 * Parses a file's content into an AST using tree-sitter based on its extension.
 * Currently supports .ts, .tsx, .js, and .jsx files.
 * @param filepath - The path of the file being parsed
 * @param content - The source code of the file
 * @returns The parsed AST Tree, or null if the file extension is unsupported or parsing fails
 */
export declare function parseFile(filepath: string, content: string): Tree | null;
//# sourceMappingURL=parser.d.ts.map