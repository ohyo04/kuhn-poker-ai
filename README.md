# クーン・ポーカーゲーム (AKQ) - リファクタリング版

統計機能とAIシミュレーター機能付きのクーン・ポーカーゲームです。

## 🔄 リファクタリング完了

このプロジェクトは2025年7月29日に大規模なリファクタリングを実施しました。

### ✨ リファクタリングの主な改善点

- **モジュール化**: 1000行以上の巨大なスクリプトファイルを7つの専門モジュールに分割
- **保守性向上**: 各機能が独立したモジュールで管理され、コードの理解と修正が容易
- **拡張性向上**: 新機能の追加や既存機能の変更時の影響範囲を最小化
- **テスタビリティ**: モジュール単位でのテストが可能な構造
- **チーム開発対応**: 複数の開発者が同時に異なる機能を開発可能

### 📁 リファクタリング後の構造

```
src/public/js/
├── modules/
│   ├── DataManager.js      # データ管理（API通信、永続化）
│   ├── GameEngine.js       # ゲームロジック（状態管理、ルール）
│   ├── AIManager.js        # AI戦略（決定アルゴリズム、設定）
│   ├── UIManager.js        # UI操作（DOM操作、表示更新）
│   ├── StatsManager.js     # 統計管理（分析、フィルタリング）
│   ├── SimulatorManager.js # シミュレーション（AI vs AI）
│   └── EventManager.js     # イベント処理（統合管理）
├── config/
│   └── constants.js        # 定数定義
└── utils/
    └── helpers.js          # ユーティリティ関数
```

### 🌟 ブランチ構成

- `main`: リファクタリング後の最新版
- `pre-refactoring-backup`: リファクタリング前のオリジナルコード保存用

## 機能

- **ゲームプレイ**: クーン・ポーカー（A、K、Qの3枚カード）
- **AIプレイヤー**: 複数の戦略を持つAI相手
- **統計機能**: ゲーム履歴と詳細な統計
- **AIシミュレーター**: AI同士の対戦シミュレーション
- **ユーザー管理**: ローカルストレージを使用した簡単な認証

## デプロイ方法

### ステップ1: GitHubリポジトリの作成

1. GitHubにログインし、新しいリポジトリを作成します。
2. リポジトリ名を設定（例：kuhn-poker-game）
3. READMEファイルやライセンスファイルは作成せずに、空のリポジトリを作成します。

### ステップ2: コードをローカルリポジトリに追加

```bash
# プロジェクトディレクトリに移動
cd /path/to/your/kuhn-poker-game

# Gitリポジトリを初期化
git init

# リモートリポジトリを追加
git remote add origin https://github.com/yourusername/kuhn-poker-game.git

# ファイルをステージング
git add .

# コミット
git commit -m "Initial commit: Kuhn Poker Game with AI Simulator"

# GitHubにプッシュ
git push -u origin main
```

### ステップ3: Render.comでデプロイ

1. [Render.com](https://render.com/)にログインまたはサインアップします。
2. ダッシュボードで「New」ボタンをクリックし、「Web Service」を選択します。
3. GitHubアカウントをRenderに接続します（まだ接続していない場合）。
4. プッシュしたリポジトリを選択します。
5. 以下の設定を行います：
   - **Name**: kuhn-poker-game
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. 「Create Web Service」をクリックします。

### ステップ4: デプロイの確認

1. デプロイが完了するまで待ちます。
2. デプロイが成功したら、RenderのダッシュボードからアプリケーションのURLを確認できます。

## ローカル開発

```bash
# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev

# または本番サーバーを起動
npm start
```

ゲームは `http://localhost:3000` でアクセスできます。

## ゲームルール

クーン・ポーカーは簡略化されたポーカーゲームです：
- 各プレイヤーに1枚のカード（A、K、Q）が配られます
- Aが最強、Qが最弱です
- 各プレイヤーは最初に1チップをアンティとして支払います
- ベット/チェック/コール/フォールドのアクションを選択できます

## 技術スタック

- **フロントエンド**: HTML, CSS, JavaScript
- **バックエンド**: Node.js, Express
- **データベース**: PostgreSQL
- **認証**: JWT (JSON Web Tokens)
- **データ保存**: PostgreSQL Database（クラウド対応）
- **チャート**: Chart.js
- **デプロイ**: Render.com

## 新機能：データベース連携

- ✅ **PostgreSQL データベース**: ユーザー情報とゲームデータを永続化
- ✅ **JWT認証**: セキュアなユーザー認証システム
- ✅ **クロスデバイス対応**: 複数デバイス間でデータ同期
- ✅ **スケーラブル**: 多数のユーザーに対応可能

これで、GitHubにコードをプッシュし、Render.comでデプロイする準備が整いました。何か問題があれば、具体的なエラーメッセージや状況を教えてください。
