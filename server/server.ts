import { createConnection, ProposedFeatures, TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocumentSyncKind } from 'vscode-languageserver-protocol';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

// Crear una conexión para el servidor de lenguaje usando stdio
const reader = new StreamMessageReader(process.stdin);
const writer = new StreamMessageWriter(process.stdout);
const connection = createConnection(reader, writer);

console.log('Servidor de lenguaje creado.');

const documents = new TextDocuments(TextDocument);

// Expresiones regulares para identificar símbolos en VB.NET
const functionRegex = /(?:Public |Private |Protected |Friend )?Function\s+(\w+)/g;
const subroutineRegex = /(?:Public |Private |Protected |Friend )?Sub\s+(\w+)/g;
const classRegex = /(?:Public |Private |Protected |Friend )?Class\s+(\w+)/g;
const structureRegex = /(?:Public |Private |Protected |Friend )?Structure\s+(\w+)/g;
const enumRegex = /(?:Public |Private |Protected |Friend )?Enum\s+(\w+)/g;
const interfaceRegex = /(?:Public |Private |Protected |Friend )?Interface\s+(\w+)/g;
const propertyRegex = /(?:Public |Private |Protected |Friend )?Property\s+(\w+)/g;
const eventRegex = /(?:Public |Private |Protected |Friend )?Event\s+(\w+)/g;
const variableRegex = /\s*(Dim|Const)\s+(\w+)/g;

const regexList = [
  { regex: functionRegex, kind: 1, type: 'Function' }, // vscode.SymbolKind.Function
  { regex: subroutineRegex, kind: 2, type: 'Subroutine' }, // vscode.SymbolKind.Method
  { regex: classRegex, kind: 5, type: 'Class' }, // vscode.SymbolKind.Class
  { regex: structureRegex, kind: 23, type: 'Structure' }, // vscode.SymbolKind.Struct
  { regex: enumRegex, kind: 13, type: 'Enum' }, // vscode.SymbolKind.Enum
  { regex: interfaceRegex, kind: 11, type: 'Interface' }, // vscode.SymbolKind.Interface
  { regex: propertyRegex, kind: 9, type: 'Property' }, // vscode.SymbolKind.Property
  { regex: eventRegex, kind: 24, type: 'Event' }, // vscode.SymbolKind.Event
  { regex: variableRegex, kind: 7, type: 'Variable' } // vscode.SymbolKind.Variable
];

// Escuchar eventos de conexión
connection.onInitialize(() => {
  console.log('Servidor de lenguaje inicializado.');
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental, // Sincronización incremental de documentos
      documentSymbolProvider: true, // Proveedor de símbolos
    },
  };
});

// Escuchar cambios en los documentos
documents.onDidChangeContent((change) => {
  const document = change.document;
  const symbols = analyzeDocument(document);
  connection.sendNotification('symbols', symbols); // Enviar símbolos al cliente
});

// Función para analizar un documento y extraer símbolos
function analyzeDocument(document: TextDocument): any[] {
  try {
    const symbols: any[] = [];
    let match;

    regexList.forEach(({ regex, kind, type }) => {
      while ((match = regex.exec(document.getText()))) {
        const symbolName = match[1] || match[2];
        const startPosition = document.positionAt(match.index);
        const endPosition = document.positionAt(match.index + match[0].length);

        symbols.push({
          name: symbolName,
          kind: kind,
          type: type,
          range: {
            start: { line: startPosition.line, character: startPosition.character },
            end: { line: endPosition.line, character: endPosition.character }
          }
        });
      }
    });

    return symbols;
  } catch (error) {
    console.error('Error al analizar el documento:', error);
    return [];
  }
}

// Escuchar documentos y conexión
documents.listen(connection);
connection.listen();

console.log('Servidor de lenguaje escuchando...');