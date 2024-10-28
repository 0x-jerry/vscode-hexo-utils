---
title: test hexo tag plugin
tags: [hexo]
categories: [test]
---

reference: https://hexo.io/docs/tag-plugins

## Markdown syntax

image relative to assets folder

![xx](11.png)

## Hexo tag plugin

asset_path tag

<img src="{% asset_path 11.png %}" width="600px" title="My figure.">

asset_img tag

{% asset_img "test class" 11.png 600 300 "title text" "alt text" %}

asset_link tag

{% asset_link 11.png title escape %}
