console.log("script.js loaded");

// 1. Define Game End Condition Constant
const WINNING_SCORE = 5; // Or any other score as per spec example

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded and parsed");

  // Define gameState directly on the window object
  window.gameState = {
    deck: [],
    pile: [],
    players: [],
    currentPlayerIndex: 0,
    roundCount: 0,
    isNormanPeriod: true,
    player1SelectedCards: [],
    consecutivePasses: 0,
    isGameOver: false // Ensure this is also initialized
  };

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
  }

  // 5. Player Object/Class
  function Player(id) {
    this.id = id;
    this.hand = [];
    this.score = 0;
    this.hasPlayedThisRound = false;
  }

  // console.log("Game logic core loaded."); // gameState is now on window

  // 7. Implement initGame() function
  function initGame() {
    window.gameState.deck = createDeck();
    shuffleDeck(window.gameState.deck);
    window.gameState.pile = [];
    window.gameState.players = [];
    window.gameState.currentPlayerIndex = 0;
    window.gameState.roundCount = 0;
    window.gameState.isNormanPeriod = true;
    window.gameState.isGameOver = false;
    window.gameState.consecutivePasses = 0;
    clearPlayer1Selection();

    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
        restartButton.style.display = 'none';
    } else {
        console.warn("Restart button not found in initGame.");
    }

    for (let i = 1; i <= 4; i++) {
      window.gameState.players.push(new Player(i));
    }

    window.gameState.players.forEach(player => {
      for (let i = 0; i < 3; i++) {
        if (window.gameState.deck.length > 0) {
          player.hand.push(window.gameState.deck.pop());
        }
      }
    });

    if (window.gameState.deck.length > 0) {
      window.gameState.pile.push(window.gameState.deck.pop());
    } else {
      console.error("Deck is empty, cannot place card on pile.");
    }

    renderScores();
    renderPile();
    renderHands();

    console.log("Game initialized:", JSON.parse(JSON.stringify(window.gameState)));
    startTurn();
  }

  function getRankDisplay(rank) {
    return RANK_DISPLAY_MAP[rank] || rank.toString();
  }

  function renderScores() {
    window.gameState.players.forEach(player => {
      const scoreElement = document.getElementById(`player-${player.id}-score`);
      if (scoreElement) {
        scoreElement.textContent = `Player ${player.id}: ${player.score}`;
      } else {
        console.error(`Score element for player ${player.id} not found.`);
      }
    });
  }

  function renderPile() {
    const pileAreaTopCard = document.getElementById('top-card');
    if (!pileAreaTopCard) {
      console.error("Element with ID 'top-card' not found.");
      return;
    }
    if (window.gameState.pile.length > 0) {
      const topCard = window.gameState.pile[window.gameState.pile.length - 1];
      pileAreaTopCard.textContent = `${topCard.suit}${getRankDisplay(topCard.rank)}`;
    } else {
      pileAreaTopCard.textContent = "Empty";
    }
  }

  function renderPlayerHand(playerIndex) {
    const player = window.gameState.players[playerIndex];
    if (!player) {
      console.error(`Player with index ${playerIndex} not found.`);
      return;
    }
    // Added console logs for debugging hand rendering
    console.log(`Rendering hand for player ${player.id}. Hand via window.gameState:`, JSON.parse(JSON.stringify(window.gameState.players[playerIndex].hand)));
    console.log(`Rendering hand for player ${player.id}. Hand via player var:`, JSON.parse(JSON.stringify(player.hand)));

    const handElement = document.getElementById(`player-${player.id}-hand`);
    if (!handElement) {
      console.error(`Hand element for player ${player.id} not found.`);
      return;
    }

    handElement.innerHTML = '';

    if (playerIndex === 0) { // Player 1 (Human)
      player.hand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.innerHTML = `<span class="rank">${getRankDisplay(card.rank)}</span><span class="suit">${card.suit}</span>`;
        cardDiv.dataset.suit = card.suit;
        cardDiv.dataset.rank = card.rank;
        cardDiv.dataset.playerId = player.id;
        cardDiv.dataset.cardIndex = index;

        if (window.gameState.player1SelectedCards.includes(index)) {
          cardDiv.classList.add('selected');
        }

        cardDiv.addEventListener('click', () => {
          if (window.gameState.currentPlayerIndex !== 0) return;

          const clickedCardIndex = parseInt(cardDiv.dataset.cardIndex);
          const selectedCards = window.gameState.player1SelectedCards;
          const alreadySelectedArrayIndex = selectedCards.indexOf(clickedCardIndex);

          if (alreadySelectedArrayIndex > -1) {
            if (selectedCards.length === 1 && selectedCards[0] === clickedCardIndex) {
              console.log("Player 1 attempting to play single selected card (by clicking it again).");
              if (typeof window.tryPlayPlayer1SelectedCards === 'function') {
                window.tryPlayPlayer1SelectedCards();
              } else {
                console.error("tryPlayPlayer1SelectedCards function is not accessible.");
                updateGameMessage("Error: Play function not found.");
              }
            } else {
              selectedCards.splice(alreadySelectedArrayIndex, 1);
              cardDiv.classList.remove('selected');
              console.log(`Card at index ${clickedCardIndex} deselected.`);
            }
          } else {
            if (selectedCards.length < 2) {
              selectedCards.push(clickedCardIndex);
              cardDiv.classList.add('selected');
              console.log(`Card at index ${clickedCardIndex} selected. Total selected: ${selectedCards.length}`);
              if (selectedCards.length === 2) {
                console.log("Two cards selected, Player 1 attempting to play them as a pair.");
                if (typeof window.tryPlayPlayer1SelectedCards === 'function') {
                  window.tryPlayPlayer1SelectedCards();
                } else {
                  console.error("tryPlayPlayer1SelectedCards function is not accessible for two-card play.");
                  updateGameMessage("Error: Play function not found for two cards.");
                }
              }
            } else {
              updateGameMessage("You already have 2 cards selected. Deselect one, or click a selected card again to play it solo.");
              console.log("Player 1 tried to select a third card while two were already selected.");
            }
          }
        });
        handElement.appendChild(cardDiv);
      });
    } else { // CPU Players (playerIndex 1, 2, or 3)
      player.hand.forEach(() => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card', 'card-back');
        cardDiv.textContent = '??';
        handElement.appendChild(cardDiv);
      });
    }
  }

  function renderHands() {
    for (let i = 0; i < window.gameState.players.length; i++) {
      renderPlayerHand(i);
    }
  }

  function updateGameMessage(message) {
    const gameMessageElement = document.getElementById('game-message');
    if (gameMessageElement) {
      gameMessageElement.textContent = message;
    } else {
      console.error("Game message element not found.");
    }
  }

  function highlightCurrentPlayer() {
    document.querySelectorAll('.player-hand').forEach(handDiv => {
      handDiv.classList.remove('current-player-hand');
    });

    if (window.gameState.players.length > 0 && window.gameState.players[window.gameState.currentPlayerIndex]) {
      const currentPlayerId = window.gameState.players[window.gameState.currentPlayerIndex].id;
      const currentPlayerHandElement = document.getElementById(`player-${currentPlayerId}-hand`);
      if (currentPlayerHandElement) {
        currentPlayerHandElement.classList.add('current-player-hand');
      } else {
        console.error(`Hand element for current player ${currentPlayerId} not found.`);
      }
    }
  }

  initGame();

  function clearPlayer1Selection() {
    window.gameState.player1SelectedCards = [];
    const player1HandElement = document.getElementById('player-1-hand');
    if (player1HandElement) {
      player1HandElement.querySelectorAll('.card.selected').forEach(cardDiv => {
        cardDiv.classList.remove('selected');
      });
    }
  }

  const drawButton = document.getElementById('draw-button');
  if (drawButton) {
    drawButton.addEventListener('click', () => {
      if (window.gameState.currentPlayerIndex === 0) {
        drawCard(0);
      } else {
        console.log("Player 1 clicked draw, but it's not their turn.");
      }
    });
  } else {
    console.error("Draw button not found!");
  }

  const restartButtonElement = document.getElementById('restart-button');
  if (restartButtonElement) {
    restartButtonElement.addEventListener('click', () => {
      console.log("Restart button clicked. Re-initializing game.");
      initGame();
    });
  } else {
    console.error("Restart button element not found for attaching listener!");
  }

  function startTurn() {
    highlightCurrentPlayer();
    const currentPlayer = window.gameState.players[window.gameState.currentPlayerIndex];
    if (!currentPlayer) {
        console.error("Current player is undefined in startTurn.");
        updateGameMessage("Error: Current player not found. Please reset game.");
        return;
    }
    updateGameMessage(`Player ${currentPlayer.id}'s turn. Cards in hand: ${currentPlayer.hand.length}. Pile: ${window.gameState.pile.length > 0 ? window.gameState.pile[window.gameState.pile.length -1].suit + getRankDisplay(window.gameState.pile[window.gameState.pile.length -1].rank) : 'Empty'}`);
    console.log(`Starting turn for Player ${currentPlayer.id}`);

    if (window.gameState.currentPlayerIndex > 0) {
      updateGameMessage(`Player ${currentPlayer.id} is thinking...`);
      if (drawButton) drawButton.disabled = true;
      setTimeout(() => {
        cpuTakeTurn(window.gameState.currentPlayerIndex);
        if (window.gameState.currentPlayerIndex === 0 && drawButton) {
            drawButton.disabled = false;
        }
      }, 1500);
    } else {
      if (drawButton) drawButton.disabled = false;
    }
  }

  function checkNormanPeriodEnd() {
    if (window.gameState.isNormanPeriod) {
      const allPlayersPlayed = window.gameState.players.every(player => player.hasPlayedThisRound);
      if (allPlayersPlayed) {
        window.gameState.isNormanPeriod = false;
        window.gameState.players.forEach(player => player.hasPlayedThisRound = false);
        updateGameMessage(document.getElementById('game-message').textContent + " Norman period has ended. Players can now 'Man'!");
        console.log("Norman period ended.");
      }
    }
  }

  function tryPlayPlayer1SelectedCards() {
    if (window.gameState.currentPlayerIndex !== 0) return;

    const selectedIndices = window.gameState.player1SelectedCards;
    const player = window.gameState.players[0];

    if (selectedIndices.length === 1) {
      console.log("Attempting to play 1 selected card.");
      playCard(0, selectedIndices[0]);
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
        renderPlayerHand(0);
        return;
      }

      const topPileCard = window.gameState.pile.length > 0 ? window.gameState.pile[window.gameState.pile.length - 1] : null;
      const sameRank = card1.rank === card2.rank;
      const card1Playable = !topPileCard || card1.suit === topPileCard.suit || card1.rank === topPileCard.rank;
      const card2Playable = !topPileCard || card2.suit === topPileCard.suit || card2.rank === topPileCard.rank;

      if (sameRank && (card1Playable || card2Playable)) {
        let primaryCard;
        if (card1Playable) {
          primaryCard = card1;
        } else {
          primaryCard = card2;
        }

        console.log(`Player 1 playing two cards: ${getRankDisplay(card1.rank)}${card1.suit} and ${getRankDisplay(card2.rank)}${card2.suit}. Primary to pile: ${getRankDisplay(primaryCard.rank)}${primaryCard.suit}`);
        const indicesToRemove = [card1Index, card2Index].sort((a, b) => b - a);
        indicesToRemove.forEach(index => player.hand.splice(index, 1));

        window.gameState.pile.push(primaryCard);
        player.hasPlayedThisRound = true;
        window.gameState.consecutivePasses = 0;

        clearPlayer1Selection();
        renderPlayerHand(0);
        renderPile();
        updateGameMessage(`Player 1 played two ${getRankDisplay(primaryCard.rank)}s. Hand: ${player.hand.length}.`);

        const isWin = checkWin(0);
        if (isWin) {
          updateGameMessage(`Player 1 MANNED with two cards! Round over.`);
          console.log(`Win detected for player 1 after two-card play. Calling updateScores.`);
          updateScores(0);
          return;
        }
        checkNormanPeriodEnd();
        endTurn();
      } else {
        let message = "Invalid two-card play.";
        if (!sameRank) message += " Cards must be of the same rank.";
        if (sameRank && !(card1Playable || card2Playable)) message += " Neither card is playable on the current pile.";
        updateGameMessage(message);
        console.log("Invalid two-card play:", {card1, card2, topPileCard, sameRank, card1Playable, card2Playable});
        clearPlayer1Selection();
        renderPlayerHand(0);
      }
    } else {
      console.log("tryPlayPlayer1SelectedCards called with " + selectedIndices.length + " cards. Clearing selection.");
      clearPlayer1Selection();
      renderPlayerHand(0);
    }
  }

  function playCard(playerIndex, cardHandIndex) {
    const player = window.gameState.players[playerIndex];
    if (!player) {
        console.error("Player not found for index:", playerIndex);
        updateGameMessage("Error: Player not found.");
        return;
    }
    const cardToPlay = player.hand[cardHandIndex];

    if (playerIndex !== window.gameState.currentPlayerIndex) {
      console.error(`Not your turn! Player ${player.id} tried to play out of turn.`);
      return;
    }
    if (!cardToPlay) {
      console.error("Invalid card selected by Player", player.id, "at index", cardHandIndex);
      updateGameMessage(`Player ${player.id}, that card is not valid.`);
      return;
    }

    const topPileCard = window.gameState.pile[window.gameState.pile.length - 1];
    if (window.gameState.pile.length > 0 && cardToPlay.suit !== topPileCard.suit && cardToPlay.rank !== topPileCard.rank) {
      updateGameMessage(`Invalid move, Player ${player.id}. Card ${cardToPlay.suit}${getRankDisplay(cardToPlay.rank)} must match suit (${topPileCard.suit}) or rank (${getRankDisplay(topPileCard.rank)}). Try again.`);
      return;
    }

    player.hand.splice(cardHandIndex, 1);
    window.gameState.pile.push(cardToPlay);
    player.hasPlayedThisRound = true;
    window.gameState.consecutivePasses = 0;

    if (playerIndex === 0) {
      clearPlayer1Selection();
    }

    renderPlayerHand(playerIndex);
    renderPile();
    const messageAfterPlay = `Player ${player.id} played ${cardToPlay.suit}${getRankDisplay(cardToPlay.rank)}. Hand: ${player.hand.length}.`;
    updateGameMessage(messageAfterPlay);

    const isWin = checkWin(playerIndex);
    if (isWin) {
        updateGameMessage(`Player ${player.id} MANNED! Round over.`);
        console.log(`Win detected for player ${player.id}. Calling updateScores.`);
        updateScores(playerIndex);
        return;
    }
    checkNormanPeriodEnd();
    endTurn();
  }

  function drawCard(playerIndex) {
    const player = window.gameState.players[playerIndex];
    if (!player) {
        console.error("Player not found for index:", playerIndex);
        updateGameMessage("Error: Player not found.");
        return;
    }
    if (playerIndex !== window.gameState.currentPlayerIndex) {
      console.error(`Not your turn! Player ${player.id} tried to draw out of turn.`);
      return;
    }

    if (window.gameState.deck.length === 0) {
      if (playerIndex === 0) {
        if (!playerHasPlayableCard(0)) {
          window.gameState.consecutivePasses++;
          updateGameMessage(`Player 1 has no playable cards and deck is empty. Passing. Consecutive passes: ${window.gameState.consecutivePasses}`);
          console.log(`Player 1 passed (no playable cards, empty deck). Consecutive passes: ${window.gameState.consecutivePasses}`);
          if (!checkStalemate()) {
            endTurn();
          }
        } else {
          updateGameMessage("Deck is empty. You have playable cards, Player 1!");
        }
      } else {
         updateGameMessage("Deck is empty. Player " + player.id + " cannot draw.");
      }
      return;
    }

    const drawnCard = window.gameState.deck.pop();
    window.gameState.players[playerIndex].hand.push(drawnCard); // Explicitly using window.gameState path
    player.hasPlayedThisRound = true; // Drawing counts as playing for Norman period purposes
    window.gameState.consecutivePasses = 0;

    if (playerIndex === 0) {
      clearPlayer1Selection();
    }

    renderPlayerHand(playerIndex);
    updateGameMessage(`Player ${player.id} drew a card. Hand: ${player.hand.length}.`);
    checkNormanPeriodEnd();
    endTurn();
  }

  function endTurn() {
    if (!window.gameState.players[window.gameState.currentPlayerIndex]) {
        console.error("Current player is undefined in endTurn before advancing. Resetting to player 0.");
        window.gameState.currentPlayerIndex = 0;
    } else {
        console.log(`Ending turn for Player ${window.gameState.players[window.gameState.currentPlayerIndex].id}`);
    }

    window.gameState.currentPlayerIndex = (window.gameState.currentPlayerIndex + 1) % window.gameState.players.length;

    if (window.gameState.currentPlayerIndex === 0) {
        window.gameState.roundCount++;
        console.log(`Round ${window.gameState.roundCount} completed, starting new round.`);
        if(window.gameState.isNormanPeriod) {
            console.log("New round started, resetting hasPlayedThisRound for Norman period continuity.");
            window.gameState.players.forEach(p => p.hasPlayedThisRound = false);
        }
    }
    if (window.gameState.isGameOver) {
        console.log("Game is over. endTurn() will not start a new turn.");
        return;
    }
    startTurn();
  }

  function cpuTakeTurn(playerIndex) {
    const player = window.gameState.players[playerIndex];
    if (!player) {
      console.error(`CPU player not found at index ${playerIndex}`);
      endTurn();
      return;
    }
    console.log(`CPU Player ${player.id} (Index: ${playerIndex}) is taking its turn.`);
    const topPileCard = window.gameState.pile.length > 0 ? window.gameState.pile[window.gameState.pile.length - 1] : null;
    let bestCardIndex = -1;

    for (let i = 0; i < player.hand.length; i++) {
      const card = player.hand[i];
      const isPlayable = !topPileCard || card.suit === topPileCard.suit || card.rank === topPileCard.rank;
      if (isPlayable) {
        bestCardIndex = i;
        break;
      }
    }

    if (bestCardIndex !== -1) {
      console.log(`CPU Player ${player.id} playing card at index ${bestCardIndex}: ${player.hand[bestCardIndex].suit}${getRankDisplay(player.hand[bestCardIndex].rank)}`);
      playCard(playerIndex, bestCardIndex);
    } else {
      if (window.gameState.deck.length > 0) {
        console.log(`CPU Player ${player.id} has no playable cards, drawing a card.`);
        drawCard(playerIndex);
      } else {
        console.log(`CPU Player ${player.id} has no playable cards and deck is empty. Passing turn.`);
        window.gameState.consecutivePasses++;
        updateGameMessage(`Player ${player.id} passes. Consecutive passes: ${window.gameState.consecutivePasses}`);
        console.log(`CPU Player ${player.id} passed. Consecutive passes: ${window.gameState.consecutivePasses}`);
        if (!checkStalemate()) {
          endTurn();
        }
      }
    }
  }

  function playerHasPlayableCard(playerIndex) {
    const player = window.gameState.players[playerIndex];
    if (!player) return false;
    const topPileCard = window.gameState.pile.length > 0 ? window.gameState.pile[window.gameState.pile.length - 1] : null;
    if (!topPileCard) return true;
    for (const card of player.hand) {
      if (card.suit === topPileCard.suit || card.rank === topPileCard.rank) {
        return true;
      }
    }
    return false;
  }

  function checkWin(playerIndex) {
    const player = window.gameState.players[playerIndex];
    if (!player) {
      console.error("Player not found in checkWin for index:", playerIndex);
      return false;
    }
    if (window.gameState.isNormanPeriod) {
      return false;
    }
    const handSum = player.hand.reduce((sum, card) => sum + card.rank, 0);
    if (window.gameState.pile.length === 0) {
      console.error("Pile is empty in checkWin.");
      return false;
    }
    const topPileCard = window.gameState.pile[window.gameState.pile.length - 1];
    if (handSum === topPileCard.rank) {
      console.log(`Player ${player.id} MANNED! Hand sum: ${handSum}, Pile card rank: ${getRankDisplay(topPileCard.rank)} (${topPileCard.rank}).`);
      return true;
    }
    return false;
  }

  function checkStalemate() {
    if (window.gameState.consecutivePasses >= window.gameState.players.length) {
      window.gameState.isGameOver = true;
      updateGameMessage("Stalemate! No player can make a move. This round is a draw. Click Restart.");
      console.log("Stalemate detected. All players passed consecutively.");
      const restartButton = document.getElementById('restart-button');
      if (restartButton) {
        restartButton.style.display = 'block';
      } else {
        console.warn("Restart button not found in checkStalemate.");
      }
      return true;
    }
    return false;
  }

  function updateScores(winnerPlayerIndex) {
    const winner = window.gameState.players[winnerPlayerIndex];
    if (!winner) {
      console.error("Winner not found in updateScores for index:", winnerPlayerIndex);
      updateGameMessage("Error: Could not determine winner for scoring.");
      return;
    }
    winner.score += 1;
    console.log(`Player ${winner.id} score updated to ${winner.score}`);
    let loserPlayerIndex = (winnerPlayerIndex - 1 + window.gameState.players.length) % window.gameState.players.length;
    const loser = window.gameState.players[loserPlayerIndex];
    if (loser && loser.id !== winner.id) {
      loser.score -= 1;
      console.log(`Player ${loser.id} (previous player) score updated to ${loser.score}`);
    } else {
      console.log("Could not determine loser or only one effective player for score changes.");
    }
    renderScores();

    let overallWinner = null;
    for (const player of window.gameState.players) {
        if (player.score >= WINNING_SCORE) {
            overallWinner = player;
            break;
        }
    }

    if (overallWinner) {
        window.gameState.isGameOver = true;
        console.log(`Game Over! Player ${overallWinner.id} wins the game with ${overallWinner.score} points!`);
        updateGameMessage(`GAME OVER! Player ${overallWinner.id} wins with ${overallWinner.score} points! Click Restart to play again.`);
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.style.display = 'block';
        } else {
            console.warn("Restart button not found in updateScores when trying to show it.");
        }
        return;
    } else {
        updateGameMessage(`Player ${winner.id} won the round! Scores: P1=${window.gameState.players[0].score}, P2=${window.gameState.players[1].score}, P3=${window.gameState.players[2].score}, P4=${window.gameState.players[3].score}. Starting new round...`);
        console.log("Round ended. Re-initializing game for a new round.");
        initGame();
    }
  }

  // Expose only necessary functions to window for testing or specific interop
  // window.gameState is already defined at the top of this DOMContentLoaded scope.
  window.tryPlayPlayer1SelectedCards = tryPlayPlayer1SelectedCards;
  window.initGame = initGame; // Expose initGame
  // No need for: window.gameState = gameState; (removed)
});
