import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  console.log('Activando extensión VB.NET Navigator...');

  // Configurar el servidor de lenguaje
  const serverOptions: ServerOptions = {
    command: 'node',
    args: [context.asAbsolutePath('./out/server/server.js')], // Ruta al servidor compilado
    options: {
      env: { ...process.env, NODE_DEBUG: 'vscode-languageclient' }, // Habilitar depuración
    },
  };

  console.log('Opciones del servidor configuradas:', serverOptions);

  // Configurar el cliente de lenguaje
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'vbnet' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.vb'), // Sincronizar cambios en archivos .vb
    },
  };

  console.log('Opciones del cliente configuradas:', clientOptions);

  // Crear el cliente
  client = new LanguageClient('vbnetNavigator', 'VBNET Navigator', serverOptions, clientOptions);

  // Añadir un retraso antes de iniciar el cliente
  setTimeout(() => {
    client.start().then(() => {
      console.log('Cliente de lenguaje iniciado correctamente.');
    }).catch((error) => {
      console.error('Error al iniciar el cliente de lenguaje:', error);
      vscode.window.showErrorMessage('Error al iniciar el cliente de lenguaje. Revisa la consola para más detalles.');
    });
  }, 5000); // Retraso de 5 segundos
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}