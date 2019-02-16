import * as path from 'path';
import {
  CompletionItemProvider,
  TextDocument,
  CancellationToken,
  Position,
  CompletionContext,
  ProviderResult,
  CompletionItem,
  CompletionList,
  MarkdownString,
  workspace,
  CompletionItemKind,
} from 'vscode';
import { isHexoProject } from './utils';
import { configs } from './configs';

export class HexoCompletionProvider implements CompletionItemProvider {
  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext,
  ): ProviderResult<CompletionItem[] | CompletionList> {
    // Filter md file
    if (!document.uri.fsPath.endsWith('.md') || !isHexoProject()) {
      return [];
    }

    const lineTextBefore = document.lineAt(position.line).text.substring(0, position.character);

    // ![xxx]()
    const matches = lineTextBefore.match(/!\[[^\]]*?\]\(([^\)]*?)[\\\/]?[^\\\/\)]*$/);

    if (!(matches && matches[1] !== undefined)) {
      return [];
    }

    const filename = path.parse(document.uri.fsPath).name;

    const resFolder = `source/_posts/${filename}/**/*.{png,jpg,jpeg,svg,gif}`;

    return workspace.findFiles(resFolder, '**/node_modules/**').then((uris) => {
      return uris.map((imgUri) => {
        const relPath = path.relative(document.uri.fsPath, imgUri.fsPath);

        const filePath = document.uri.fsPath;
        const resourceDir = path.join(
          configs.hexoRoot!,
          'source',
          '_posts',
          path.parse(filePath).name,
        );

        const itemLabel = imgUri.fsPath.substr(resourceDir.length + 1).replace('\\', '/');

        const item = new CompletionItem(itemLabel, CompletionItemKind.File);

        item.documentation = new MarkdownString(
          `![${relPath}](${imgUri.fsPath.replace(/\\/g, '/')})`,
        );
        return item;
      });
    });
  }
}
