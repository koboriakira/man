
# マン（簡易版）ブラウザゲーム仕様書

## 目次
1. [概要](#概要)
2. [ゲームセットアップ](#ゲームセットアップ)
3. [データ構造](#データ構造)
4. [UIコンポーネント](#UIコンポーネント)
5. [ゲーム進行フロー](#ゲーム進行フロー)
6. [ターンロジック](#ターンロジック)
7. [上がり判定](#上がり判定)
8. [スコア計算](#スコア計算)
9. [ゲーム終了条件とリスタート](#ゲーム終了条件とリスタート)
10. [エッジケースと例外処理](#エッジケースと例外処理)

---

## 概要
- 本仕様書は、4人用の簡易「マン」カードゲームをブラウザ上で遊べるよう実装するための指示書です。  
- 使用カードはジョーカー抜きの52枚。各プレイヤーに3枚配り、山札から1枚を場に出して開始します。  
- プレイヤー1～4まで順番が固定され、プレイヤー1からスタートします。  
- カードを出せない場合は山札から1枚引き、手札の合計と場のカードの数字が一致すると“マン”で上がりとなります。  
- 初回ラウンド（全員が1ターンずつプレイ）終了までは上がり禁止（ノーマン期間）です。

---

## ゲームセットアップ
1. **カード定義**  
   - スート（マーク）: `♠ (spades), ♥ (hearts), ♣ (clubs), ♦ (diamonds)`  
   - ランク（数字）: `1 (Ace), 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 (Jack), 12 (Queen), 13 (King)`  
   - カードオブジェクト例:  
     ```js
     {
       suit: "hearts",   // "spades" | "hearts" | "clubs" | "diamonds"
       rank: 1           // 1〜13
     }
     ```

2. **デッキ生成とシャッフル**  
   - 52枚のカード配列を生成  
   - Fisher–Yatesアルゴリズムなどでシャッフル  

3. **プレイヤー定義**  
   - 各プレイヤーは以下のプロパティを持つオブジェクト:  
     ```js
     {
       id: 1,                   // 1〜4 の固定ID
       hand: [],                // プレイヤーの手札（カードオブジェクトの配列）
       score: 0,                // 累積スコア
       hasPlayedThisRound: false // 1巡目判定フラグ
     }
     ```

4. **ゲームオブジェクト定義**  
   - 共通のゲーム状態を保持:  
     ```js
     {
       deck: [],                // 山札（シャッフル済み）
       pile: [],                // 場札（表向きに出されたカードの配列）
       players: [],             // Playerオブジェクトの配列 (length = 4)
       currentPlayerIndex: 0,   // 0〜3 のインデックス (player1が0)
       roundCount: 0,           // プレイヤー全員が1回ずつプレイしたかの判定に使用
       isNormanPeriod: true     // ノーマン期間フラグ
     }
     ```

---

## データ構造
- **Card型**  
  ```ts
  type Card = {
    suit: "spades" | "hearts" | "clubs" | "diamonds";
    rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
  };
  ```
- **Player型**  
  ```ts
  type Player = {
    id: number;             // 1〜4
    hand: Card[];           // 手札
    score: number;          // 累積スコア
    hasPlayedThisRound: boolean;
  };
  ```
- **GameState型**  
  ```ts
  type GameState = {
    deck: Card[];            // 山札
    pile: Card[];            // 場札（履歴）
    players: Player[];       // 全プレイヤー
    currentPlayerIndex: number; // 0〜3
    roundCount: number;      // 全員が1ターンずつプレイした回数
    isNormanPeriod: boolean; // ノーマン期間フラグ
  };
  ```

---

## UIコンポーネント
1. **HTML構造 (例)**  
   ```html
   <div id="game-container">
     <div id="scoreboard">
       <!-- プレイヤーごとのスコア表示 -->
       <div class="player-score" id="player-1-score">Player 1: 0</div>
       <div class="player-score" id="player-2-score">Player 2: 0</div>
       <div class="player-score" id="player-3-score">Player 3: 0</div>
       <div class="player-score" id="player-4-score">Player 4: 0</div>
     </div>
     <div id="table-area">
       <!-- 場にあるカードの表示 -->
       <div id="pile-area">場札: <span id="top-card"></span></div>
       <!-- 山札（裏向き） -->
       <button id="draw-button">山札から引く</button>
     </div>
     <div id="hands-container">
       <!-- 各プレイヤーの手札表示エリア -->
       <div class="player-hand" id="player-1-hand"></div>
       <div class="player-hand" id="player-2-hand"></div>
       <div class="player-hand" id="player-3-hand"></div>
       <div class="player-hand" id="player-4-hand"></div>
     </div>
     <div id="message-area">
       <!-- ターン情報やエラーメッセージ表示 -->
       <p id="game-message"></p>
     </div>
   </div>
   ```

2. **CSS (基本スタイル)**  
   - 手札はカード画像またはテキストで表示し、クリック可能にする  
   - 現在のプレイヤーの手札エリアをハイライト  
   - 場札は中央上部に配置し、最新の1枚のみ表示  
   - スコアボードは画面上部に固定  

3. **カード表示方法**  
   - カード名: 例）`"♥10"`、`"♠K"` などテキストでもよいが、実装時に画像URLを管理してもよい  
   - `<div class="card" data-player="1" data-index="0">♥10</div>` のように、クリックイベントをdata属性で管理  
   - クリックすると `playCard(playerIndex, cardIndex)` を呼び出す  

---

## ゲーム進行フロー
1. **初期化 (`initGame`)**  
   - デッキを生成しシャッフル  
   - 各プレイヤーの `hand` を空配列で初期化し、`score = 0, hasPlayedThisRound = false`  
   - 山札から順にプレイヤー1～4の順で3枚ずつ配る  
   - 残った山札の先頭1枚を `pile` に移す（表向き）  
   - `currentPlayerIndex = 0`（Player1）  
   - `roundCount = 0`、`isNormanPeriod = true`  
   - UIを初期表示状態に更新  

2. **ターン開始 (`startTurn`)**  
   - `updateCurrentPlayerUI()` を呼び出して、現在のプレイヤーの手札を操作可能にする  
   - メッセージエリアに `"Player ${currentPlayerId} のターンです"` を表示  
   - ノーマン期間中か判定 (`isNormanPeriod`)  

3. **カード出し (`playCard`)**  
   - 引数: `playerIndex`, `cardIndex`  
   - 現在のプレイヤーでなければ無視  
   - 出そうとしているカードが場のトップカードと同じスートまたは同じランクか確認  
     - 同じランクであれば2枚同時出しの処理を追加で許可（要は2枚選択ロジック）  
   - 条件通りであれば:  
     1. 手札から該当カードを `pile` に移動  
     2. UIを更新して、手札からカードを消す、場札を更新  
     3. `players[playerIndex].hasPlayedThisRound = true`  
     4. ノーマン期間の終了判定：  
        - すべての `players[].hasPlayedThisRound` が `true` になったら `isNormanPeriod = false`  
     5. 上がり判定 (`checkWin`)  
        - 上がりならスコア更新 (`updateScores`) → 次ラウンドまたはゲーム終了処理  
        - 上がりでなければターン終了 (`endTurn`)  

4. **カードを出せない場合 / 山札から引く (`drawCard`)**  
   - 引数: `playerIndex`  
   - 現在のプレイヤーでなければ無視  
   - 山札 (`deck`) が空でなければ、先頭1枚を手札に追加  
   - `players[playerIndex].hasPlayedThisRound = true`  
   - ノーマン期間の終了判定（上記と同じ）  
   - ターン終了 (`endTurn`)  

5. **ターン終了 (`endTurn`)**  
   - `currentPlayerIndex = (currentPlayerIndex + 1) % 4`  
   - `roundCount` をインクリメント（全員が1回ずつプレイするごとに1増えるよう管理）  
   - 次のターン開始 (`startTurn`)  

---

## ターンロジック
1. プレイヤーがカードをクリック → `playCard(playerIndex, cardIndex)`  
2. 出せるカードでない場合はエラーメッセージ表示、行動続行  
3. 出した場合は `checkWin(playerIndex)` を呼び出し、  
   - 勝利条件成立: スコア更新 → 「Player X がマンで上がりました！」表示 → 新ラウンド or ゲーム終了  
   - 不成立: 次プレイヤーへ `endTurn()` → `startTurn()`  
4. ドローを選択（山札ボタン押下）→ `drawCard(playerIndex)` → 次プレイヤーへ  

---

## 上がり判定
- 関数: `checkWin(playerIndex)`  
  1. `player = players[playerIndex]`  
  2. `handSum = player.hand.reduce((sum, card) => sum + card.rank, 0)`  
  3. `topCard = pile[pile.length - 1]`  
  4. `if (!isNormanPeriod && handSum === topCard.rank) return true; else return false;`  

---

## スコア計算
- 関数: `updateScores(winnerIndex)`  
  1. `winner = players[winnerIndex]`  
  2. `loserIndex` は場札を出したプレイヤー（直前の `currentPlayerIndex`）  
  3. `winner.score += 1; players[loserIndex].score -= 1;`  
  4. UIのスコア表示を更新  

---

## ゲーム終了条件とリスタート
- 任意の終了条件を設定（例: 全プレイヤーが5点に達したら終了）  
- 終了時:  
  - ポップアップで勝者を表示  
  - 「再戦」ボタンが押されたら `resetGame()` を呼び出して再初期化  

---

## エッジケースと例外処理
1. **山札が空になった場合**  
   - 山札がなくなったら、それ以上ドローできない  
   - 全員がパスやドローできず行き詰まった場合に引き分け処理を行う  
2. **同じランク2枚同時出し**  
   - UI上で2枚選択状態を作り、同じランクであるかを検証  
3. **ノーマン期間中の上がり宣言抑制**  
   - `isNormanPeriod` が true の場合、`checkWin` は常に false を返す  
   - UIで「まだ上がれません（ノーマン期間）」のメッセージ表示  
4. **無効な操作（他プレイヤーのターンに手を動かす）**  
   - `currentPlayerIndex` と一致しない操作はすべて無視し、警告メッセージを表示  
5. **同時クリックや多重操作防止**  
   - カードクリックやドローボタン連打時は一度ボタン・カードを非活性化し、処理後に再度活性化  

---

以上が、4人用簡易「マン」ブラウザゲームの実装仕様書です。この仕様をもとに、HTML/CSS/JavaScriptでのコーディングを開始してください。
