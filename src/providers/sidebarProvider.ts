import * as vscode from 'vscode';

export class PhpSerializeTreeProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;
    
    private data: any;

    setData(data: any) {
        this.data = data;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (!this.data) {
            return Promise.resolve([new TreeItem('No payload decoded yet', null, 'Run PHP: Unserialize first!', vscode.TreeItemCollapsibleState.None)]);
        }

        const targetData = element ? element.value : this.data;
        
        if (typeof targetData === 'object' && targetData !== null) {
            const keys = Object.keys(targetData);
            const items = keys.map(key => {
                const val = targetData[key];
                const isObject = typeof val === 'object' && val !== null;
                
                let label = key;
                let description = isObject ? (Array.isArray(val) ? `Array(${val.length})` : `Object`) : String(val);
                
                return new TreeItem(
                    label,
                    val,
                    description,
                    isObject ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
                );
            });
            return Promise.resolve(items);
        }
        
        return Promise.resolve([]);
    }
}

export class TreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly value: any,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}: ${this.description}`;
    }
}
