import Parser, { Tree } from "tree-sitter";
// @ts-ignore
import tsGrammars from "tree-sitter-typescript";
// @ts-ignore
import jsGrammar from "tree-sitter-javascript";

// Initialize parsers for the supported languages
const tsParser = new Parser();
tsParser.setLanguage(tsGrammars.typescript);

const tsxParser = new Parser();
tsxParser.setLanguage(tsGrammars.tsx);

const jsParser = new Parser();
jsParser.setLanguage(jsGrammar);

/**
 * Parses a file's content into an AST using tree-sitter based on its extension.
 * Currently supports .ts, .tsx, .js, and .jsx files.
 * @param filepath - The path of the file being parsed
 * @param content - The source code of the file
 * @returns The parsed AST Tree, or null if the file extension is unsupported or parsing fails
 */
export function parseFile(filepath: string, content: string): Tree | null {
  try {
    if (filepath.endsWith(".ts")) return tsParser.parse(content);
    if (filepath.endsWith(".tsx")) return tsxParser.parse(content);
    if (filepath.endsWith(".js") || filepath.endsWith(".jsx")) return jsParser.parse(content);
    
    // Ignore unsupported files
    return null;
  } catch (err) {
    console.error(`[Structural Parser] Failed to parse file: ${filepath}`, err);
    return null;
  }
}
