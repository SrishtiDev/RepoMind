import { Tree, SyntaxNode } from "tree-sitter";

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
export function extractFileData(filepath: string, tree: Tree): FileData {
  const data: FileData = {
    filepath,
    imports: [],
    functions: [],
    classes: [],
    calls: [],
  };

  walkNode(tree.rootNode, data, null);
  return data;
}

function isExported(node: SyntaxNode): boolean {
  let p = node.parent;
  while (p) {
    if (
      p.type === "export_statement" ||
      (p.type === "lexical_declaration" && p.parent?.type === "export_statement") ||
      (p.type === "variable_declaration" && p.parent?.type === "export_statement")
    ) {
      return true;
    }
    if (p.type === "program") break;
    p = p.parent;
  }
  return false;
}

function walkNode(node: SyntaxNode, data: FileData, currentCaller: string | null) {
  let nextCaller = currentCaller;

  if (node.type === "import_statement") {
    let source = "";
    const importedNames: Set<string> = new Set();

    // Source is typically a string at the end of the import statement
    const sourceNode = node.children.find((c) => c.type === "string");
    if (sourceNode) {
      source = sourceNode.text.replace(/['"]/g, "");
    }

    // Find identifiers in the import clause
    const importClause = node.children.find((c) => c.type === "import_clause");
    if (importClause) {
      const findIdentifiers = (n: SyntaxNode) => {
        if (n.type === "identifier") {
          importedNames.add(n.text);
        } else if (n.type === "import_specifier") {
          const nameNode = n.childForFieldName("name");
          if (nameNode) importedNames.add(nameNode.text);
        } else {
          n.children.forEach(findIdentifiers);
        }
      };
      findIdentifiers(importClause);
    }

    if (source) {
      data.imports.push({
        source,
        importedNames: Array.from(importedNames),
        filepath: data.filepath,
      });
    }
  } else if (
    node.type === "function_declaration" ||
    node.type === "method_definition" ||
    node.type === "arrow_function"
  ) {
    let name = "";

    if (node.type === "arrow_function") {
      if (node.parent?.type === "variable_declarator") {
        const idNode = node.parent.childForFieldName("name");
        if (idNode) name = idNode.text;
      } else if (node.parent?.type === "pair") {
        const keyNode = node.parent.childForFieldName("key");
        if (keyNode) name = keyNode.text;
      }
    } else {
      const idNode = node.childForFieldName("name");
      if (idNode) name = idNode.text;
    }

    if (name) {
      data.functions.push({
        name,
        filepath: data.filepath,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        isExported: isExported(node),
      });
      nextCaller = name;
    }
  } else if (node.type === "class_declaration") {
    let name = "";
    const idNode = node.childForFieldName("name");
    if (idNode) name = idNode.text;

    let extendsClass: string | undefined = undefined;
    const heritage = node.children.find((c) => c.type === "class_heritage");
    if (heritage) {
      const identifier = heritage.children.find(
        (c) =>
          c.type === "identifier" ||
          c.type === "type_identifier" ||
          c.type === "call_expression"
      );
      if (identifier) {
        extendsClass =
          identifier.type === "call_expression"
            ? identifier.childForFieldName("function")?.text
            : identifier.text;
      }
    }

    if (name) {
      data.classes.push({
        name,
        filepath: data.filepath,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        extendsClass,
        isExported: isExported(node),
      });
      nextCaller = name;
    }
  } else if (node.type === "call_expression" && currentCaller) {
    const functionNode = node.childForFieldName("function");
    if (functionNode) {
      let calleeName = functionNode.text;
      if (functionNode.type === "member_expression") {
        const propertyNode = functionNode.childForFieldName("property");
        if (propertyNode) calleeName = propertyNode.text;
      }
      data.calls.push({
        callerName: currentCaller,
        calleeName,
        filepath: data.filepath,
        line: node.startPosition.row + 1,
      });
    }
  }

  for (const child of node.children) {
    walkNode(child, data, nextCaller);
  }
}
