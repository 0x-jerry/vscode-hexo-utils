---
title: VSCode Hexo Utils
tags: ['hexo', 'vscode']
categories: ['utils']
---

## Features

- Create new article with exists template
- Sidebar, include tags, categories, posts and drafts
- Preview image with assets folder
- Hexo tag syntax highlight and hexo snippets ([Markdown Snippet Prefix Does Not Trigger Snippet](https://github.com/Microsoft/vscode/issues/28048#issuecomment-306616235))
- Paste image directly from clipboard, default shortcut is ctrl+alt+v. (Thanks [vscode-paste-image] project)
- Support remote development
- And more ...

## Preview Image

1. normal image

![description](./test.png)

2. image relative to assets folder

![]()

3. asset_path tag

<img src="{% asset_path 11.png %}" width="100px" title="My figure.">

4. asset_img tag

{% asset_img "test class" 11.png 600 300 "title text" "alt text" %}

5. img tag

{% img "test class" 11.png 600 300 "title text" "alt text" %}

6. asset_link tag

{% asset_link 11.png title escape %}
