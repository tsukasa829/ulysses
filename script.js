class UlyssesStreams {
    constructor() {
        this.streams = [];
        this.currentPostId = null;
        this.currentStreamId = null;
        this.nextStreamId = 1;
        this.nextPostId = 1;
        
        this.initElements();
        this.loadData();
        this.bindEvents();
        this.setupRouter();
        this.renderTree();
        this.handleInitialRoute();
    }

    initElements() {
        this.treeView = document.getElementById('treeView');
        this.newPostBtn = document.getElementById('newPostBtn');
        this.postTitle = document.getElementById('postTitle');
        this.editor = document.getElementById('editor');
        this.saveBtn = document.getElementById('saveBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.status = document.getElementById('status');
        this.charCount = document.getElementById('charCount');
    }

    bindEvents() {
        this.newPostBtn.addEventListener('click', (e) => {
            // 重複クリック防止
            if (this.newPostBtn.disabled) return;
            this.newPostBtn.disabled = true;
            this.createNewPost();
            setTimeout(() => this.newPostBtn.disabled = false, 500);
        });
        
        this.bindEditorEvents();
        
        // Ctrl+S で保存（グローバル）
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.savePost();
            }
        });
    }

    setupRouter() {
        // ブラウザの戻る/進むボタン対応
        window.addEventListener('popstate', (e) => {
            this.handleRoute();
        });
    }

    handleInitialRoute() {
        const path = window.location.pathname;
        
        if (path === '/shopping-list/') {
            // 買い物リストストリームを探して選択
            const shoppingStream = this.streams.find(s => s.type === 'shopping');
            if (shoppingStream) {
                this.selectStream(shoppingStream.id);
                return;
            }
        }
        
        // デフォルトは空の状態
        this.showEmptyState();
    }

    handleRoute() {
        const path = window.location.pathname;
        
        if (path === '/shopping-list/') {
            const shoppingStream = this.streams.find(s => s.type === 'shopping');
            if (shoppingStream) {
                this.selectStream(shoppingStream.id);
            }
        } else {
            this.showEmptyState();
        }
    }

    updateURL(streamType) {
        const routes = {
            shopping: '/shopping-list/',
            todo: '/todo-list/',
            memo: '/memo-list/'
        };
        
        const newPath = routes[streamType] || '/';
        
        if (window.location.pathname !== newPath) {
            window.history.pushState({ streamType }, '', newPath);
        }
    }

    bindEditorEvents() {
        // 既存のイベントリスナーをクリア（重複防止）
        if (this.saveBtn) {
            const newSaveBtn = this.saveBtn.cloneNode(true);
            this.saveBtn.parentNode.replaceChild(newSaveBtn, this.saveBtn);
            this.saveBtn = newSaveBtn;
            this.saveBtn.addEventListener('click', () => this.savePost());
        }
        
        if (this.deleteBtn) {
            const newDeleteBtn = this.deleteBtn.cloneNode(true);
            this.deleteBtn.parentNode.replaceChild(newDeleteBtn, this.deleteBtn);
            this.deleteBtn = newDeleteBtn;
            this.deleteBtn.addEventListener('click', () => this.deletePost());
        }
        
        if (this.postTitle) {
            const newPostTitle = this.postTitle.cloneNode(true);
            this.postTitle.parentNode.replaceChild(newPostTitle, this.postTitle);
            this.postTitle = newPostTitle;
            this.postTitle.addEventListener('input', () => this.onContentChange());
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
                autoSaveTimeout = setTimeout(() => this.savePost(), 3000);
            });
        }
    }

    loadData() {
        const savedStreams = localStorage.getItem('ulysses-streams');
        if (savedStreams) {
            this.streams = JSON.parse(savedStreams);
            
            // IDの最大値を計算
            let maxStreamId = 0;
            let maxPostId = 0;
            
            this.streams.forEach(stream => {
                maxStreamId = Math.max(maxStreamId, stream.id);
                stream.posts.forEach(post => {
                    maxPostId = Math.max(maxPostId, post.id);
                });
            });
            
            this.nextStreamId = maxStreamId + 1;
            this.nextPostId = maxPostId + 1;
        } else {
            // デフォルトストリームを作成
            this.createDefaultStreams();
        }
    }

    saveData() {
        localStorage.setItem('ulysses-streams', JSON.stringify(this.streams));
    }

    createDefaultStreams() {
        const defaultStreams = [
            {
                id: this.nextStreamId++,
                name: '📝 メモ',
                type: 'memo',
                posts: [],
                expanded: true,
                createdAt: new Date().toISOString(),
                config: {
                    allowMarkdown: true,
                    showCharCount: true
                }
            },
            {
                id: this.nextStreamId++,
                name: '🛒 買い物',
                type: 'shopping',
                posts: [],
                expanded: true,
                createdAt: new Date().toISOString(),
                config: {
                    fields: ['item', 'price', 'datetime'],
                    fieldLabels: {
                        item: '購入物',
                        price: '金額',
                        datetime: '日時'
                    },
                    showTotal: true
                }
            },
            {
                id: this.nextStreamId++,
                name: '✅ ToDoリスト',
                type: 'todo',
                posts: [],
                expanded: true,
                createdAt: new Date().toISOString(),
                config: {
                    fields: ['task', 'priority', 'dueDate', 'completed'],
                    priorities: ['高', '中', '低']
                }
            }
        ];
        
        this.streams.push(...defaultStreams);
        this.saveData();
    }

    createNewStream() {
        // ストリームタイプ選択ダイアログを表示
        this.showStreamTypeSelector();
    }

    showStreamTypeSelector() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>新しいストリームを作成</h3>
                <div class="stream-types">
                    <button class="stream-type-btn" data-type="memo">
                        <span class="icon">📝</span>
                        <span class="name">メモ</span>
                        <span class="description">自由なテキストメモ</span>
                    </button>
                    <button class="stream-type-btn" data-type="shopping">
                        <span class="icon">🛒</span>
                        <span class="name">買い物リスト</span>
                        <span class="description">商品・数量・価格管理</span>
                    </button>
                    <button class="stream-type-btn" data-type="todo">
                        <span class="icon">✅</span>
                        <span class="name">ToDoリスト</span>
                        <span class="description">タスク・優先度・期限管理</span>
                    </button>
                </div>
                <div class="modal-actions">
                    <button class="cancel-btn">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // イベントリスナー
        modal.querySelectorAll('.stream-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.createStreamOfType(type);
                document.body.removeChild(modal);
            });
        });

        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // 背景クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    createStreamOfType(type) {
        const streamConfigs = {
            memo: {
                name: '新しいメモストリーム',
                icon: '📝',
                config: {
                    allowMarkdown: true,
                    showCharCount: true
                }
            },
            shopping: {
                name: '新しい買い物リスト',
                icon: '🛒',
                config: {
                    fields: ['item', 'price', 'datetime'],
                    fieldLabels: {
                        item: '購入物',
                        price: '金額',
                        datetime: '日時'
                    },
                    showTotal: true
                }
            },
            todo: {
                name: '新しいToDoリスト',
                icon: '✅',
                config: {
                    fields: ['task', 'priority', 'dueDate', 'completed'],
                    priorities: ['高', '中', '低']
                }
            }
        };

        const config = streamConfigs[type];
        const newStream = {
            id: this.nextStreamId++,
            name: config.name,
            type: type,
            posts: [],
            expanded: true,
            createdAt: new Date().toISOString(),
            config: config.config
        };

        this.streams.push(newStream);
        this.saveData();
        this.renderTree();
    }

    createNewPost(streamId = null) {
        // ストリームが指定されていない場合、最初のストリームを使用
        if (!streamId && this.streams.length > 0) {
            streamId = this.streams[0].id;
        }

        if (!streamId) {
            this.createDefaultStreams();
            streamId = this.streams[0].id;
        }

        const stream = this.streams.find(s => s.id === streamId);
        if (!stream) return;

        // ストリームタイプに応じて異なるポスト構造を作成
        const newPost = this.createPostByType(stream.type, streamId);

        stream.posts.unshift(newPost);
        stream.expanded = true; // ストリームを展開
        this.saveData();
        this.renderTree();
        this.selectPost(newPost.id);
        
        // タイトルフィールドにフォーカス
        setTimeout(() => {
            if (this.postTitle) {
                this.postTitle.select();
            }
        }, 100);
    }

    createPostByType(type, streamId) {
        const basePost = {
            id: this.nextPostId++,
            streamId: streamId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        switch (type) {
            case 'memo':
                return {
                    ...basePost,
                    title: '新しいメモ',
                    content: '',
                    data: {}
                };
            
            case 'shopping':
                return {
                    ...basePost,
                    title: '新しい購入物',
                    data: {
                        item: '',
                        price: 0,
                        datetime: new Date().toISOString()
                    }
                };
            
            case 'todo':
                return {
                    ...basePost,
                    title: '新しいタスク',
                    data: {
                        task: '',
                        priority: '中',
                        dueDate: '',
                        completed: false
                    }
                };
            
            default:
                return {
                    ...basePost,
                    title: '新しいポスト',
                    content: '',
                    data: {}
                };
        }
    }

    selectPost(postId) {
        // ポストを探す
        let selectedPost = null;
        for (const stream of this.streams) {
            const post = stream.posts.find(p => p.id === postId);
            if (post) {
                selectedPost = post;
                break;
            }
        }

        if (!selectedPost) return;

        this.currentPostId = postId;
        if (this.postTitle) this.postTitle.value = selectedPost.title;
        if (this.editor) this.editor.value = selectedPost.content || '';
        
        this.updateActivePost();
        this.updateCharCount();
        this.updateStatus('saved');
        this.hideEmptyState();
    }

    savePost() {
        if (!this.currentPostId) return;

        // ポストを探して更新
        for (const stream of this.streams) {
            const post = stream.posts.find(p => p.id === this.currentPostId);
            if (post) {
                post.title = this.postTitle?.value || '無題のポスト';
                post.content = this.editor?.value || '';
                post.updatedAt = new Date().toISOString();
                
                this.saveData();
                this.renderTree();
                this.updateActivePost();
                this.updateStatus('saved');
                break;
            }
        }
    }

    deletePost() {
        if (!this.currentPostId) return;

        // ポストを探して削除
        for (const stream of this.streams) {
            const postIndex = stream.posts.findIndex(p => p.id === this.currentPostId);
            if (postIndex !== -1) {
                stream.posts.splice(postIndex, 1);
                this.saveData();
                this.renderTree();
                
                // 他のポストがあれば選択、なければ空の状態に
                const allPosts = this.getAllPosts();
                if (allPosts.length > 0) {
                    this.selectPost(allPosts[0].id);
                } else {
                    this.currentPostId = null;
                    this.showEmptyState();
                }
                break;
            }
        }
    }

    deleteStream(streamId) {
        const stream = this.streams.find(s => s.id === streamId);
        if (!stream) return;

        this.streams = this.streams.filter(s => s.id !== streamId);
        
        // 削除されたストリームのポストが選択されている場合
        if (this.currentPostId && stream.posts.some(p => p.id === this.currentPostId)) {
            this.currentPostId = null;
            const allPosts = this.getAllPosts();
            if (allPosts.length > 0) {
                this.selectPost(allPosts[0].id);
            } else {
                this.showEmptyState();
            }
        }

        this.saveData();
        this.renderTree();
    }

    selectStream(streamId) {
        this.currentStreamId = streamId;
        this.currentPostId = null;
        
        const stream = this.streams.find(s => s.id === streamId);
        if (!stream) return;

        // URLを更新
        this.updateURL(stream.type);

        this.renderTree();
        
        // ストリーム専用の表示に切り替え
        this.showStreamView(stream);
    }

    showStreamView(stream) {
        const editorArea = document.querySelector('.editor-area');
        if (!editorArea) return;

        // ストリームタイプに応じた表示を生成
        switch (stream.type) {
            case 'shopping':
                this.showShoppingStreamView(stream);
                break;
            case 'todo':
                this.showTodoStreamView(stream);
                break;
            case 'memo':
            default:
                this.showMemoStreamView(stream);
                break;
        }
    }

    showShoppingStreamView(stream) {
        const editorArea = document.querySelector('.editor-area');
        
        editorArea.innerHTML = `
            <div class="stream-view">
                <div class="stream-header">
                    <h2>🛒 ${stream.name}</h2>
                    <div class="stream-form">
                        <div class="form-group">
                            <label>購入物</label>
                            <input type="text" id="newItem" placeholder="商品名を入力">
                        </div>
                        <div class="form-group">
                            <label>金額</label>
                            <input type="number" id="newPrice" placeholder="0" min="0">
                        </div>
                        <button class="add-post-btn" id="addShoppingPost">追加</button>
                    </div>
                </div>
                
                <div class="posts-list">
                    <div class="posts-summary">
                        <span class="total-count">${stream.posts.length} 件</span>
                        <span class="total-amount">合計: ¥${this.calculateTotal(stream.posts)}</span>
                    </div>
                    <div class="posts-table">
                        <div class="table-header">
                            <span class="col-item">購入物</span>
                            <span class="col-price">金額</span>
                            <span class="col-datetime">日時</span>
                            <span class="col-actions">操作</span>
                        </div>
                        <div class="table-body" id="postsTableBody">
                            ${this.renderShoppingPosts(stream.posts)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // イベントリスナーを追加
        this.bindShoppingEvents(stream);
    }

    calculateTotal(posts) {
        return posts.reduce((total, post) => total + (post.data?.price || 0), 0).toLocaleString();
    }

    renderShoppingPosts(posts) {
        const now = new Date();
        
        return posts.map(post => {
            const postDate = new Date(post.data?.datetime || post.createdAt);
            const elapsedSeconds = (now - postDate) / 1000;
            const isOld = elapsedSeconds >= 10;
            const rowClass = isOld ? 'table-row old-post' : 'table-row';
            
            const formattedDate = this.formatDateTime(postDate);
            
            return `
                <div class="${rowClass}" data-post-id="${post.id}">
                    <span class="col-item">${post.data?.item || ''}</span>
                    <span class="col-price">¥${(post.data?.price || 0).toLocaleString()}</span>
                    <span class="col-datetime">${formattedDate}</span>
                    <span class="col-actions">
                        <button class="edit-post-btn" data-post-id="${post.id}">編集</button>
                        <button class="delete-post-btn" data-post-id="${post.id}">削除</button>
                    </span>
                </div>
            `;
        }).join('');
    }

    formatDateTime(date) {
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    bindShoppingEvents(stream) {
        const addBtn = document.getElementById('addShoppingPost');
        const itemInput = document.getElementById('newItem');
        const priceInput = document.getElementById('newPrice');

        addBtn.addEventListener('click', () => {
            const item = itemInput.value.trim();
            const price = parseInt(priceInput.value) || 0;

            if (!item) {
                alert('購入物を入力してください');
                return;
            }

            // 現在時刻を自動で設定
            const currentDatetime = new Date().toISOString();
            
            this.addShoppingPost(stream.id, item, price, currentDatetime);
            
            // フォームをリセット
            itemInput.value = '';
            priceInput.value = '';
        });

        // Enterキーで追加
        [itemInput, priceInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addBtn.click();
                }
            });
        });

        // テーブルのイベント
        const tableBody = document.getElementById('postsTableBody');
        tableBody.addEventListener('click', (e) => {
            const postId = parseInt(e.target.dataset.postId);
            if (e.target.classList.contains('delete-post-btn')) {
                this.deletePostById(postId);
                this.showStreamView(stream); // 再表示
            } else if (e.target.classList.contains('edit-post-btn')) {
                this.editShoppingPost(postId);
            }
        });
    }

    addShoppingPost(streamId, item, price, datetime) {
        const stream = this.streams.find(s => s.id === streamId);
        if (!stream) return;

        const newPost = {
            id: this.nextPostId++,
            title: item,
            streamId: streamId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            data: {
                item: item,
                price: price,
                datetime: datetime
            }
        };

        stream.posts.unshift(newPost);
        this.saveData();
        this.renderTree();
        this.showStreamView(stream); // 再表示
    }

    editShoppingPost(postId) {
        // 簡単な編集機能（プロンプトベース）
        for (const stream of this.streams) {
            const post = stream.posts.find(p => p.id === postId);
            if (post) {
                const newItem = prompt('購入物:', post.data?.item || '');
                if (newItem === null) return;
                
                const newPrice = prompt('金額:', post.data?.price || 0);
                if (newPrice === null) return;

                post.title = newItem;
                post.data.item = newItem;
                post.data.price = parseInt(newPrice) || 0;
                
                // 編集時は元の日時を保持（変更しない）
                // post.data.datetime はそのまま
                
                post.updatedAt = new Date().toISOString();

                this.saveData();
                this.renderTree();
                this.showStreamView(stream);
                break;
            }
        }
    }

    getAllPosts() {
        const editorArea = document.querySelector('.editor-area');
        editorArea.innerHTML = `
            <div class="stream-view">
                <div class="stream-header">
                    <h2>📝 ${stream.name}</h2>
                    <p>メモポストをクリックして編集するか、「📝 新規ポスト」で新しいメモを作成してください。</p>
                </div>
                <div class="posts-list">
                    <div class="posts-summary">
                        <span class="total-count">${stream.posts.length} 件のメモ</span>
                    </div>
                </div>
            </div>
        `;
    }

    showTodoStreamView(stream) {
        const editorArea = document.querySelector('.editor-area');
        editorArea.innerHTML = `
            <div class="stream-view">
                <div class="stream-header">
                    <h2>✅ ${stream.name}</h2>
                    <p>ToDoポストをクリックして編集するか、「📝 新規ポスト」で新しいタスクを作成してください。</p>
                </div>
                <div class="posts-list">
                    <div class="posts-summary">
                        <span class="total-count">${stream.posts.length} 件のタスク</span>
                    </div>
                </div>
            </div>
        `;
    }

    getAllPosts() {
        return this.streams.flatMap(stream => stream.posts);
    }

    renderTree() {
        if (!this.treeView) return;
        
        this.treeView.innerHTML = '';

        this.streams.forEach(stream => {
            const streamElement = this.createStreamElement(stream);
            this.treeView.appendChild(streamElement);
        });
    }

    createStreamElement(stream) {
        const streamDiv = document.createElement('div');
        streamDiv.className = 'stream';
        
        const headerDiv = document.createElement('div');
        const isSelected = this.currentStreamId === stream.id;
        headerDiv.className = `stream-header ${isSelected ? 'selected' : ''}`;
        
        // ストリームタイプに応じたアイコンを設定
        const icon = this.getStreamIcon(stream.type);
        
        headerDiv.innerHTML = `
            <div class="stream-info">
                <span class="stream-name">${icon} ${stream.name}</span>
                <span class="post-count">(${stream.posts.length})</span>
            </div>
        `;
        
        // ストリームクリックイベント
        headerDiv.addEventListener('click', (e) => {
            this.selectStream(stream.id);
        });
        
        streamDiv.appendChild(headerDiv);
        
        // ポストリストは表示しない（削除）
        
        return streamDiv;
    }

    getStreamIcon(type) {
        const icons = {
            memo: '📝',
            shopping: '🛒',
            todo: '✅'
        };
        return icons[type] || '📄';
    }

    createPostElement(post, streamType) {
        const postDiv = document.createElement('div');
        postDiv.className = `post-item ${this.currentPostId === post.id ? 'active' : ''}`;
        
        // ストリームタイプに応じたプレビューを生成
        const preview = this.generatePostPreview(post, streamType);
        
        postDiv.innerHTML = `
            <div class="post-title">${post.title}</div>
            <div class="post-preview">${preview}</div>
            <button class="post-close">×</button>
        `;
        
        postDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('post-close')) {
                e.stopPropagation();
                e.preventDefault();
                // 重複クリック防止
                if (e.target.disabled) return;
                e.target.disabled = true;
                this.deletePostById(post.id);
                setTimeout(() => e.target.disabled = false, 500);
            } else {
                this.selectPost(post.id);
            }
        });
        
        return postDiv;
    }

    generatePostPreview(post, streamType) {
        switch (streamType) {
            case 'memo':
                return post.content?.substring(0, 30) || 'コンテンツがありません...';
            
            case 'shopping':
                const item = post.data?.item || '';
                const price = post.data?.price || 0;
                const datetime = post.data?.datetime ? new Date(post.data.datetime) : new Date(post.createdAt);
                const formattedDate = datetime.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
                const formattedTime = datetime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                return `${item} - ¥${price.toLocaleString()} (${formattedDate} ${formattedTime})`;
            
            case 'todo':
                const task = post.data?.task || '';
                const priority = post.data?.priority || '中';
                const taskCompleted = post.data?.completed ? '✓' : '○';
                return `${taskCompleted} [${priority}] ${task}`;
            
            default:
                return post.content?.substring(0, 30) || 'コンテンツがありません...';
        }
    }

    deletePostById(postId) {
        for (const stream of this.streams) {
            const postIndex = stream.posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                stream.posts.splice(postIndex, 1);
                this.saveData();
                this.renderTree();
                
                if (this.currentPostId === postId) {
                    const allPosts = this.getAllPosts();
                    if (allPosts.length > 0) {
                        this.selectPost(allPosts[0].id);
                    } else {
                        this.currentPostId = null;
                        this.showEmptyState();
                    }
                }
                break;
            }
        }
    }

    updateActivePost() {
        const postItems = this.treeView?.querySelectorAll('.post-item');
        postItems?.forEach(item => {
            item.classList.remove('active');
        });
        
        // 現在選択されているポストをハイライト
        for (const stream of this.streams) {
            const post = stream.posts.find(p => p.id === this.currentPostId);
            if (post) {
                // 対応するDOM要素を見つけてactiveクラスを追加
                const allPostElements = Array.from(this.treeView?.querySelectorAll('.post-item') || []);
                const postElements = allPostElements.filter(el => {
                    const title = el.querySelector('.post-title')?.textContent;
                    return title === post.title;
                });
                postElements.forEach(el => el.classList.add('active'));
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
                    <h2>📝 ポストがありません</h2>
                    <p>左側の「📝 新規ポスト」ボタンをクリックして<br>最初のポストを作成しましょう</p>
                    <p>ストリームを作成してポストを整理することもできます</p>
                </div>
            `;
        }
    }

    hideEmptyState() {
        const editorArea = document.querySelector('.editor-area');
        if (editorArea && editorArea.querySelector('.empty-state')) {
            editorArea.innerHTML = `
                <div class="editor-header">
                    <input type="text" class="post-title" id="postTitle" placeholder="ポストのタイトル">
                    <div class="editor-actions">
                        <button class="save-btn" id="saveBtn">保存</button>
                        <button class="delete-btn" id="deleteBtn">削除</button>
                    </div>
                </div>
                
                <textarea class="editor" id="editor" placeholder="ここにコンテンツを書いてください..."></textarea>
                
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
    window.ulysses = new UlyssesStreams();
    console.log('Ulysses Streams Tool が起動しました！');
});