# Test info

- Name: Card Game E2E Tests >> Player 1 should be able to draw a card from the deck
- Location: /app/tests-e2e/game.spec.js:104:7

# Error details

```
Error: Check window.gameState.players[0].hand.length directly after draw

expect(received).toBe(expected) // Object.is equality

Expected: 4
Received: 3

Call Log:
- Timeout 2000ms exceeded while waiting on the predicate
    at /app/tests-e2e/game.spec.js:129:5
```

# Page snapshot

```yaml
- text: "Player 1: 0 Player 2: 0 Player 3: 0 Player 4: 0 場札: ♣2"
- button "山札から引く"
- text: 8 ♥ 7 ♠ A ♦ ?? ?? ?? ?? ?? ?? ?? ?? ??
- paragraph: "Player 1's turn. Cards in hand: 3. Pile: ♣2"
```

# Test source

```ts
   29 |   test('Player 1 should be able to play a valid card to the pile', async ({ page }) => {
   30 |     // ... existing test content from previous step ...
   31 |
   32 |     // Deterministically set up the game state for this test
   33 |     await page.evaluate(() => {
   34 |       const pileCard = { suit: '♠', rank: 6 }; // Use number for rank
   35 |       const player1Hand = [
   36 |         { suit: '♠', rank: 10 }, // Playable (matches suit), use number for rank
   37 |         { suit: '♥', rank: 3 },  // Use number for rank
   38 |         { suit: '♣', rank: 8 }   // Use number for rank
   39 |       ];
   40 |       window.gameState.pile = [pileCard];
   41 |       window.gameState.players[0].hand = player1Hand;
   42 |       window.gameState.currentPlayerIndex = 0; // Ensure it's Player 1's turn
   43 |       window.gameState.isNormanPeriod = false; // Assuming standard play for this specific test case
   44 |
   45 |       // Call render functions to update UI
   46 |       if (window.renderPile && typeof window.renderPile === 'function') {
   47 |         window.renderPile();
   48 |       }
   49 |       if (window.renderPlayerHand && typeof window.renderPlayerHand === 'function') {
   50 |         window.renderPlayerHand(0); // Render for Player 1
   51 |       }
   52 |     });
   53 |
   54 |     // 1. Get Player 1's initial hand
   55 |     const player1Hand = page.locator('#player-1-hand');
   56 |     const initialCards = await player1Hand.locator('.card').count();
   57 |     expect(initialCards).toBeGreaterThan(0); // Ensure Player 1 has cards
   58 |
   59 |     // 2. Get the top card on the pile
   60 |     const pileTopCardElement = page.locator('#top-card');
   61 |     const pileCardText = await pileTopCardElement.textContent();
   62 |     expect(pileCardText).not.toBe('Empty');
   63 |     const pileSuit = pileCardText.charAt(0);
   64 |     const pileRankText = pileCardText.substring(1);
   65 |
   66 |     console.log(`Initial pile card for play test: ${pileSuit}${pileRankText}`);
   67 |
   68 |     // 3. Find a playable card in Player 1's hand
   69 |     let playableCardElement = null;
   70 |     let playedCardText = '';
   71 |
   72 |     const handCards = await player1Hand.locator('.card').all();
   73 |     for (const cardElement of handCards) {
   74 |       const cardRankElement = cardElement.locator('.rank');
   75 |       const cardSuitElement = cardElement.locator('.suit');
   76 |       const handCardRank = await cardRankElement.textContent();
   77 |       const handCardSuit = await cardSuitElement.textContent();
   78 |
   79 |       if (handCardSuit === pileSuit || handCardRank === pileRankText) {
   80 |         playableCardElement = cardElement;
   81 |         playedCardText = `${handCardSuit}${handCardRank}`;
   82 |         console.log(`Found playable card for play test: ${playedCardText}`);
   83 |         break;
   84 |       }
   85 |     }
   86 |     expect(playableCardElement, `No playable card found for pile: ${pileSuit}${pileRankText}. Player 1 hand: ${await player1Hand.textContent()}`).not.toBeNull();
   87 |
   88 |     // 4. Click the playable card (selects it)
   89 |     await playableCardElement.click();
   90 |     await expect(playableCardElement).toHaveClass(/selected/); // Verify selection
   91 |
   92 |     // 5. Click the selected card again to play it (based on updated script.js logic)
   93 |     await playableCardElement.click();
   94 |
   95 |     // 6. Verify card is moved
   96 |     await expect.poll(async () => await pileTopCardElement.textContent(), { timeout: 2000 }).toBe(playedCardText);
   97 |
   98 |     const finalCards = await player1Hand.locator('.card').count();
   99 |     expect(finalCards).toBe(initialCards - 1);
  100 |   });
  101 |
  102 |
  103 |   // New test for drawing a card
  104 |   test('Player 1 should be able to draw a card from the deck', async ({ page }) => {
  105 |     // 0. Ensure it's Player 1's turn (should be by default at game start)
  106 |     // We can verify this by checking the game message or highlighted hand
  107 |     await expect(page.locator('#player-1-hand')).toHaveClass(/current-player-hand/);
  108 |     const gameMessage = page.locator('#game-message');
  109 |     await expect(gameMessage).toContainText(/Player 1's turn/);
  110 |
  111 |     // 1. Get Player 1's initial hand count
  112 |     const player1Hand = page.locator('#player-1-hand');
  113 |     const initialCardsCount = await player1Hand.locator('.card').count();
  114 |     console.log(`Initial hand count for draw test: ${initialCardsCount}`);
  115 |
  116 |     // 2. Get initial deck count (indirectly, by checking it's not empty)
  117 |     // We can't directly see deck count in UI, but we can check if draw was successful
  118 |     await page.waitForFunction(() => window.gameState && window.gameState.deck && Array.isArray(window.gameState.deck));
  119 |     const initialDeckSize = await page.evaluate(() => window.gameState.deck.length);
  120 |     console.log(`Initial deck size for draw test: ${initialDeckSize}`);
  121 |     expect(initialDeckSize).toBeGreaterThan(0); // Expect deck to have cards
  122 |
  123 |     // 3. Locate and click the "draw card" button
  124 |     const drawButton = page.locator('#draw-button');
  125 |     await expect(drawButton).toBeEnabled();
  126 |     await drawButton.click();
  127 |
  128 |     // 4.a Verify window.gameState.players[0].hand.length directly
> 129 |     await expect.poll(async () => {
      |     ^ Error: Check window.gameState.players[0].hand.length directly after draw
  130 |       return await page.evaluate(() => window.gameState.players[0].hand.length);
  131 |     }, {
  132 |       message: 'Check window.gameState.players[0].hand.length directly after draw',
  133 |       timeout: 2000
  134 |     }).toBe(initialCardsCount + 1);
  135 |
  136 |     // 4.b Verify Player 1's hand count increases by one (in DOM)
  137 |     // Need to wait for the hand to re-render
  138 |     await expect.poll(async () => {
  139 |       return await player1Hand.locator('.card').count();
  140 |     }, {
  141 |       message: 'Hand count should increase by 1 after drawing',
  142 |       timeout: 3000 // Increased timeout for state update and re-render
  143 |     }).toBe(initialCardsCount + 1);
  144 |
  145 |     const finalCardsCount = await player1Hand.locator('.card').count();
  146 |     console.log(`Final hand count for draw test: ${finalCardsCount}`);
  147 |     expect(finalCardsCount).toBe(initialCardsCount + 1);
  148 |
  149 |     // 5. Verify deck count decreases by one (indirectly through gameState), using poll
  150 |     await expect.poll(async () => {
  151 |       return await page.evaluate(() => window.gameState.deck.length);
  152 |     }, {
  153 |       message: 'Check window.gameState.deck.length after draw',
  154 |       timeout: 2000
  155 |     }).toBe(initialDeckSize - 1);
  156 |     // Log the final deck size after successful poll for debugging
  157 |     const finalDeckSizeFromState = await page.evaluate(() => window.gameState.deck.length);
  158 |     console.log(`Final deck size from gameState after draw: ${finalDeckSizeFromState}`);
  159 |
  160 |     // 6. Verify it's no longer Player 1's turn (turn should advance)
  161 |     // Wait for game message to update, indicating turn change
  162 |     await expect(gameMessage).not.toContainText(/Player 1's turn/, { timeout: 2000 });
  163 |     await expect(gameMessage).toContainText(/Player 2's turn/); // Assuming Player 2 is next
  164 |     await expect(page.locator('#player-1-hand')).not.toHaveClass(/current-player-hand/);
  165 |     await expect(page.locator('#player-2-hand')).toHaveClass(/current-player-hand/);
  166 |   });
  167 | });
  168 |
```