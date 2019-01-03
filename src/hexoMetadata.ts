import { ClassifyTypes } from './hexoClassifyProvider';

export interface IHexoMetadata {
  tags?: string[];
  categories?: string[];
  title?: string;
  date?: Date;
  filePath: string;
}

interface IClassify {
  name: string;
  files: string[];
}

export class HexoMetadataUtils {
  tags: IClassify[] = [];
  categories: IClassify[] = [];

  constructor(metadatas: IHexoMetadata[]) {
    metadatas.forEach((metadata) => {
      if (metadata.tags) {
        metadata.tags.forEach((t) => {
          this.addClassify(ClassifyTypes.tag, t, metadata.filePath);
        });
      }

      if (metadata.categories) {
        metadata.categories.forEach((t) => {
          this.addClassify(ClassifyTypes.category, t, metadata.filePath);
        });
      }
    });
  }

  private addClassify(type: ClassifyTypes, name: string, path: string) {
    const find = this[type].find((t) => t.name === name);

    if (find) {
      find.files.push(path);
    } else {
      this[type].push({
        name,
        files: [path],
      });
    }
  }
}
