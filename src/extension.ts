import * as vscode from 'vscode';

// Proveedor de símbolos para VB.NET
const documentSymbolProvider: vscode.DocumentSymbolProvider = {
  provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.DocumentSymbol[]> {
    return new Promise((resolve) => {
      const symbols: vscode.DocumentSymbol[] = [];
      let match;

      // console.log('Iniciando búsqueda de símbolos en el documento:', document.fileName);

      // Expresiones regulares para identificar funciones, subrutinas, clases, estructuras, enums, interfaces, propiedades, eventos y variables
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
        { regex: functionRegex, kind: vscode.SymbolKind.Function, type: 'Function' },
        { regex: subroutineRegex, kind: vscode.SymbolKind.Method, type: 'Subroutine' },
        { regex: classRegex, kind: vscode.SymbolKind.Class, type: 'Class' },
        { regex: structureRegex, kind: vscode.SymbolKind.Struct, type: 'Structure' },
        { regex: enumRegex, kind: vscode.SymbolKind.Enum, type: 'Enum' },
        { regex: interfaceRegex, kind: vscode.SymbolKind.Interface, type: 'Interface' },
        { regex: propertyRegex, kind: vscode.SymbolKind.Property, type: 'Property' },
        { regex: eventRegex, kind: vscode.SymbolKind.Event, type: 'Event' },
        { regex: variableRegex, kind: vscode.SymbolKind.Variable, type: 'Variable' }
      ];

      regexList.forEach(({ regex, kind, type }) => {
        if (token.isCancellationRequested) {
          // console.log('Búsqueda cancelada.');
          return resolve(symbols);
        }

        while ((match = regex.exec(document.getText()))) {
          const symbolName = match[1] || match[2];
          // console.log(`${type} encontrada: ${symbolName}`);
          const startPosition = document.positionAt(match.index);
          const endPosition = document.positionAt(match.index + match[0].length);
          symbols.push(new vscode.DocumentSymbol(
            symbolName, type, kind,
            new vscode.Range(startPosition, endPosition),
            new vscode.Range(startPosition, endPosition)
          ));
        }
      });

      // console.log('Símbolos extraídos del archivo:', symbols);
      resolve(symbols);
    });
  }
};

// Función para obtener todos los archivos .vb en el workspace
async function getAllVbFiles(): Promise<vscode.Uri[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    // console.log('No hay workspace abierto.');
    return [];
  }

  const vbFiles: vscode.Uri[] = [];
  for (const folder of workspaceFolders) {
    // console.log(`Buscando archivos .vb en: ${folder.uri.fsPath}`);
    const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*.vb'));
    vbFiles.push(...files);
  }

  // console.log(`Archivos .vb encontrados en el workspace: ${vbFiles.length}`);
  return vbFiles;
}

// Registrar el proveedor de símbolos para VB.NET
export function activate(context: vscode.ExtensionContext) {
  const provider = vscode.languages.registerDocumentSymbolProvider({ language: 'vbnet' }, documentSymbolProvider);
  context.subscriptions.push(provider);

  // Comando para validar símbolos en todos los archivos del workspace
  const validateSymbolsCommand = vscode.commands.registerCommand('vbnet-navigator.validateSymbols', async () => {
    try {
      const vbFiles = await getAllVbFiles();
      if (vbFiles.length === 0) {
        vscode.window.showErrorMessage('No se encontraron archivos .vb en el workspace.');
        return;
      }

      for (const file of vbFiles) {
        // console.log(`Analizando archivo: ${file.fsPath}`);
        const document = await vscode.workspace.openTextDocument(file);
        const symbols = await documentSymbolProvider.provideDocumentSymbols(document, new vscode.CancellationTokenSource().token);
        // console.log(`Símbolos encontrados en ${file.fsPath}:`, symbols);
      }

      vscode.window.showInformationMessage('Validación de símbolos completada.');
    } catch (error) {
      // console.error('Error al validar los símbolos: ', error);
      vscode.window.showErrorMessage('Error al validar los símbolos.');
    }
  });

  // Comando para buscar definiciones en todos los archivos del workspace
  const goToDefinitionCommand = vscode.commands.registerCommand('vbnet-navigator.goToDefinition', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No hay un editor activo.');
      return;
    }

    const document = editor.document;
    const position = editor.selection.active;
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      vscode.window.showErrorMessage('No se encontró una palabra bajo el cursor.');
      return;
    }

    const word = document.getText(wordRange).replace(/\(\)$/, '').trim();
    // console.log(`Buscando definición de: ${word}`);

    try {
      const vbFiles = await getAllVbFiles();
      if (vbFiles.length === 0) {
        vscode.window.showErrorMessage('No se encontraron archivos .vb en el workspace.');
        return;
      }

      let foundSymbol: vscode.DocumentSymbol | undefined;
      let foundFile: vscode.Uri | undefined;

      for (const file of vbFiles) {
        // console.log(`Buscando en archivo: ${file.fsPath}`);
        const document = await vscode.workspace.openTextDocument(file);
        const symbols = await documentSymbolProvider.provideDocumentSymbols(document, new vscode.CancellationTokenSource().token) as vscode.DocumentSymbol[] | undefined;
        if (!symbols) {
          // console.log('No se encontraron símbolos en el archivo:', file.fsPath);
          continue;
        }

        // Verificar que symbols sea un array de DocumentSymbol
        if (!Array.isArray(symbols)) {
          // console.log('No se encontraron símbolos en el archivo:', file.fsPath);
          continue;
        }

        // Buscar el símbolo que coincida con la palabra
        const match = symbols.find((symbol: vscode.DocumentSymbol) => {
          // console.log(`Comparando "${symbol.name}" con "${word}"`);
          return symbol.name.toLowerCase() === word.toLowerCase();
        });

        if (match) {
          foundSymbol = match;
          foundFile = file;
          break; // Terminar la búsqueda al encontrar la definición
        }
      }

      if (foundSymbol && foundFile) {
        // console.log(`Definición encontrada en: ${foundFile.fsPath}, línea ${foundSymbol.range.start.line + 1}`);
        const openedDocument = await vscode.workspace.openTextDocument(foundFile);
        const openedEditor = await vscode.window.showTextDocument(openedDocument);
        await openedEditor.revealRange(foundSymbol.range, vscode.TextEditorRevealType.InCenter);
        openedEditor.selection = new vscode.Selection(foundSymbol.range.start, foundSymbol.range.end);
      } else {
        // console.log('No se encontró la definición para:', word);
        vscode.window.showInformationMessage(`No se encontró la definición de "${word}".`);
      }
    } catch (error) {
      // console.error('Error en la búsqueda de definiciones: ', error);
      vscode.window.showErrorMessage('Error al buscar la definición.');
    }
  });

  context.subscriptions.push(validateSymbolsCommand, goToDefinitionCommand);
}

export function deactivate() {}