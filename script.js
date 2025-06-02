console.log("script.js loaded");

// 1. Define Game End Condition Constant
const WINNING_SCORE = 5; // Or any other score as per spec example

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded and parsed");

  // 1. Define Card Constants
  const SUITS = ["♠", "♥", "♣", "♦"];
  const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

  // Optional: Rank display mapping
  const RANK_DISPLAY_MAP = {
    1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
    8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K'
  };

  // 2. Card Representation (Implicit in createDeck)

  // 3. Deck Generation Function
  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    return deck;
  }

  // 4. Shuffle Function
  function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap elements
    }
    // The function shuffles in place, no explicit return needed,
    // but can return deck if preferred for chaining.
    // return deck;
  }

  // 5. Player Object/Class
  function Player(id) {
    this.id = id;
    this.hand = [];
    this.score = 0;
    this.hasPlayedThisRound = false; // Or some other round-specific state
  }

  // 6. Game State Object
  const gameState = {
    deck: [],
    pile: [], // Represents the 場札 (ba-fuda) or discard pile
    players: [],
    currentPlayerIndex: 0,
    roundCount: 0,
    isNormanPeriod: true, // Or other game phase flags
    player1SelectedCards: [], // For tracking Player 1's selected cards (indices)
    consecutivePasses: 0, // For tracking stalemate condition
    // Potentially other state: directionOfPlay, cardsToDraw, etc.
  };

  console.log("Game logic core loaded.");

  // 7. Implement initGame() function
  function initGame() {
    // Reset gameState properties
    gameState.deck = createDeck();
    shuffleDeck(gameState.deck);
    gameState.pile = [];
    gameState.players = [];
    gameState.currentPlayerIndex = 0;
    gameState.roundCount = 0;
    gameState.isNormanPeriod = true;
    gameState.isGameOver = false; // Initialize game over flag
    gameState.consecutivePasses = 0; // Reset stalemate counter
    clearPlayer1Selection(); // Clear selected cards

    // Hide restart button initially
    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
        restartButton.style.display = 'none';
    } else {
        console.warn("Restart button not found in initGame.");
    }

    // Create 4 player instances
    for (let i = 1; i <= 4; i++) {
      gameState.players.push(new Player(i));
    }

    // Deal 3 cards to each player
    gameState.players.forEach(player => {
      for (let i = 0; i < 3; i++) {
        if (gameState.deck.length > 0) { // Ensure deck isn't empty
          player.hand.push(gameState.deck.pop());
        }
      }
    });

    // Place one card from the deck onto the pile
    if (gameState.deck.length > 0) {
      gameState.pile.push(gameState.deck.pop());
    } else {
      console.error("Deck is empty, cannot place card on pile.");
      // Potentially handle this by reshuffling discard pile if game rules allow
    }

    // Actual UI Calls
    renderScores();
    renderPile();
    renderHands();
    // highlightCurrentPlayer(); // Called by startTurn
    // updateGameMessage(...); // Called by startTurn

    console.log("Game initialized:", JSON.parse(JSON.stringify(gameState))); // Deep copy for clean logging
    startTurn(); // Kick off the first turn
  }

  // 1. getRankDisplay helper function
  function getRankDisplay(rank) {
    return RANK_DISPLAY_MAP[rank] || rank.toString();
  }

  // 2. renderScores function
  function renderScores() {
    gameState.players.forEach(player => {
      const scoreElement = document.getElementById(`player-${player.id}-score`);
      if (scoreElement) {
        scoreElement.textContent = `Player ${player.id}: ${player.score}`;
      } else {
        console.error(`Score element for player ${player.id} not found.`);
      }
    });
  }

  // 3. renderPile function
  function renderPile() {
    const pileAreaTopCard = document.getElementById('top-card');
    if (!pileAreaTopCard) {
      console.error("Element with ID 'top-card' not found.");
      return;
    }
    if (gameState.pile.length > 0) {
      const topCard = gameState.pile[gameState.pile.length - 1];
      pileAreaTopCard.textContent = `${topCard.suit}${getRankDisplay(topCard.rank)}`;
    } else {
      pileAreaTopCard.textContent = "Empty";
    }
  }

  // 4. renderPlayerHand function
  function renderPlayerHand(playerIndex) {
    const player = gameState.players[playerIndex];
    if (!player) {
      console.error(`Player with index ${playerIndex} not found.`);
      return;
    }
    const handElement = document.getElementById(`player-${player.id}-hand`);
    if (!handElement) {
      console.error(`Hand element for player ${player.id} not found.`);
      return;
    }

    handElement.innerHTML = ''; // Clear existing cards

    if (playerIndex === 0) { // Player 1 (Human)
      player.hand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.innerHTML = `<span class="rank">${getRankDisplay(card.rank)}</span><span class="suit">${card.suit}</span>`;
        // Store card data for event handling
        cardDiv.dataset.suit = card.suit;
        cardDiv.dataset.rank = card.rank;
        cardDiv.dataset.playerId = player.id;
        cardDiv.dataset.cardIndex = index; // Keep original index

        // Add 'selected' class if the card is in player1SelectedCards
        if (gameState.player1SelectedCards.includes(index)) {
          cardDiv.classList.add('selected');
        }

        cardDiv.addEventListener('click', () => {
          if (gameState.currentPlayerIndex !== 0) return; // Only P1 can interact

          const clickedCardIndex = parseInt(cardDiv.dataset.cardIndex);
          const selectedCards = gameState.player1SelectedCards;
          const alreadySelectedArrayIndex = selectedCards.indexOf(clickedCardIndex);

          if (alreadySelectedArrayIndex > -1) {
            // Card is already selected.
            // If it's the *only* selected card, clicking it again means "play this card".
            if (selectedCards.length === 1 && selectedCards[0] === clickedCardIndex) {
              console.log("Player 1 attempting to play single selected card (by clicking it again).");
              if (typeof window.tryPlayPlayer1SelectedCards === 'function') {
                window.tryPlayPlayer1SelectedCards();
              } else if (typeof tryPlayPlayer1SelectedCards === 'function') { // Fallback if not on window yet
                tryPlayPlayer1SelectedCards();
              } else {
                console.error("tryPlayPlayer1SelectedCards function is not accessible.");
                updateGameMessage("Error: Play function not found.");
              }
            } else {
              // If multiple cards were selected, or a different selected card was clicked,
              // treat this click as "deselect this specific card".
              selectedCards.splice(alreadySelectedArrayIndex, 1);
              cardDiv.classList.remove('selected');
              console.log(`Card at index ${clickedCardIndex} deselected.`);
            }
          } else {
            // Card is not currently selected.
            if (selectedCards.length < 2) {
              selectedCards.push(clickedCardIndex);
              cardDiv.classList.add('selected');
              console.log(`Card at index ${clickedCardIndex} selected. Total selected: ${selectedCards.length}`);
              if (selectedCards.length === 2) {
                // If two cards are now selected, attempt to play them as a pair.
                console.log("Two cards selected, Player 1 attempting to play them as a pair.");
                if (typeof window.tryPlayPlayer1SelectedCards === 'function') {
                  window.tryPlayPlayer1SelectedCards();
                } else if (typeof tryPlayPlayer1SelectedCards === 'function') {
                  tryPlayPlayer1SelectedCards();
                } else {
                  console.error("tryPlayPlayer1SelectedCards function is not accessible for two-card play.");
                  updateGameMessage("Error: Play function not found for two cards.");
                }
              }
              // If only one card is selected now, user needs to click it again to play it,
              // or select a second card.
            } else {
              // Two cards are already selected, and the user clicked a third, unselected card.
              updateGameMessage("You already have 2 cards selected. Deselect one, or click a selected card again to play it solo.");
              console.log("Player 1 tried to select a third card while two were already selected.");
            }
          }
          // No explicit re-render of hand here, as selection class is toggled,
          // and playCard (if called) will re-render.
        });
        handElement.appendChild(cardDiv);
      });
    } else { // CPU Players (playerIndex 1, 2, or 3)
      player.hand.forEach(() => { // We don't need card details, just the count
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card', 'card-back');
        cardDiv.textContent = '??'; // Placeholder for card back
        // No event listeners for CPU cards
        handElement.appendChild(cardDiv);
      });
    }
  }

  // 5. renderHands function
  function renderHands() {
    for (let i = 0; i < gameState.players.length; i++) {
      renderPlayerHand(i);
    }
  }

  // 6. updateGameMessage function
  function updateGameMessage(message) {
    const gameMessageElement = document.getElementById('game-message');
    if (gameMessageElement) {
      gameMessageElement.textContent = message;
    } else {
      console.error("Game message element not found.");
    }
  }

  // 7. highlightCurrentPlayer function
  function highlightCurrentPlayer() {
    // Remove highlight from all player hands
    document.querySelectorAll('.player-hand').forEach(handDiv => {
      handDiv.classList.remove('current-player-hand');
    });

    // Add highlight to the current player's hand
    if (gameState.players.length > 0 && gameState.players[gameState.currentPlayerIndex]) {
      const currentPlayerId = gameState.players[gameState.currentPlayerIndex].id;
      const currentPlayerHandElement = document.getElementById(`player-${currentPlayerId}-hand`);
      if (currentPlayerHandElement) {
        currentPlayerHandElement.classList.add('current-player-hand');
      } else {
        console.error(`Hand element for current player ${currentPlayerId} not found.`);
      }
    }
  }

  // Call initGame() to start the game when the page loads
  initGame();

  // Utility function to clear Player 1's card selection
  function clearPlayer1Selection() {
    // Clear the actual selection data
    gameState.player1SelectedCards = [];
    // Remove 'selected' class from all of Player 1's cards
    const player1HandElement = document.getElementById('player-1-hand');
    if (player1HandElement) {
      player1HandElement.querySelectorAll('.card.selected').forEach(cardDiv => {
        cardDiv.classList.remove('selected');
      });
    }
  }

  // Event listener for Draw Button
  const drawButton = document.getElementById('draw-button');
  if (drawButton) {
    drawButton.addEventListener('click', () => {
      if (gameState.currentPlayerIndex === 0) { // Only Player 1 (human) can draw
        drawCard(0);
      } else {
        console.log("Player 1 clicked draw, but it's not their turn.");
        // Optionally, provide feedback to the user:
        // updateGameMessage("It's not your turn to draw.");
      }
    });
  } else {
    console.error("Draw button not found!");
  }

  // Event listener for Restart Button
  const restartButtonElement = document.getElementById('restart-button');
  if (restartButtonElement) {
    restartButtonElement.addEventListener('click', () => {
      console.log("Restart button clicked. Re-initializing game.");
      initGame();
      // initGame() already handles hiding the restart button.
    });
  } else {
    console.error("Restart button element not found for attaching listener!");
  }

  // 1. startTurn() function
  function startTurn() {
    highlightCurrentPlayer();
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer) {
        console.error("Current player is undefined in startTurn.");
        updateGameMessage("Error: Current player not found. Please reset game.");
        return;
    }
    updateGameMessage(`Player ${currentPlayer.id}'s turn. Cards in hand: ${currentPlayer.hand.length}. Pile: ${gameState.pile.length > 0 ? gameState.pile[gameState.pile.length -1].suit + getRankDisplay(gameState.pile[gameState.pile.length -1].rank) : 'Empty'}`);
    console.log(`Starting turn for Player ${currentPlayer.id}`);

    // If it's a CPU player's turn (Player ID > 1, which means index > 0)
    if (gameState.currentPlayerIndex > 0) {
      // Player ID is index + 1. So CPU players are index 1, 2, 3.
      updateGameMessage(`Player ${currentPlayer.id} is thinking...`);
      // Disable Player 1's draw button during CPU turn (visual feedback)
      if (drawButton) drawButton.disabled = true;
      // Cards for player 1 are already not clickable if it's not their turn due to checks in playCard.

      setTimeout(() => {
        cpuTakeTurn(gameState.currentPlayerIndex);
        // Re-enable draw button if it's now Player 1's turn again (or for next human turn)
        // This check is important if cpuTakeTurn could somehow skip turns or game ends.
        if (gameState.currentPlayerIndex === 0 && drawButton) {
            drawButton.disabled = false;
        }
      }, 1500); // 1.5 second delay for CPU "thinking"
    } else {
      // It's Player 1's turn (human)
      if (drawButton) drawButton.disabled = false;
    }
  }

  // 2. checkNormanPeriodEnd() function
  function checkNormanPeriodEnd() {
    if (gameState.isNormanPeriod) {
      const allPlayersPlayed = gameState.players.every(player => player.hasPlayedThisRound);
      if (allPlayersPlayed) {
        gameState.isNormanPeriod = false;
        // Reset hasPlayedThisRound for the next phase if needed, or handle it per round
        gameState.players.forEach(player => player.hasPlayedThisRound = false); // Reset for "Man" phase or next round
        updateGameMessage(document.getElementById('game-message').textContent + " Norman period has ended. Players can now 'Man'!");
        console.log("Norman period ended.");
      }
    }
  }

  // New function to handle Player 1 playing 1 or 2 selected cards
  function tryPlayPlayer1SelectedCards() {
    if (gameState.currentPlayerIndex !== 0) return; // Should only be callable by Player 1

    const selectedIndices = gameState.player1SelectedCards;
    const player = gameState.players[0];

    if (selectedIndices.length === 1) {
      console.log("Attempting to play 1 selected card.");
      playCard(0, selectedIndices[0]); // playCard will handle clearing selection
    } else if (selectedIndices.length === 2) {
      console.log("Attempting to play 2 selected cards.");
      const card1Index = selectedIndices[0];
      const card2Index = selectedIndices[1];
      const card1 = player.hand[card1Index];
      const card2 = player.hand[card2Index];

      if (!card1 || !card2) {
        console.error("One or both selected cards not found in hand.", card1Index, card2Index, player.hand);
        updateGameMessage("Error with selection. Please try again.");
        clearPlayer1Selection();
        renderPlayerHand(0); // Re-render to fix UI
        return;
      }

      const topPileCard = gameState.pile.length > 0 ? gameState.pile[gameState.pile.length - 1] : null;

      // Validation:
      // 1. Cards must have the same rank.
      // 2. At least one card must be playable against the topPileCard.
      const sameRank = card1.rank === card2.rank;
      const card1Playable = !topPileCard || card1.suit === topPileCard.suit || card1.rank === topPileCard.rank;
      const card2Playable = !topPileCard || card2.suit === topPileCard.suit || card2.rank === topPileCard.rank;

      if (sameRank && (card1Playable || card2Playable)) {
        let primaryCard, secondaryCard;
        // Determine primary card (the one that makes the play valid and goes on the pile)
        // If both are playable, convention might be needed. Let's prefer card1 if both match.
        // Or, if one matches suit and other rank, suit match might be preferred by some rules.
        // For now, simple: if card1 is playable, it's primary. Else, card2 must be.
        if (card1Playable) {
          primaryCard = card1;
          secondaryCard = card2; // secondary is just for removal from hand
        } else {
          primaryCard = card2;
          secondaryCard = card1;
        }

        console.log(`Player 1 playing two cards: ${getRankDisplay(card1.rank)}${card1.suit} and ${getRankDisplay(card2.rank)}${card2.suit}. Primary to pile: ${getRankDisplay(primaryCard.rank)}${primaryCard.suit}`);

        // Remove both cards from hand. Sort indices descending to avoid issues with splice.
        const indicesToRemove = [card1Index, card2Index].sort((a, b) => b - a);
        indicesToRemove.forEach(index => player.hand.splice(index, 1));

        gameState.pile.push(primaryCard); // Only primary card goes to pile
        player.hasPlayedThisRound = true;
        gameState.consecutivePasses = 0; // Successful two-card play resets passes

        // Clear selection BEFORE re-rendering hand
        clearPlayer1Selection();

        renderPlayerHand(0); // Update P1 hand display
        renderPile();       // Update pile display

        updateGameMessage(`Player 1 played two ${getRankDisplay(primaryCard.rank)}s. Hand: ${player.hand.length}.`);

        const isWin = checkWin(0); // Check win condition
        if (isWin) {
          updateGameMessage(`Player 1 MANNED with two cards! Round over.`);
          console.log(`Win detected for player 1 after two-card play. Calling updateScores.`);
          updateScores(0);
          return; // Round ends
        }

        checkNormanPeriodEnd(); // Check if Norman period ends
        endTurn(); // End Player 1's turn
      } else {
        // Invalid two-card play
        let message = "Invalid two-card play.";
        if (!sameRank) message += " Cards must be of the same rank.";
        if (sameRank && !(card1Playable || card2Playable)) message += " Neither card is playable on the current pile.";
        updateGameMessage(message);
        console.log("Invalid two-card play:", {card1, card2, topPileCard, sameRank, card1Playable, card2Playable});
        clearPlayer1Selection(); // Clear selection on invalid attempt
        renderPlayerHand(0); // Re-render to remove 'selected' class
      }
    } else {
      // Should not happen if called correctly (0 or >2 cards selected)
      console.log("tryPlayPlayer1SelectedCards called with " + selectedIndices.length + " cards. Clearing selection.");
      clearPlayer1Selection();
      renderPlayerHand(0);
    }
  }

  // 3. playCard(playerIndex, cardHandIndex) function
  function playCard(playerIndex, cardHandIndex) {
    const player = gameState.players[playerIndex];

    if (!player) {
        console.error("Player not found for index:", playerIndex);
        updateGameMessage("Error: Player not found.");
        return;
    }
    const cardToPlay = player.hand[cardHandIndex];

    if (playerIndex !== gameState.currentPlayerIndex) {
      console.error(`Not your turn! Player ${player.id} tried to play out of turn.`);
      // updateGameMessage(`It's not Player ${player.id}'s turn.`); // Avoid confusing messages
      return;
    }
    if (!cardToPlay) {
      console.error("Invalid card selected by Player", player.id, "at index", cardHandIndex);
      updateGameMessage(`Player ${player.id}, that card is not valid.`);
      return;
    }

    const topPileCard = gameState.pile[gameState.pile.length - 1];

    // Playability Check (Simplified for now)
    if (gameState.pile.length > 0 && cardToPlay.suit !== topPileCard.suit && cardToPlay.rank !== topPileCard.rank) {
      updateGameMessage(`Invalid move, Player ${player.id}. Card ${cardToPlay.suit}${getRankDisplay(cardToPlay.rank)} must match suit (${topPileCard.suit}) or rank (${getRankDisplay(topPileCard.rank)}). Try again.`);
      return; // Don't end turn
    }

    // Play Card
    player.hand.splice(cardHandIndex, 1);
    gameState.pile.push(cardToPlay);
    player.hasPlayedThisRound = true;
    gameState.consecutivePasses = 0; // Successful play resets passes

    if (playerIndex === 0) {
      clearPlayer1Selection(); // Clear selection if P1 made the play
    }

    renderPlayerHand(playerIndex);
    renderPile();

    // Check if Norman period ends AFTER this play
    // This needs to be before checkWin, as game rules might state win on last card played
    // then Norman period ending message might be confusing.
    // However, for now, let's keep it simple.
    const messageAfterPlay = `Player ${player.id} played ${cardToPlay.suit}${getRankDisplay(cardToPlay.rank)}. Hand: ${player.hand.length}.`;
    updateGameMessage(messageAfterPlay); // Initial message

    // Win Check must happen BEFORE Norman period end for clarity, and before endTurn
    const isWin = checkWin(playerIndex);
    if (isWin) {
        updateGameMessage(`Player ${player.id} MANNED! Round over.`); // Overwrite previous message
        console.log(`Win detected for player ${player.id}. Calling updateScores.`);
        updateScores(playerIndex);
        return; // Round ends, do not proceed to checkNormanPeriodEnd or endTurn
    }

    // If no win, then check Norman period and proceed to end turn
    checkNormanPeriodEnd(); // This might append to the game message
    endTurn();
  }

  // 4. drawCard(playerIndex) function
  function drawCard(playerIndex) {
    const player = gameState.players[playerIndex];

    if (!player) {
        console.error("Player not found for index:", playerIndex);
        updateGameMessage("Error: Player not found.");
        return;
    }

    if (playerIndex !== gameState.currentPlayerIndex) {
      console.error(`Not your turn! Player ${player.id} tried to draw out of turn.`);
      // updateGameMessage(`It's not Player ${player.id}'s turn to draw.`);
      return;
    }

    if (gameState.deck.length === 0) {
      if (playerIndex === 0) { // Player 1 specific logic for empty deck
        if (!playerHasPlayableCard(0)) {
          gameState.consecutivePasses++;
          updateGameMessage(`Player 1 has no playable cards and deck is empty. Passing. Consecutive passes: ${gameState.consecutivePasses}`);
          console.log(`Player 1 passed (no playable cards, empty deck). Consecutive passes: ${gameState.consecutivePasses}`);
          if (!checkStalemate()) {
            endTurn();
          }
          // If stalemate, game ends.
        } else {
          updateGameMessage("Deck is empty. You have playable cards, Player 1!");
        }
      } else { // CPU (should be handled by cpuTakeTurn, but as a fallback)
         updateGameMessage("Deck is empty. Player " + player.id + " cannot draw.");
         // This path for CPU in drawCard directly usually means cpuTakeTurn decided to draw,
         // but then found deck empty. The pass logic should be in cpuTakeTurn.
         // However, to be safe, if a CPU somehow calls drawCard directly on empty deck:
         // gameState.consecutivePasses++; // This might lead to double counting if cpuTakeTurn also did.
         // updateGameMessage(`Player ${player.id} passes (cannot draw). Consecutive passes: ${gameState.consecutivePasses}`);
         // if (!checkStalemate()) endTurn();
         // For now, assume cpuTakeTurn handles its own passing.
      }
      return; // Don't proceed to draw
    }

    const drawnCard = gameState.deck.pop();
    player.hand.push(drawnCard);
    player.hasPlayedThisRound = true;
    gameState.consecutivePasses = 0; // Successful draw resets passes

    if (playerIndex === 0) {
      clearPlayer1Selection();
    }

    renderPlayerHand(playerIndex);
    updateGameMessage(`Player ${player.id} drew a card. Hand: ${player.hand.length}.`);

    checkNormanPeriodEnd();
    endTurn();
  }

  // 5. endTurn() function
  function endTurn() {
    if (!gameState.players[gameState.currentPlayerIndex]) {
        console.error("Current player is undefined in endTurn before advancing. Resetting to player 0.");
        gameState.currentPlayerIndex = 0; // Attempt recovery
    } else {
        console.log(`Ending turn for Player ${gameState.players[gameState.currentPlayerIndex].id}`);
    }

    // Advance to the next player
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    // Basic round counting for Norman period reset (if it didn't end naturally)
    // This current roundCount logic might need refinement based on game rules.
    // The primary mechanism for Norman period is `hasPlayedThisRound`.
    if (gameState.currentPlayerIndex === 0) {
        gameState.roundCount++;
        console.log(`Round ${gameState.roundCount} completed, starting new round.`);
        // If Norman period hasn't ended naturally by all players playing,
        // and a new round starts (player 0's turn), it implies players might have been stuck.
        // Depending on game rules, Norman period might reset or continue.
        // For this implementation, `checkNormanPeriodEnd` handles its own logic based on `hasPlayedThisRound`.
        // If players were stuck and couldn't play/draw, Norman period wouldn't end.
        // If a new round begins and Norman is still active, reset `hasPlayedThisRound` for all.
        if(gameState.isNormanPeriod) {
            console.log("New round started, resetting hasPlayedThisRound for Norman period continuity.");
            gameState.players.forEach(p => p.hasPlayedThisRound = false);
        }
    }
    // If game is over (win or stalemate), do not start a new turn.
    if (gameState.isGameOver) {
        console.log("Game is over. endTurn() will not start a new turn.");
        // UI should already be updated by checkWin/updateScores or checkStalemate
        // to show restart button and appropriate messages.
        return;
    }
    startTurn();
  }

  // CPU Player Logic
  function cpuTakeTurn(playerIndex) {
    const player = gameState.players[playerIndex];
    if (!player) {
      console.error(`CPU player not found at index ${playerIndex}`);
      endTurn(); // Should not happen, but end turn to prevent game stall
      return;
    }
    console.log(`CPU Player ${player.id} (Index: ${playerIndex}) is taking its turn.`);

    const topPileCard = gameState.pile.length > 0 ? gameState.pile[gameState.pile.length - 1] : null;

    // Decision Logic: Find the first playable card
    let bestCardIndex = -1;

    for (let i = 0; i < player.hand.length; i++) {
      const card = player.hand[i];
      const isPlayable = !topPileCard || card.suit === topPileCard.suit || card.rank === topPileCard.rank;
      if (isPlayable) {
        bestCardIndex = i;
        break; // Play the first valid card found
      }
    }

    if (bestCardIndex !== -1) {
      console.log(`CPU Player ${player.id} playing card at index ${bestCardIndex}: ${player.hand[bestCardIndex].suit}${getRankDisplay(player.hand[bestCardIndex].rank)}`);
      playCard(playerIndex, bestCardIndex);
    } else {
      // No playable card, try to draw
      if (gameState.deck.length > 0) {
        console.log(`CPU Player ${player.id} has no playable cards, drawing a card.`);
        drawCard(playerIndex); // drawCard will reset consecutivePasses if successful
      } else {
        // No playable card and deck is empty: CPU passes
        console.log(`CPU Player ${player.id} has no playable cards and deck is empty. Passing turn.`);
        gameState.consecutivePasses++;
        updateGameMessage(`Player ${player.id} passes. Consecutive passes: ${gameState.consecutivePasses}`);
        console.log(`CPU Player ${player.id} passed. Consecutive passes: ${gameState.consecutivePasses}`);
        if (!checkStalemate()) {
          endTurn();
        }
        // If checkStalemate() is true, game is over, endTurn() shouldn't proceed to next turn.
        // endTurn() itself will be modified to check gameState.isGameOver.
        // If stalemate, the game stops here for this CPU.
      }
    }
  }

  // Helper function to check if a player has any playable card
  function playerHasPlayableCard(playerIndex) {
    const player = gameState.players[playerIndex];
    if (!player) return false;

    const topPileCard = gameState.pile.length > 0 ? gameState.pile[gameState.pile.length - 1] : null;

    if (!topPileCard) return true; // Any card is playable if pile is empty

    for (const card of player.hand) {
      if (card.suit === topPileCard.suit || card.rank === topPileCard.rank) {
        return true; // Found a playable card
      }
    }
    return false; // No playable card found
  }

  // 1. checkWin(playerIndex) function
  function checkWin(playerIndex) {
    const player = gameState.players[playerIndex];
    if (!player) {
      console.error("Player not found in checkWin for index:", playerIndex);
      return false;
    }

    // Norman Period Check
    if (gameState.isNormanPeriod) {
      // console.log("Cannot win during Norman period."); // Potentially spammy if checked often
      return false;
    }

    // Hand Sum Calculation
    // Win condition is sum of ranks in hand EQUALS rank of top pile card.
    // Player must have at least one card to sum. If hand is empty, sum is 0.
    // If player played their last card to achieve the win, their hand would be empty *after* play.
    // The problem description says "手札の合計値が場札の数字と一致した場合、「マン！」を宣言して上がりとなる。"
    // This implies the check happens *after* the card is played and the hand is updated.
    // So, if the player plays their last card and its rank matches the new top pile card (which was the card they just played),
    // their hand sum (now 0) must equal the rank of the card they just played. This only works if the card rank is 0.
    // This interpretation seems off.
    // Let's re-read "手札の合計値". This should be the sum of cards *remaining* in hand.
    // "上がりならスコア更新" -上がり (agari) means completing a hand / winning.
    // If a player plays a card, and the *remaining* cards in their hand sum up to the rank of the card *now on top of the pile*
    // (which could be the card they just played, or a previous card if they played multiple, though current logic is 1 card),
    // then they win.

    // If their hand is empty after playing, the sum is 0.
    // They can only win if the top pile card's rank is also 0 (not possible with current ranks).
    // Exception: If playing the *last* card means you automatically win by emptying your hand (like Uno),
    // but the rule explicitly mentions "hand sum".
    // This implies you must have cards left to sum, OR if your hand becomes empty, the sum is 0.

    // Consider scenario: Player has [2, 3]. Pile is 7. Player plays 2. Pile is now 2. Hand is [3]. Sum=3. Win if 3==2 (No).
    // Player has [5]. Pile is 7. Player plays 5. Pile is now 5. Hand is []. Sum=0. Win if 0==5 (No).
    // Player has [2, J(11)]. Pile is A(1). Player plays J. Pile is J(11). Hand is [2]. Sum=2. Win if 2==11 (No).
    // Player has [2]. Pile is A(1). Player plays 2. Pile is 2. Hand is []. Sum=0. Win if 0==2 (No).

    // It seems the win condition is for players who *still have cards*.
    // What if the rule implies "declare 'Man!'" *before* playing the card that would make them win,
    // and then they play it? The current flow is play -> check.
    // The phrasing "手札の合計値が場札の数字と一致した場合、「マン！」を宣言して上がりとなる"
    // suggests the state *after* a card might have been played and the pile updated,
    // and then you check your *remaining hand*.

    if (player.hand.length === 0) {
        // If hand is empty, they cannot "sum" their hand to match the pile card, unless sum 0 is special.
        // Most card games require emptying the hand as a win, or a specific final play.
        // If the rule is strictly "sum of remaining hand == top pile rank", an empty hand (sum 0)
        // would need the top pile card to be rank 0.
        // However, the problem also states: "勝利条件：手札が0枚になった場合" as a general win condition for many card games.
        // Let's assume for "Man!" the hand is NOT empty.
        // If hand becomes empty, that's a win by "going out".
        // The spec doesn't explicitly state "going out by emptying hand" as a win for *this* game,
        // only the "Man!" condition.
        // So, if hand is empty, they can't "Man!".
        // This means a player *cannot* win by "Man!" on their very last card if it would empty their hand,
        // UNLESS the sum of an empty hand (0) matches the rank of the card they just played.
        // This seems like a specific design choice. For now, let's assume hand must not be empty for "Man".
        // Let's clarify: The problem states "勝利条件：手札の合計値が場札の数字と一致した場合、「マン！」を宣言して上がりとなる。"
        // And "手札が0枚になったプレイヤーの勝利。"
        // These are two distinct win conditions. `checkWin` here is for "Man!".
        // So, if hand is empty, this particular `checkWin` for "Man!" should be false.
        // A separate check for "hand empty" win might be needed or integrated.
        // For now, `checkWin` is JUST for the "Man!" sum condition.
        // If `player.hand.length === 0` after playing, then `handSum` will be 0.
        // This is fine.
        console.log(`Player ${player.id} hand is empty. Cannot MAN!. (Sum=0)`);
        // return false; // This was an earlier thought, but sum of 0 should be possible.
    }

    const handSum = player.hand.reduce((sum, card) => sum + card.rank, 0);

    if (gameState.pile.length === 0) {
      console.error("Pile is empty in checkWin. This should not happen if a card was just played.");
      return false; // Cannot win if pile is empty
    }
    const topPileCard = gameState.pile[gameState.pile.length - 1];

    if (handSum === topPileCard.rank) {
      console.log(`Player ${player.id} MANNED! Hand sum: ${handSum}, Pile card rank: ${getRankDisplay(topPileCard.rank)} (${topPileCard.rank}).`);
      return true;
    } else {
      // console.log(`Player ${player.id} did not MAN. Hand sum: ${handSum}, Pile card rank: ${getRankDisplay(topPileCard.rank)} (${topPileCard.rank})`);
      return false;
    }
  }

  // Function to check for stalemate condition
  function checkStalemate() {
    if (gameState.consecutivePasses >= gameState.players.length) {
      gameState.isGameOver = true; // Use existing flag to stop game progression
      updateGameMessage("Stalemate! No player can make a move. This round is a draw. Click Restart.");
      console.log("Stalemate detected. All players passed consecutively.");
      const restartButton = document.getElementById('restart-button');
      if (restartButton) {
        restartButton.style.display = 'block';
      } else {
        console.warn("Restart button not found in checkStalemate.");
      }
      return true; // Stalemate detected
    }
    return false; // No stalemate
  }

  // Modify updateScores function
  function updateScores(winnerPlayerIndex) {
    const winner = gameState.players[winnerPlayerIndex];
    if (!winner) {
      console.error("Winner not found in updateScores for index:", winnerPlayerIndex);
      updateGameMessage("Error: Could not determine winner for scoring.");
      return;
    }

    winner.score += 1;
    console.log(`Player ${winner.id} score updated to ${winner.score}`);

    // Determine Loser (player before the winner)
    // Assuming turn order is player 1 -> 2 -> 3 -> 4 -> 1 etc.
    // If player 2 (index 1) wins, player 1 (index 0) is the loser.
    // If player 1 (index 0) wins, player 4 (index 3) is the loser.
    let loserPlayerIndex = (winnerPlayerIndex - 1 + gameState.players.length) % gameState.players.length;
    const loser = gameState.players[loserPlayerIndex];

    if (loser && loser.id !== winner.id) { // Ensure loser is different, though with 4 players and correct index, it should be.
      loser.score -= 1;
      console.log(`Player ${loser.id} (previous player) score updated to ${loser.score}`);
    } else if (loser && loser.id === winner.id) {
      console.warn(`Loser is the same as winner (Player ${winner.id}). This might happen with 2 players. No loser penalty applied.`);
      // In a 2 player game, winnerPlayerIndex - 1 could be the same if not careful with modulo.
      // However, with 4 players, (idx - 1 + 4) % 4 will always be different from idx.
    }
    else {
      console.log("Could not determine loser or only one effective player for score changes.");
    }

    renderScores(); // Update score display on UI

    // Check for Game End (Placeholder)
    // if (checkGameEndCondition()) {
    //     announceWinnerAndOfferRestart();
    //     return;
    // }

    renderScores(); // Update score display on UI

    // Check for Game End
    let overallWinner = null;
    for (const player of gameState.players) {
        if (player.score >= WINNING_SCORE) {
            overallWinner = player;
            break;
        }
    }

    if (overallWinner) {
        gameState.isGameOver = true;
        console.log(`Game Over! Player ${overallWinner.id} wins the game with ${overallWinner.score} points!`);
        updateGameMessage(`GAME OVER! Player ${overallWinner.id} wins with ${overallWinner.score} points! Click Restart to play again.`);
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.style.display = 'block';
        } else {
            console.warn("Restart button not found in updateScores when trying to show it.");
        }
        // Do not start a new round if game is over
        return;
    } else {
        // No overall winner yet, proceed to start a new round
        updateGameMessage(`Player ${winner.id} won the round! Scores: P1=${gameState.players[0].score}, P2=${gameState.players[1].score}, P3=${gameState.players[2].score}, P4=${gameState.players[3].score}. Starting new round...`);
        console.log("Round ended. Re-initializing game for a new round.");
        // Using setTimeout to allow players to see the message before reset
        // setTimeout(initGame, 3000); // Delay for 3 seconds
        // For now, direct call as per instruction for testing.
        initGame(); // This will reset hands, deck, pile, isNormanPeriod, currentPlayerIndex, etc.
                    // and call startTurn()
    }
  }


  // Future game logic will go here (like event handlers)

  // Expose to window for testing
  window.gameState = gameState;
  window.tryPlayPlayer1SelectedCards = tryPlayPlayer1SelectedCards;
  window.initGame = initGame; // Expose initGame
});
