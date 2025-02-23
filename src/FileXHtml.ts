import { Segment, Checkbox } from "./Lib";


const segments = [
    { id: Segment.Vault, text: 'Vault', active: true },
    { id: Segment.FolderL2, text: 'Folder L2' },
    { id: Segment.AllFiles, text: 'All files' },
    { id: Segment.UnLinked, text: 'Not Linked' },
    { id: Segment.Tag, text: 'Tag' }
];

const options = [
    { name: 'show attachments', id: Checkbox.ShowAttachments, checked: true },
    { name: 'show md/canva', id: Checkbox.ShowMd, checked: true },
    { name: 'show folder', id: Checkbox.ShowFolder, checked: true },
    { name: 'show amount', id: Checkbox.ShowAmount, checked: false }
];

export class FileXHtmlBuilder {
    public static createHtml(): string {
        const html = `
            <div class="filex-control-container">
                ${this.createSearchSection()}
                ${this.createWidgetSection()}
                ${this.createFileInfoSection()}
                ${this.createTagsSection()}
                ${this.createFileListSection()}
            </div>
        `;
        return html;
    }

    private static createSearchSection(): string {
        return `
            <div class="search-container">
                <span class="filex-icon filex-icon-search">s</span>
                <input type="text" class="search-input" placeholder="搜尋檔案...">
            </div>
        `;
    }

    private static createWidgetSection(): string {
        return `
            <div class="widget-container">
                <div class="widget-header">
                    <div class="collapse-button">
                        <span class="collapse-icon"></span>
                    </div>
                </div>
                <div class="widget-content">
                    <div class="button-row">
                        ${segments.map(segment => `
                            <button class="segment-button${segment.active ? ' active' : ''}" id="${segment.id}">
                                ${segment.text}
                            </button>
                        `).join('')}
                    </div>
                    <hr/>
                    <div class="operation-row">
                        <div class="checkbox-group">
                            ${options.map(option => `
                                <label>
                                    <input type="checkbox" class="option-checkbox" id="${option.id}"${option.checked ? ' checked' : ''}>
                                    ${option.name}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private static createFileInfoSection(): string {
        return `
            <div class="file-info-container">
                <span class="folder-path">
                    <span class="filex-icon filex-icon-folder"></span>
                    <span class="folder-path-container"></span>
                </span>
                <span class="file-count"></span>
            </div>
        `;
    }

    private static createTagsSection(): string {
        return `
            <div class="tags-container">
                <div class="tags-header">
                    <div class="collapse-button">
                        <span class="collapse-icon"></span>
                    </div>
                </div>
                <div class="tags-content">
                    <div class="metadata-property" tabindex="0" data-property-key="tags" data-property-type="multitext">
                        <div class="metadata-property-value">
                            <div class="multi-select-container"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private static createFileListSection(): string {
        return `
            <div class="file-list-container">
                <table class="file-list-table">
                    <thead class="file-list-header">
                        <tr>
                            <th class="sortable sort-asc">name</th>
                        </tr>
                    </thead>
                    <tbody class="file-list-body"></tbody>
                </table>
            </div>
        `;
    }
}