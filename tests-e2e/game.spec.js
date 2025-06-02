// tests-e2e/game.spec.js
import { test, expect } from '@playwright/test';

test.describe('Card Game E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#player-1-hand .card', { timeout: 5000 });
    await page.waitForFunction(() => document.getElementById('top-card')?.textContent !== 'Empty', { timeout: 5000 });
    // Ensure game state is fully initialized before proceeding with tests
    await page.waitForFunction(() =>
      window.gameState &&
      window.gameState.deck &&
      Array.isArray(window.gameState.deck) &&
      window.gameState.deck.length === (52 - 4*3 - 1) && // Expected deck size after deal
      window.gameState.players &&
      Array.isArray(window.gameState.players) &&
      window.gameState.players.length === 4 && // Expect 4 players
      window.gameState.players[0] &&
      typeof window.gameState.players[0] === 'object' &&
      Array.isArray(window.gameState.players[0].hand) &&
      window.gameState.players[0].hand.length === 3 && // Expect 3 cards for player 0
      window.gameState.pile &&
      Array.isArray(window.gameState.pile) &&
      window.gameState.pile.length === 1 // Expect 1 card on the pile
    , { timeout: 10000 }); // Increased timeout
  });

  // Test for playing a card (already defined in previous step)
  test('Player 1 should be able to play a valid card to the pile', async ({ page }) => {
    // ... existing test content from previous step ...

    // Deterministically set up the game state for this test
    await page.evaluate(() => {
      const pileCard = { suit: '♠', rank: 6 }; // Use number for rank
      const player1Hand = [
        { suit: '♠', rank: 10 }, // Playable (matches suit), use number for rank
        { suit: '♥', rank: 3 },  // Use number for rank
        { suit: '♣', rank: 8 }   // Use number for rank
      ];
      window.gameState.pile = [pileCard];
      window.gameState.players[0].hand = player1Hand;
      window.gameState.currentPlayerIndex = 0; // Ensure it's Player 1's turn
      window.gameState.isNormanPeriod = false; // Assuming standard play for this specific test case

      // Call render functions to update UI
      if (window.renderPile && typeof window.renderPile === 'function') {
        window.renderPile();
      }
      if (window.renderPlayerHand && typeof window.renderPlayerHand === 'function') {
        window.renderPlayerHand(0); // Render for Player 1
      }
    });

    // 1. Get Player 1's initial hand
    const player1Hand = page.locator('#player-1-hand');
    const initialCards = await player1Hand.locator('.card').count();
    expect(initialCards).toBeGreaterThan(0); // Ensure Player 1 has cards

    // 2. Get the top card on the pile
    const pileTopCardElement = page.locator('#top-card');
    const pileCardText = await pileTopCardElement.textContent();
    expect(pileCardText).not.toBe('Empty');
    const pileSuit = pileCardText.charAt(0);
    const pileRankText = pileCardText.substring(1);

    console.log(`Initial pile card for play test: ${pileSuit}${pileRankText}`);

    // 3. Find a playable card in Player 1's hand
    let playableCardElement = null;
    let playedCardText = '';

    const handCards = await player1Hand.locator('.card').all();
    for (const cardElement of handCards) {
      const cardRankElement = cardElement.locator('.rank');
      const cardSuitElement = cardElement.locator('.suit');
      const handCardRank = await cardRankElement.textContent();
      const handCardSuit = await cardSuitElement.textContent();

      if (handCardSuit === pileSuit || handCardRank === pileRankText) {
        playableCardElement = cardElement;
        playedCardText = `${handCardSuit}${handCardRank}`;
        console.log(`Found playable card for play test: ${playedCardText}`);
        break;
      }
    }
    expect(playableCardElement, `No playable card found for pile: ${pileSuit}${pileRankText}. Player 1 hand: ${await player1Hand.textContent()}`).not.toBeNull();

    // 4. Click the playable card (selects it)
    await playableCardElement.click();
    await expect(playableCardElement).toHaveClass(/selected/); // Verify selection

    // 5. Click the selected card again to play it (based on updated script.js logic)
    await playableCardElement.click();

    // 6. Verify card is moved
    await expect.poll(async () => await pileTopCardElement.textContent(), { timeout: 2000 }).toBe(playedCardText);

    const finalCards = await player1Hand.locator('.card').count();
    expect(finalCards).toBe(initialCards - 1);
  });


  // New test for drawing a card
  test('Player 1 should be able to draw a card from the deck', async ({ page }) => {
    // 0. Ensure it's Player 1's turn (should be by default at game start)
    // We can verify this by checking the game message or highlighted hand
    await expect(page.locator('#player-1-hand')).toHaveClass(/current-player-hand/);
    const gameMessage = page.locator('#game-message');
    await expect(gameMessage).toContainText(/Player 1's turn/);

    // 1. Get Player 1's initial hand count
    const player1Hand = page.locator('#player-1-hand');
    const initialCardsCount = await player1Hand.locator('.card').count();
    console.log(`Initial hand count for draw test: ${initialCardsCount}`);

    // 2. Get initial deck count (indirectly, by checking it's not empty)
    // We can't directly see deck count in UI, but we can check if draw was successful
    await page.waitForFunction(() => window.gameState && window.gameState.deck && Array.isArray(window.gameState.deck));
    const initialDeckSize = await page.evaluate(() => window.gameState.deck.length);
    console.log(`Initial deck size for draw test: ${initialDeckSize}`);
    expect(initialDeckSize).toBeGreaterThan(0); // Expect deck to have cards

    // 3. Locate and click the "draw card" button
    const drawButton = page.locator('#draw-button');
    await expect(drawButton).toBeEnabled();
    await drawButton.click();

    // 4.a Verify window.gameState.players[0].hand.length directly
    await expect.poll(async () => {
      return await page.evaluate(() => window.gameState.players[0].hand.length);
    }, {
      message: 'Check window.gameState.players[0].hand.length directly after draw',
      timeout: 2000
    }).toBe(initialCardsCount + 1);

    // 4.b Verify Player 1's hand count increases by one (in DOM)
    // Need to wait for the hand to re-render
    await expect.poll(async () => {
      return await player1Hand.locator('.card').count();
    }, {
      message: 'Hand count should increase by 1 after drawing',
      timeout: 3000 // Increased timeout for state update and re-render
    }).toBe(initialCardsCount + 1);

    const finalCardsCount = await player1Hand.locator('.card').count();
    console.log(`Final hand count for draw test: ${finalCardsCount}`);
    expect(finalCardsCount).toBe(initialCardsCount + 1);

    // 5. Verify deck count decreases by one (indirectly through gameState), using poll
    await expect.poll(async () => {
      return await page.evaluate(() => window.gameState.deck.length);
    }, {
      message: 'Check window.gameState.deck.length after draw',
      timeout: 2000
    }).toBe(initialDeckSize - 1);
    // Log the final deck size after successful poll for debugging
    const finalDeckSizeFromState = await page.evaluate(() => window.gameState.deck.length);
    console.log(`Final deck size from gameState after draw: ${finalDeckSizeFromState}`);

    // 6. Verify it's no longer Player 1's turn (turn should advance)
    // Wait for game message to update, indicating turn change
    await expect(gameMessage).not.toContainText(/Player 1's turn/, { timeout: 2000 });
    await expect(gameMessage).toContainText(/Player 2's turn/); // Assuming Player 2 is next
    await expect(page.locator('#player-1-hand')).not.toHaveClass(/current-player-hand/);
    await expect(page.locator('#player-2-hand')).toHaveClass(/current-player-hand/);
  });
});
