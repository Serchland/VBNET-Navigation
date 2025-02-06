import * as vscode from 'vscode';
import * as path from 'path';

// Índice de definiciones (almacena palabras clave y sus ubicaciones)
const definitionIndex: { [word: string]: vscode.Location } = {};

export function activate(context: vscode.ExtensionContext) {
    console.log('Extensión VB.NET Navigator activada.');

    // Construir el índice de definiciones al cargar la extensión
    buildDefinitionIndex();

    // Registrar el comando "vbnet-navigator.goToDefinition"
    let disposable = vscode.commands.registerCommand('vbnet-navigator.goToDefinition', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No hay un editor activo.');
            return;
        }

        const document = editor.document;
        const position = editor.selection.active;

        // Obtener la palabra bajo el cursor
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            vscode.window.showErrorMessage('No se encontró una palabra bajo el cursor.');
            return;
        }

        const word = document.getText(wordRange);
        console.log(`Buscando definición de: ${word}`);

        // Buscar en el índice de definiciones
        if (definitionIndex[word]) {
            console.log(`Definición encontrada en el índice: ${definitionIndex[word].uri.fsPath}`);
            await vscode.window.showTextDocument(definitionIndex[word].uri, {
                selection: new vscode.Range(definitionIndex[word].range.start, definitionIndex[word].range.start)
            });
            return;
        }

        // Si no está en el índice, buscar en archivos relevantes (misma carpeta)
        const currentFileDir = path.dirname(document.uri.fsPath);
        const filesInCurrentDir = await vscode.workspace.findFiles(`${currentFileDir}/**/*.vb`, '**/bin/**');

        for (const file of filesInCurrentDir) {
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                file
            );

            if (symbols) {
                const foundSymbol = findSymbolInDocument(symbols, word);
                if (foundSymbol) {
                    definitionIndex[word] = new vscode.Location(file, foundSymbol.range.start);
                    console.log(`Definición encontrada en: ${file.fsPath}`);
                    await vscode.window.showTextDocument(file, { selection: foundSymbol.range });
                    return;
                }
            }
        }

        vscode.window.showInformationMessage(`No se encontró la definición de "${word}".`);
    });

    context.subscriptions.push(disposable);
}

// Función para buscar un símbolo en un documento
function findSymbolInDocument(symbols: vscode.DocumentSymbol[], word: string): vscode.DocumentSymbol | undefined {
    for (const symbol of symbols) {
        if (symbol.name === word) {
            return symbol;
        }
        if (symbol.children) {
            const found = findSymbolInDocument(symbol.children, word);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}

// Función para construir el índice de definiciones
async function buildDefinitionIndex() {
    const files = await vscode.workspace.findFiles('**/*.vb', '**/bin/**');
    for (const file of files) {
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            file
        );

        if (symbols) {
            indexSymbols(symbols, file);
        }
    }
}

// Función para indexar símbolos
function indexSymbols(symbols: vscode.DocumentSymbol[], file: vscode.Uri) {
    for (const symbol of symbols) {
        definitionIndex[symbol.name] = new vscode.Location(file, symbol.range.start);
        console.log(`Definición agregada al índice: ${symbol.name} en ${file.fsPath}`);

        if (symbol.children) {
            indexSymbols(symbol.children, file);
        }
    }
}

export function deactivate() {
    console.log('Extensión VB.NET Navigator desactivada.');
}