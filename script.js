class UlyssesHierarchical {
    constructor() {
        this.folders = [];
        this.currentMemoId = null;
        this.nextFolderId = 1;
        this.nextMemoId = 1;
        
        this.initElements();
        this.loadData();
        this.bindEvents();
        this.renderTree();
        this.showEmptyState();
    }

    initElements() {
        this.treeView = document.getElementById('treeView');
        this.newFolderBtn = document.getElementById('newFolderBtn');
        this.newMemoBtn = document.getElementById('newMemoBtn');
        this.memoTitle = document.getElementById('memoTitle');
        this.editor = document.getElementById('editor');
        this.saveBtn = document.getElementById('saveBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.status = document.getElementById('status');
        this.charCount = document.getElementById('charCount');
    }

    bindEvents() {
        this.newFolderBtn.addEventListener('click', (e) => {
            // 重複クリック防止
            if (this.newFolderBtn.disabled) return;
            this.newFolderBtn.disabled = true;
            this.createNewFolder();
            setTimeout(() => this.newFolderBtn.disabled = false, 500);
        });
        
        this.newMemoBtn.addEventListener('click', (e) => {
            // 重複クリック防止
            if (this.newMemoBtn.disabled) return;
            this.newMemoBtn.disabled = true;
            this.createNewMemo();
            setTimeout(() => this.newMemoBtn.disabled = false, 500);
        });
        
        this.bindEditorEvents();
        
        // Ctrl+S で保存（グローバル）
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveMemo();
            }
        });
    }

    bindEditorEvents() {
        // 既存のイベントリスナーをクリア（重複防止）
        if (this.saveBtn) {
            const newSaveBtn = this.saveBtn.cloneNode(true);
            this.saveBtn.parentNode.replaceChild(newSaveBtn, this.saveBtn);
            this.saveBtn = newSaveBtn;
            this.saveBtn.addEventListener('click', () => this.saveMemo());
        }
        
        if (this.deleteBtn) {
            const newDeleteBtn = this.deleteBtn.cloneNode(true);
            this.deleteBtn.parentNode.replaceChild(newDeleteBtn, this.deleteBtn);
            this.deleteBtn = newDeleteBtn;
            this.deleteBtn.addEventListener('click', () => this.deleteMemo());
        }
        
        if (this.memoTitle) {
            const newMemoTitle = this.memoTitle.cloneNode(true);
            this.memoTitle.parentNode.replaceChild(newMemoTitle, this.memoTitle);
            this.memoTitle = newMemoTitle;
            this.memoTitle.addEventListener('input', () => this.onContentChange());
        }
        
        if (this.editor) {
            const newEditor = this.editor.cloneNode(true);
            this.editor.parentNode.replaceChild(newEditor, this.editor);
            this.editor = newEditor;
            this.editor.addEventListener('input', () => this.onContentChange());
            
            // 自動保存（3秒後）
            let autoSaveTimeout;
            this.editor.addEventListener('input', () => {
                clearTimeout(autoSaveTimeout);
                autoSaveTimeout = setTimeout(() => this.saveMemo(), 3000);
            });
        }
    }

    loadData() {
        const savedFolders = localStorage.getItem('ulysses-folders');
        if (savedFolders) {
            this.folders = JSON.parse(savedFolders);
            
            // IDの最大値を計算
            let maxFolderId = 0;
            let maxMemoId = 0;
            
            this.folders.forEach(folder => {
                maxFolderId = Math.max(maxFolderId, folder.id);
                folder.memos.forEach(memo => {
                    maxMemoId = Math.max(maxMemoId, memo.id);
                });
            });
            
            this.nextFolderId = maxFolderId + 1;
            this.nextMemoId = maxMemoId + 1;
        } else {
            // デフォルトフォルダを作成
            this.createDefaultFolder();
        }
    }

    saveData() {
        localStorage.setItem('ulysses-folders', JSON.stringify(this.folders));
    }

    createDefaultFolder() {
        const defaultFolder = {
            id: this.nextFolderId++,
            name: '📝 メモ',
            memos: [],
            expanded: true,
            createdAt: new Date().toISOString()
        };
        
        this.folders.push(defaultFolder);
        this.saveData();
    }

    createNewFolder() {
        const newFolder = {
            id: this.nextFolderId++,
            name: '新しいフォルダ',
            memos: [],
            expanded: true,
            createdAt: new Date().toISOString()
        };

        this.folders.push(newFolder);
        this.saveData();
        this.renderTree();
    }

    createNewMemo(folderId = null) {
        // フォルダが指定されていない場合、最初のフォルダを使用
        if (!folderId && this.folders.length > 0) {
            folderId = this.folders[0].id;
        }

        if (!folderId) {
            this.createDefaultFolder();
            folderId = this.folders[0].id;
        }

        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        const newMemo = {
            id: this.nextMemoId++,
            title: '新しいメモ',
            content: '',
            folderId: folderId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        folder.memos.unshift(newMemo);
        folder.expanded = true; // フォルダを展開
        this.saveData();
        this.renderTree();
        this.selectMemo(newMemo.id);
        
        // タイトルフィールドにフォーカス
        setTimeout(() => {
            if (this.memoTitle) {
                this.memoTitle.select();
            }
        }, 100);
    }

    selectMemo(memoId) {
        // メモを探す
        let selectedMemo = null;
        for (const folder of this.folders) {
            const memo = folder.memos.find(m => m.id === memoId);
            if (memo) {
                selectedMemo = memo;
                break;
            }
        }

        if (!selectedMemo) return;

        this.currentMemoId = memoId;
        if (this.memoTitle) this.memoTitle.value = selectedMemo.title;
        if (this.editor) this.editor.value = selectedMemo.content;
        
        this.updateActiveMemo();
        this.updateCharCount();
        this.updateStatus('saved');
        this.hideEmptyState();
    }

    saveMemo() {
        if (!this.currentMemoId) return;

        // メモを探して更新
        for (const folder of this.folders) {
            const memo = folder.memos.find(m => m.id === this.currentMemoId);
            if (memo) {
                memo.title = this.memoTitle?.value || '無題のメモ';
                memo.content = this.editor?.value || '';
                memo.updatedAt = new Date().toISOString();
                
                this.saveData();
                this.renderTree();
                this.updateActiveMemo();
                this.updateStatus('saved');
                break;
            }
        }
    }

    deleteMemo() {
        if (!this.currentMemoId) return;

        // メモを探して削除
        for (const folder of this.folders) {
            const memoIndex = folder.memos.findIndex(m => m.id === this.currentMemoId);
            if (memoIndex !== -1) {
                folder.memos.splice(memoIndex, 1);
                this.saveData();
                this.renderTree();
                
                // 他のメモがあれば選択、なければ空の状態に
                const allMemos = this.getAllMemos();
                if (allMemos.length > 0) {
                    this.selectMemo(allMemos[0].id);
                } else {
                    this.currentMemoId = null;
                    this.showEmptyState();
                }
                break;
            }
        }
    }

    deleteFolder(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (!folder) return;

        this.folders = this.folders.filter(f => f.id !== folderId);
        
        // 削除されたフォルダのメモが選択されている場合
        if (this.currentMemoId && folder.memos.some(m => m.id === this.currentMemoId)) {
            this.currentMemoId = null;
            const allMemos = this.getAllMemos();
            if (allMemos.length > 0) {
                this.selectMemo(allMemos[0].id);
            } else {
                this.showEmptyState();
            }
        }

        this.saveData();
        this.renderTree();
    }

    toggleFolder(folderId) {
        const folder = this.folders.find(f => f.id === folderId);
        if (folder) {
            folder.expanded = !folder.expanded;
            this.saveData();
            this.renderTree();
        }
    }

    getAllMemos() {
        return this.folders.flatMap(folder => folder.memos);
    }

    renderTree() {
        if (!this.treeView) return;
        
        this.treeView.innerHTML = '';

        this.folders.forEach(folder => {
            const folderElement = this.createFolderElement(folder);
            this.treeView.appendChild(folderElement);
        });
    }

    createFolderElement(folder) {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = `folder-header ${folder.expanded ? 'expanded' : ''}`;
        
        headerDiv.innerHTML = `
            <div class="folder-info">
                <span class="folder-toggle ${folder.expanded ? 'expanded' : ''}">▶</span>
                <span class="folder-name">${folder.name}</span>
                <span class="memo-count">(${folder.memos.length})</span>
            </div>
            <div class="folder-actions">
                <button class="folder-action-btn add" title="メモを追加">+</button>
                <button class="folder-action-btn delete" title="フォルダを削除">×</button>
            </div>
        `;
        
        // フォルダクリックイベント
        headerDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('folder-action-btn')) return;
            this.toggleFolder(folder.id);
        });
        
        // フォルダアクション
        const addBtn = headerDiv.querySelector('.add');
        const deleteBtn = headerDiv.querySelector('.delete');
        
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            // 重複クリック防止
            if (addBtn.disabled) return;
            addBtn.disabled = true;
            this.createNewMemo(folder.id);
            setTimeout(() => addBtn.disabled = false, 500);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            // 重複クリック防止
            if (deleteBtn.disabled) return;
            deleteBtn.disabled = true;
            this.deleteFolder(folder.id);
            setTimeout(() => deleteBtn.disabled = false, 500);
        });
        
        folderDiv.appendChild(headerDiv);
        
        // メモリスト
        const memoListDiv = document.createElement('div');
        memoListDiv.className = `memo-list ${folder.expanded ? 'expanded' : ''}`;
        
        folder.memos.forEach(memo => {
            const memoElement = this.createMemoElement(memo);
            memoListDiv.appendChild(memoElement);
        });
        
        folderDiv.appendChild(memoListDiv);
        return folderDiv;
    }

    createMemoElement(memo) {
        const memoDiv = document.createElement('div');
        memoDiv.className = `memo-item ${this.currentMemoId === memo.id ? 'active' : ''}`;
        
        const preview = memo.content.substring(0, 30) || 'メモがありません...';
        
        memoDiv.innerHTML = `
            <div class="memo-title">${memo.title}</div>
            <div class="memo-preview">${preview}</div>
            <button class="memo-close">×</button>
        `;
        
        memoDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('memo-close')) {
                e.stopPropagation();
                e.preventDefault();
                // 重複クリック防止
                if (e.target.disabled) return;
                e.target.disabled = true;
                this.deleteMemoById(memo.id);
                setTimeout(() => e.target.disabled = false, 500);
            } else {
                this.selectMemo(memo.id);
            }
        });
        
        return memoDiv;
    }

    deleteMemoById(memoId) {
        for (const folder of this.folders) {
            const memoIndex = folder.memos.findIndex(m => m.id === memoId);
            if (memoIndex !== -1) {
                folder.memos.splice(memoIndex, 1);
                this.saveData();
                this.renderTree();
                
                if (this.currentMemoId === memoId) {
                    const allMemos = this.getAllMemos();
                    if (allMemos.length > 0) {
                        this.selectMemo(allMemos[0].id);
                    } else {
                        this.currentMemoId = null;
                        this.showEmptyState();
                    }
                }
                break;
            }
        }
    }

    updateActiveMemo() {
        const memoItems = this.treeView?.querySelectorAll('.memo-item');
        memoItems?.forEach(item => {
            item.classList.remove('active');
        });
        
        // 現在選択されているメモをハイライト
        for (const folder of this.folders) {
            const memo = folder.memos.find(m => m.id === this.currentMemoId);
            if (memo) {
                // 対応するDOM要素を見つけてactiveクラスを追加
                const allMemoElements = Array.from(this.treeView?.querySelectorAll('.memo-item') || []);
                const memoElements = allMemoElements.filter(el => {
                    const title = el.querySelector('.memo-title')?.textContent;
                    return title === memo.title;
                });
                memoElements.forEach(el => el.classList.add('active'));
                break;
            }
        }
    }

    onContentChange() {
        this.updateCharCount();
        this.updateStatus('unsaved');
    }

    updateCharCount() {
        if (this.editor && this.charCount) {
            const count = this.editor.value.length;
            this.charCount.textContent = `${count} 文字`;
        }
    }

    updateStatus(status) {
        if (!this.status) return;
        
        this.status.className = `status ${status}`;
        switch (status) {
            case 'saved':
                this.status.textContent = '保存済み';
                break;
            case 'unsaved':
                this.status.textContent = '未保存';
                break;
            default:
                this.status.textContent = '準備完了';
        }
    }

    showEmptyState() {
        const editorArea = document.querySelector('.editor-area');
        if (editorArea) {
            editorArea.innerHTML = `
                <div class="empty-state">
                    <h2>📝 メモがありません</h2>
                    <p>左側の「📝 新規メモ」ボタンをクリックして<br>最初のメモを作成しましょう</p>
                    <p>フォルダを作成してメモを整理することもできます</p>
                </div>
            `;
        }
    }

    hideEmptyState() {
        const editorArea = document.querySelector('.editor-area');
        if (editorArea && editorArea.querySelector('.empty-state')) {
            editorArea.innerHTML = `
                <div class="editor-header">
                    <input type="text" class="memo-title" id="memoTitle" placeholder="メモのタイトル">
                    <div class="editor-actions">
                        <button class="save-btn" id="saveBtn">保存</button>
                        <button class="delete-btn" id="deleteBtn">削除</button>
                    </div>
                </div>
                
                <textarea class="editor" id="editor" placeholder="ここにメモを書いてください..."></textarea>
                
                <div class="editor-footer">
                    <span class="status" id="status">準備完了</span>
                    <span class="char-count" id="charCount">0 文字</span>
                </div>
            `;
            
            // 要素を再取得（イベントバインドは重複を避けるため呼ばない）
            this.initElements();
            this.bindEditorEvents();
        }
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    window.ulysses = new UlyssesHierarchical();
    console.log('Ulysses Hierarchical Memo Tool が起動しました！');
});