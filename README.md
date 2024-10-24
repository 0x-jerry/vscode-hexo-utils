# VSCode Hexo Utils

A sidebar for [Hexo] blog system.

## Features

- Create new article with exists template
- Sidebar, include tags, categories, posts and drafts
- Preview image with assets folder
- Hexo tag syntax highlight and hexo snippets
- Paste image directly from clipboard, default shortcut is ctrl+alt+v. (Thanks [vscode-paste-image] project)
- Support remote development
- And more ...

![feature](docs-images/feature.png)

## Extension Settings

- `hexo.sortMethod`: Controls posts(drafts) and categories(tags) sorted method, default sort by name.
- `hexo.includeDraft`: Controls whether include drafts in tag and category view container, default `false`.
- `hexo.hexoProjectRoot`: `Hexo` project path(relative to current workspace root), default is workspace root.
- `hexo.markdown.resource`: Controls whether resolve image with hexo resource folder, default is `true`.
- `hexo.upload`: Controls whether upload image when use paste image command.
- `hexo.uploadType`: Support `imgchr, tencentoss`.
- `hexo.uploadImgchr`: Account settings for `https://imgchr.com/` site. Only available when `hexo.upload` is `true`.
- `hexo.uploadTencentOSS`: Account settings for tencent OSS service. Only available when `hexo.upload` is `true`.(Thanks [abnernat])
- `hexo.generateTimeFormat`: The time format when generate new article, default is ISO format. ([time-format-tokens])
- `hexo.assetFolderType`: Paste image folder type. (if `post`, paste image to current post folder, else the image would be at global folder `/sources/images/<__post>/`), see [#89](https://github.com/0x-jerry/vscode-hexo-utils/pull/89)

## Known Issues

If you have found any bugs. Please open an [issue](https://github.com/0x-jerry/vscode-hexo-utils/issues/new?assignees=&labels=&template=bug_report.md&title=)

## Q&A

1. [Markdown Snippet Prefix Does Not Trigger Snippet](https://github.com/Microsoft/vscode/issues/28048#issuecomment-306616235)

2. If you are using this extension to connect to a remote server via SSH, then you need to install this extension by `install in SSH:xxx` to extend VSCode's Markdown rendering capabilities.

![](./docs-images/ssh.png)

3. If you have opened multiple folders in one workspace, you need to set the Hexo project as the first opened folder.

## Release Notes

See [releases](https://github.com/0x-jerry/vscode-hexo-utils/releases).

[hexo]: https://hexo.io
[vscode-paste-image]: https://github.com/mushanshitiancai/vscode-paste-image
[time-format-tokens]: https://day.js.org/docs/en/plugin/custom-parse-format#list-of-all-available-format-tokens
[abnernat]: https://github.com/abnernat

**Enjoy!**
