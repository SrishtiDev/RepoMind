import { Tree } from "tree-sitter";
export interface ImportInfo {
    source: string;
    importedNames: string[];
    filepath: string;
}
export interface FunctionInfo {
    name: string;
    filepath: string;
    startLine: number;
    endLine: number;
    isExported: boolean;
}
export interface ClassInfo {
    name: string;
    filepath: string;
    startLine: number;
    endLine: number;
    extendsClass?: string;
    isExported: boolean;
}
export interface CallInfo {
    callerName: string;
    calleeName: string;
    filepath: string;
    line: number;
}
export interface FileData {
    filepath: string;
    imports: ImportInfo[];
    functions: FunctionInfo[];
    classes: ClassInfo[];
    calls: CallInfo[];
}
/**
 * Walks the AST to extract imports, functions, classes, and function calls.
 * Call resolution is NOT performed here, only raw extraction.
 */
export declare function extractFileData(filepath: string, tree: Tree): FileData;
//# sourceMappingURL=extractor.d.ts.map