import { TFile, TFolder, App } from "obsidian";
import { NO_TAG } from "./Lib";

export interface TabstractFileMap {
    files: TFile[];
    folders: TFolder[];
}

export const FileExtensions = {
    md: 'md',
    canvas: 'canvas'
};

export class FileAPI {
    public static checkFileExtension(file: TFile, ext: string): boolean { return file.extension === ext; }
    public static isMdExtension = (file: TFile): boolean => this.checkFileExtension(file, FileExtensions.md);
    public static isCanvasExtension = (file: TFile): boolean => this.checkFileExtension(file, FileExtensions.canvas);
    public static isObExtension = (file: TFile): boolean => this.isMdExtension(file) || this.isCanvasExtension(file);

    private static sortByAlphabet = (a: string, b: string): number => {
        const isALetter = a[0].match(/[a-zA-Z]/);
        const isBLetter = b[0].match(/[a-zA-Z]/);

        if (isALetter && !isBLetter) return 1;
        if (!isALetter && isBLetter) return -1;
        return a.localeCompare(b);
    }

    public static sortTags(tags: string[]): string[] {
        return tags.sort((a, b) => {
            if (a === NO_TAG) return 1;
            if (b === NO_TAG) return -1;
            if (a.length !== b.length) return a.length - b.length;
            return this.sortByAlphabet(a, b);
        });
    }

    public static sortFolder(folders: TFolder[]): TFolder[] {
        return folders.sort((a, b) => this.sortByAlphabet(a.name, b.name));
    }

    public static sortFile(files: TFile[]): TFile[] {
        return files.sort((a, b) => {
            if (this.isMdExtension(a) !== this.isMdExtension(b)) {
                return this.isMdExtension(a) ? -1 : 1;
            }
            if (this.isCanvasExtension(a) !== this.isCanvasExtension(b)) {
                return this.isCanvasExtension(a) ? -1 : 1;
            }
            if (a.extension !== b.extension) {
                return a.extension.localeCompare(b.extension);
            }
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

    }

    public static sortFileByProperty(files: TFile[], property: string, app: App): TFile[] {
        return files.sort((a, b) => {
            const cache = app.metadataCache;
            const frontmatterA = cache.getFileCache(a)?.frontmatter?.[property];
            const frontmatterB = cache.getFileCache(b)?.frontmatter?.[property];

            // 如果兩個檔案都沒有指定的 frontmatter 屬性，則按名稱排序
            if (!frontmatterA && !frontmatterB) {
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            }

            // 如果只有一個檔案有 frontmatter 屬性，將有屬性的排在前面
            if (!frontmatterA) return 1;
            if (!frontmatterB) return -1;

            // 根據屬性類型進行排序
            if (typeof frontmatterA === 'string' && typeof frontmatterB === 'string') {
                return frontmatterA.toLowerCase().localeCompare(frontmatterB.toLowerCase());
            }
            if (typeof frontmatterA === 'number' && typeof frontmatterB === 'number') {
                return frontmatterA - frontmatterB;
            }
            if (frontmatterA instanceof Date && frontmatterB instanceof Date) {
                return frontmatterA.getTime() - frontmatterB.getTime();
            }

            // 其他情況按名稱排序
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
    }
}