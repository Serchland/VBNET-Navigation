import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extensión VB.NET Navigator activada.');

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

        // Buscar en todos los archivos .vb del workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No se encontró un workspace abierto.');
            return;
        }

        const files = await vscode.workspace.findFiles('**/*.vb', '**/bin/**');
        for (const file of files) {
            const textDoc = await vscode.workspace.openTextDocument(file);
            const text = textDoc.getText();

            // Expresión regular para encontrar "Sub nombre", "Function nombre", "Class nombre", etc.
            const regex = new RegExp(`\\b(Sub|Function|Class|Module|Dim|Property)\\s+${word}\\b`, 'i');
            const match = text.match(regex);

            if (match) {
                const index = match.index || 0;
                const startPos = textDoc.positionAt(index);
                const location = new vscode.Location(textDoc.uri, startPos);

                // Navegar a la definición
                await vscode.window.showTextDocument(textDoc.uri, { selection: new vscode.Range(startPos, startPos) });
                return;
            }
        }

        vscode.window.showInformationMessage(`No se encontró la definición de "${word}".`);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Extensión VB.NET Navigator desactivada.');
}