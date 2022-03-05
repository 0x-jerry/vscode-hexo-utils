---
title: test hexo tag plugin
tags: [hexo]
categories: [test]
---

## Markdown syntax

1. normal image

![description](./test.png)

2. image relative to assets folder

![xx](11.png)

## Hexo tag plugin

1. asset_path tag

<img src="{% asset_path 11.png %}" width="600px" title="My figure.">

2. asset_img tag

{% asset_img "test class" 11.png 600 300 '"title text" "alt text"' %}

3. img tag

{% img "test class" 11.png 600 300 '"title text" "alt text"' %}

4. asset_link tag

{% asset_link 11.png title escape %}
