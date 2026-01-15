# Hexo 的分类解析逻辑
Hexo 的分类解析逻辑支持多级分类，主要通过 `Category` 模型的父子关系和 `Post` 模型的 `setCategories` 方法实现。

ref: https://deepwiki.com/search/categories_fb6965e1-6434-4b79-9dd9-0925c58a0000?mode=fast

## 核心解析逻辑

### 1. 分类模型定义
`Category` 模型通过 `parent` 字段建立父子关系 [1](#0-0) ：

```typescript
const Category = new warehouse.Schema<CategorySchema>({
  name: {type: String, required: true},
  parent: { type: warehouse.Schema.Types.CUID, ref: 'Category'}
});
```

### 2. 分类解析入口
在文章处理器中，分类数据从 front matter 解析 [2](#0-1) ：

```typescript
if (data.category && !data.categories) {
  data.categories = data.category;
  data.category = undefined;
}

categories = data.categories || [];
if (!Array.isArray(categories)) categories = [categories];
```

### 3. 多级分类处理
`setCategories` 方法是核心逻辑，处理多级分类的创建 [3](#0-2) ：

- **扁平分类**：`['foo', 'bar', 'baz']` - 创建三个同级分类
- **层级分类**：`[['foo', 'bar', 'baz']]` - 创建三级嵌套分类
- **混合模式**：`['foo', ['bar', 'baz']]` - 创建一个顶级分类和一个二级分类

### 4. 层级创建逻辑
`addHierarchy` 函数负责创建分类层级 [4](#0-3) ：

```typescript
const addHierarchy = (catHierarchy: string | string[]) => {
  const parentIds = [];
  if (!Array.isArray(catHierarchy)) catHierarchy = [catHierarchy];

  return Promise.each(catHierarchy, (cat, i) => {
    // 查找或创建分类，建立父子关系
    const data = Category.findOne({
      name: cat,
      parent: i ? parentIds[i - 1] : {$exists: false}
    }, {lean: true});

    // 如果不存在则插入新分类
    if (!data) {
      const obj: {name: string, parent?: string} = {name: cat};
      if (i) obj.parent = parentIds[i - 1];
      return Category.insert(obj);
    }
  });
};
```

## 路径生成

分类的 slug 和 path 会根据层级自动生成 [5](#0-4) ：

```typescript
Category.virtual('slug').get(function() {
  let str = '';
  if (this.parent) {
    const parent = ctx.model('Category').findById(this.parent);
    str += `${parent.slug}/`;
  }
  str += slugize(name, {transform: ctx.config.filename_case});
  return str;
});
```

## 使用示例

### Front Matter 配置
```yaml
# 扁平分类
categories:
  - foo
  - bar
  - baz

# 层级分类
categories:
  - [foo, bar, baz]

# 混合模式
categories:
  - foo
  - [bar, baz]
```

### 测试用例验证
测试文件展示了多级分类的实际效果 [6](#0-5) ：

```javascript
// 输入: ['foo', [bar, baz]]
// 输出: ['foo', 'bar', 'baz']
// 其中 bar 的父级是 foo，baz 的父级是 bar
```

## Notes

- 分类层级通过数据库的 `parent` 字段实现，支持无限层级嵌套
- 空分类会被自动过滤，保持层级结构完整 [7](#0-6)
- 相同名称的分类在同一父级下不能重复创建 [8](#0-7)
- 分类路径会自动生成，格式为 `parent/child/grandchild`

### Citations

**File:** lib/models/category.ts (L7-10)
```typescript
  const Category = new warehouse.Schema<CategorySchema>({
    name: {type: String, required: true},
    parent: { type: warehouse.Schema.Types.CUID, ref: 'Category'}
  });
```

**File:** lib/models/category.ts (L12-38)
```typescript
  Category.virtual('slug').get(function() {
    let name = this.name;

    if (!name) return;

    let str = '';

    if (this.parent) {
      const parent = ctx.model('Category').findById(this.parent);
      str += `${parent.slug}/`;
    }

    const map = ctx.config.category_map || {};

    name = map[name] || name;
    str += slugize(name, {transform: ctx.config.filename_case});

    return str;
  });

  Category.virtual('path').get(function() {
    let catDir = ctx.config.category_dir;
    if (catDir === '/') catDir = '';
    if (!catDir.endsWith('/')) catDir += '/';

    return `${catDir + this.slug}/`;
  });
```

**File:** lib/models/category.ts (L61-74)
```typescript
  Category.pre('save', (data: CategorySchema) => {
    const { name, parent } = data;
    if (!name) return;

    const Category = ctx.model('Category');
    const cat = Category.findOne({
      name,
      parent: parent || {$exists: false}
    }, {lean: true});

    if (cat) {
      throw new Error(`Category \`${name}\` has already existed!`);
    }
  });
```

**File:** lib/plugins/processor/post.ts (L149-163)
```typescript
    if (data.category && !data.categories) {
      data.categories = data.category;
      data.category = undefined;
    }

    if (data.tag && !data.tags) {
      data.tags = data.tag;
      data.tag = undefined;
    }

    categories = data.categories || [];
    tags = data.tags || [];

    if (!Array.isArray(categories)) categories = [categories];
    if (!Array.isArray(tags)) tags = [tags];
```

**File:** lib/models/post.ts (L132-204)
```typescript
  Post.method('setCategories', function(cats: (string | string[])[]) {
    if (this.notPublished()) {
      cats = [];
    }
    // Remove empty categories, preserving hierarchies
    cats = cats.filter(cat => {
      return Array.isArray(cat) || (cat != null && cat !== '');
    }).map(cat => {
      return Array.isArray(cat) ? removeEmptyTag(cat) : `${cat}`;
    });

    const ReadOnlyPostCategory = ctx._binaryRelationIndex.post_category;
    const PostCategory = ctx.model('PostCategory');
    const Category = ctx.model('Category');
    const id = this._id;
    const allIds: string[] = [];
    const existed = ReadOnlyPostCategory.find({post_id: id}).map(pickID);
    const hasHierarchy = cats.filter(Array.isArray).length > 0;

    // Add a hierarchy of categories
    const addHierarchy = (catHierarchy: string | string[]) => {
      const parentIds = [];
      if (!Array.isArray(catHierarchy)) catHierarchy = [catHierarchy];
      // Don't use "Promise.map". It doesn't run in series.
      // MUST USE "Promise.each".
      return Promise.each(catHierarchy, (cat, i) => {
        // Find the category by name
        const data: CategorySchema = Category.findOne({
          name: cat,
          parent: i ? parentIds[i - 1] : {$exists: false}
        }, {lean: true});

        if (data) {
          allIds.push(data._id);
          parentIds.push(data._id);
          return data;
        }

        // Insert the category if not exist
        const obj: {name: string, parent?: string} = {name: cat};
        if (i) obj.parent = parentIds[i - 1];

        return Category.insert(obj).catch(err => {
          // Try to find the category again. Throw the error if not found
          const data: CategorySchema = Category.findOne({
            name: cat,
            parent: i ? parentIds[i - 1] : {$exists: false}
          }, {lean: true});

          if (data) return data;
          throw err;
        }).then((data: CategorySchema) => {
          allIds.push(data._id);
          parentIds.push(data._id);
          return data;
        });
      });
    };

    return (hasHierarchy ? Promise.each(cats, addHierarchy) : Promise.resolve(addHierarchy(cats as string[]))
    ).then(() => allIds).map(catId => {
      // Find the reference
      const ref: PostCategorySchema = ReadOnlyPostCategory.findOne({post_id: id, category_id: catId});
      if (ref) return ref;

      // Insert the reference if not exist
      return PostCategory.insert({
        post_id: id,
        category_id: catId
      });
    }).then((postCats: PostCategorySchema[]) => // Remove old categories
      existed.filter(item => !postCats.map(pickID).includes(item))).map(cat => PostCategory.removeById(cat));
  });
```

**File:** test/scripts/processors/post.ts (L931-957)
```typescript
  it('post - categories (multiple hierarchies)', async () => {
    const body = [
      'title: "Hello world"',
      'categories:',
      '- foo',
      '- [bar, baz]',
      '---'
    ].join('\n');

    const file = newFile({
      path: 'foo.html',
      published: true,
      type: 'create',
      renderable: true
    });

    await writeFile(file.source, body);
    await process(file);
    const post = Post.findOne({ source: file.path });

    post.categories.map(item => item.name).should.eql(['foo', 'bar', 'baz']);

    return BluebirdPromise.all([
      post.remove(),
      unlink(file.source)
    ]);
  });
```
