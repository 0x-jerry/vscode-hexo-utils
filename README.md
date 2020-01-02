# VSCode Hexo Utils

A sidebar for [Hexo].

Open a [Hexo] project, and have fun.

## Features

- Sidebar, include tags, categories, posts and drafts
- Markdown preview
- Assets path completion
- Paste image directly from clipboard, default shortcut is `ctrl+alt+v`. (Thanks [vscode-paste-image] project)

![screen](docs-images/screen.gif)

![feature](docs-images/feature.gif)

![markdown](docs-images/markdown-preview.png)

## Extension Settings

- `hexo.sortMethod`: Controls posts(drafts) sorted method, default sort by name.
- `hexo.includeDraft`: Controls whether include drafts in tag and category view container, default `false`.
- `hexo.hexoProjectRoot`: `Hexo` project path(relative to current workspace root), default is workspace root.
- `hexo.markdown.resource`: Controls whether resolve image with hexo resource folder, default is `true`.
- `hexo.upload`: Controls whether upload image when use paste image command.
- `hexo.uploadType`: Only support 'imgchr'.
- `hexo.uploadImgchr`: Account settings for `https://imgchr.com/` site. Only available when `hexo.upload` is `true`.

## Known Issues

[Bug report](https://github.com/cwxyz007/vscode-hexo-utils/issues/new?assignees=&labels=&template=bug_report.md&title=)

## Need Feature

[Feature require](https://github.com/cwxyz007/vscode-hexo-utils/issues/new?assignees=&labels=&template=feature_request.md&title=)

## Release Notes

See [CHANGELOG](CHANGELOG.md)

**Enjoy!**

[hexo]: https://hexo.io
[vscode-paste-image]: https://github.com/mushanshitiancai/vscode-paste-image
