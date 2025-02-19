export interface FileXFilter {
    searchText?: string;
    segment: 'vault' | 'folder-l2' | 'all-files' | 'tag' | 'not-link';
    tags?: string[];
    folderPath?: string;
} 