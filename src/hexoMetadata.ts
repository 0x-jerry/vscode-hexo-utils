import { ClassifyTypes } from './treeViews/classifyTreeView/hexoClassifyProvider';
import * as path from 'path';
import { ConfigProperties, getConfig, SortBy } from './configs';

export interface IHexoMetadata {
  tags: string[];
  categories: string[];
  title: string;
  date: Date;
  filePath: string;
}

type THexoMeta = IHexoMetadata & { name?: string };

interface IClassify {
  name: string;
  files: THexoMeta[];
}

export class HexoMetadataUtils {
  tags: IClassify[] = [];
  categories: IClassify[] = [];

  constructor(metadatas: THexoMeta[]) {
    metadatas.forEach((metadata) => {
      metadata.name = path.parse(metadata.filePath).name;

      if (metadata.tags) {
        metadata.tags.forEach((t) => {
          this.addClassify(ClassifyTypes.tag, t, metadata);
        });
      }

      if (metadata.categories) {
        metadata.categories.forEach((t) => {
          this.addClassify(ClassifyTypes.category, t, metadata);
        });
      }
    });

    this.sort();
  }

  private sort() {
    const sortMethod = <SortBy>getConfig(ConfigProperties.sortMethod);

    const key: keyof THexoMeta = sortMethod === SortBy.date ? 'date' : 'name';

    const sortClassify = (category: IClassify) => {
      category.files.sort((a, b) => (a[key]! < b[key]! ? 1 : -1));

      if (category.name.toLowerCase() === 'javascript') {
        category.files.forEach((f) => console.log(f));
      }
    };

    this.tags.sort((a, b) => (a.name < b.name ? 1 : -1));
    this.categories.sort((a, b) => (a.name < b.name ? 1 : -1));

    this.tags.forEach(sortClassify);
    this.categories.forEach(sortClassify);
  }

  private addClassify(type: ClassifyTypes, name: string, metadata: IHexoMetadata) {
    const find = this[type].find((t) => t.name === name);

    if (!find) {
      this[type].push({
        name,
        files: [metadata],
      });
      return;
    }

    const exist = find.files.find((f) => f.filePath === metadata.filePath);

    if (!exist) {
      find.files.push(metadata);
    }
  }
}
