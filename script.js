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

    player.hand.forEach((card, index) => {
      const cardDiv = document.createElement('div');
      cardDiv.classList.add('card');
      cardDiv.innerHTML = `<span class="rank">${getRankDisplay(card.rank)}</span><span class="suit">${card.suit}</span>`;
      // Store card data more robustly for event handling
      cardDiv.dataset.suit = card.suit;
      cardDiv.dataset.rank = card.rank; // Store the actual rank value
      cardDiv.dataset.playerId = player.id;
      cardDiv.dataset.cardIndex = index; // Index in the current hand array

      // Example: cardDiv.addEventListener('click', handleCardPlay); // To be added later
      handElement.appendChild(cardDiv);
    });
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
    // Potentially enable/disable UI elements for the current player here
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
    player.hasPlayedThisRound = true; // Mark that player has made a move in Norman period

    renderPlayerHand(playerIndex);
    renderPile();

    // Check if Norman period ends AFTER this play
    // This needs to be before checkWin, as game rules might state win on last card played
    // then Norman period ending message might be confusing.
    // However, for now, let's keep it simple.
    const messageBeforeNormanCheck = `Player ${player.id} played ${cardToPlay.suit}${getRankDisplay(cardToPlay.rank)}. Hand: ${player.hand.length}.`;
    updateGameMessage(messageBeforeNormanCheck);

    checkNormanPeriodEnd(); // This might append to the message

    // Win Check
    const isWin = checkWin(playerIndex);
    if (isWin) {
        // updateScores will be called to handle score and next round/game end.
        updateGameMessage(`Player ${player.id} MANNED! Round over.`);
        console.log(`Win detected for player ${player.id}. Calling updateScores next.`);
        updateScores(playerIndex); // This function will be implemented in the next step
        // Do NOT call endTurn() here if it's a win, as the round ends.
        return; // Important to return here to not call endTurn()
    } else {
        // If not a win, proceed to end turn as before.
        // Message might have been updated by checkNormanPeriodEnd, so ensure this message is appropriate.
        // The message set before checkNormanPeriodEnd might be overwritten if checkNormanPeriodEnd also updates.
        // Let's ensure a clear message for the action.
        // updateGameMessage(`Player ${player.id} played ${getRankDisplay(cardToPlay.rank)}${cardToPlay.suit}. Hand: ${player.hand.length}.`);
        // The above line is similar to messageBeforeNormanCheck, which is fine.
        // checkNormanPeriodEnd might append to it.
        endTurn();
    }
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
      updateGameMessage("Deck is empty. Cannot draw. Player " + player.id + " may try to play a card.");
      // Potentially, if no playable cards, this could be a stalemate or specific game rule.
      return; // Don't end turn, player might still play a card.
    }

    const drawnCard = gameState.deck.pop();
    player.hand.push(drawnCard);
    player.hasPlayedThisRound = true; // Drawing a card counts as a move in Norman period

    renderPlayerHand(playerIndex);
    updateGameMessage(`Player ${player.id} drew a card. Hand: ${player.hand.length}.`);

    checkNormanPeriodEnd(); // Check if Norman period ends after drawing

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
    startTurn();
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
});
