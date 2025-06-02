window.debug_scriptLoadedAndExecuted = true;
console.log("script.js loaded");

// 1. Define Game End Condition Constant
const WINNING_SCORE = 5;

document.addEventListener('DOMContentLoaded', () => {
  window.debug_domContentLoadedFired = true;
  console.log("DOM fully loaded and parsed");

  window.gameState = {
    deck: [],
    pile: [],
    players: [],
    currentPlayerIndex: 0,
    roundCount: 0,
    isNormanPeriod: true,
    player1SelectedCards: [],
    consecutivePasses: 0,
    isGameOver: false
  };

  const SUITS = ["♠", "♥", "♣", "♦"];
  const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const RANK_DISPLAY_MAP = {
    1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
    8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K'
  };

  let drawButton;

  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    return deck;
  }

  function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function Player(id) {
    this.id = id;
    this.hand = [];
    this.score = 0;
    this.hasPlayedThisRound = false;
  }

  function initGame() {
    window.debug_initGame_called_timestamp = Date.now();
    window.debug_initGame_call_count = (window.debug_initGame_call_count || 0) + 1;
    console.log(`DEBUG: initGame called. Count: ${window.debug_initGame_call_count}, Timestamp: ${window.debug_initGame_called_timestamp}`);

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

    console.log("Game initialized (from initGame):", JSON.parse(JSON.stringify(window.gameState)));
    startTurn();
  }

  function getRankDisplay(rank) {
    return RANK_DISPLAY_MAP[rank] || rank.toString();
  }

  function renderScores() {
    window.gameState.players.forEach(player => {
      const scoreElement = document.getElementById(`player-${player.id}-score`);
      if (scoreElement) scoreElement.textContent = `Player ${player.id}: ${player.score}`;
      else console.error(`Score element for player ${player.id} not found.`);
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
    console.log(`Rendering hand for player ${player.id}. Hand via window.gameState:`, JSON.parse(JSON.stringify(window.gameState.players[playerIndex].hand)));
    console.log(`Rendering hand for player ${player.id}. Hand via player var:`, JSON.parse(JSON.stringify(player.hand)));

    const handElement = document.getElementById(`player-${player.id}-hand`);
    if (!handElement) {
      console.error(`Hand element for player ${player.id} not found.`);
      return;
    }
    handElement.innerHTML = '';
    if (playerIndex === 0) {
      player.hand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.innerHTML = `<span class="rank">${getRankDisplay(card.rank)}</span><span class="suit">${card.suit}</span>`;
        cardDiv.dataset.suit = card.suit;
        cardDiv.dataset.rank = card.rank;
        cardDiv.dataset.playerId = player.id;
        cardDiv.dataset.cardIndex = index;
        if (window.gameState.player1SelectedCards.includes(index)) cardDiv.classList.add('selected');
        cardDiv.addEventListener('click', () => {
          if (window.gameState.currentPlayerIndex !== 0) return;
          const clickedCardIndex = parseInt(cardDiv.dataset.cardIndex);
          const selectedCards = window.gameState.player1SelectedCards;
          const alreadySelectedArrayIndex = selectedCards.indexOf(clickedCardIndex);
          if (alreadySelectedArrayIndex > -1) {
            if (selectedCards.length === 1 && selectedCards[0] === clickedCardIndex) {
              if (typeof window.tryPlayPlayer1SelectedCards === 'function') window.tryPlayPlayer1SelectedCards();
              else console.error("tryPlayPlayer1SelectedCards function is not accessible.");
            } else {
              selectedCards.splice(alreadySelectedArrayIndex, 1);
              cardDiv.classList.remove('selected');
            }
          } else {
            if (selectedCards.length < 2) {
              selectedCards.push(clickedCardIndex);
              cardDiv.classList.add('selected');
              if (selectedCards.length === 2) {
                if (typeof window.tryPlayPlayer1SelectedCards === 'function') window.tryPlayPlayer1SelectedCards();
                else console.error("tryPlayPlayer1SelectedCards function is not accessible for two-card play.");
              }
            } else updateGameMessage("You already have 2 cards selected.");
          }
        });
        handElement.appendChild(cardDiv);
      });
    } else {
      player.hand.forEach(() => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card', 'card-back');
        cardDiv.textContent = '??';
        handElement.appendChild(cardDiv);
      });
    }
  }

  function renderHands() {
    for (let i = 0; i < window.gameState.players.length; i++) renderPlayerHand(i);
  }

  function updateGameMessage(message) {
    const gameMessageElement = document.getElementById('game-message');
    if (gameMessageElement) gameMessageElement.textContent = message;
    else console.error("Game message element not found.");
  }

  function highlightCurrentPlayer() {
    document.querySelectorAll('.player-hand').forEach(hd => hd.classList.remove('current-player-hand'));
    if (window.gameState.players.length > 0 && window.gameState.players[window.gameState.currentPlayerIndex]) {
      const currentPlayerId = window.gameState.players[window.gameState.currentPlayerIndex].id;
      const currentPlayerHandElement = document.getElementById(`player-${currentPlayerId}-hand`);
      if (currentPlayerHandElement) currentPlayerHandElement.classList.add('current-player-hand');
      else console.error(`Hand element for current player ${currentPlayerId} not found.`);
    }
  }

  initGame();

  function clearPlayer1Selection() {
    window.gameState.player1SelectedCards = [];
    const el = document.getElementById('player-1-hand');
    if (el) el.querySelectorAll('.card.selected').forEach(cd => cd.classList.remove('selected'));
  }

  drawButton = document.getElementById('draw-button');
  if (drawButton) {
    window.debug_drawButtonFound = true;
    drawButton.addEventListener('click', () => {
      console.log("Draw button clicked. Setting debug_eventListenerFired.");
      window.debug_eventListenerFired = true;
      if (window.gameState.currentPlayerIndex === 0) {
        console.log("Current player is 0. Setting debug_currentPlayerIndexInListener.");
        window.debug_currentPlayerIndexInListener = window.gameState.currentPlayerIndex;
        drawCard(0);
      } else console.log("Player 1 clicked draw, but it's not their turn.");
    });
  } else {
    window.debug_drawButtonFound = false;
    console.error("Draw button not found!");
  }

  const restartButtonElement = document.getElementById('restart-button');
  if (restartButtonElement) {
    restartButtonElement.addEventListener('click', () => {
      console.log("Restart button clicked.");
      initGame();
    });
  } else console.error("Restart button element not found!");

  function startTurn() {
    window.debug_player1HandLength_at_startTurn_start = window.gameState.players[0]?.hand.length;
    window.debug_currentPlayerIndex_at_startTurn_start = window.gameState.currentPlayerIndex;
    highlightCurrentPlayer();
    const currentPlayer = window.gameState.players[window.gameState.currentPlayerIndex];
    if (!currentPlayer) {
        updateGameMessage("Error: Current player not found.");
        return;
    }
    updateGameMessage(`Player ${currentPlayer.id}'s turn. Cards: ${currentPlayer.hand.length}. Pile: ${window.gameState.pile.length > 0 ? window.gameState.pile[window.gameState.pile.length -1].suit + getRankDisplay(window.gameState.pile[window.gameState.pile.length -1].rank) : 'Empty'}`);
    if (window.gameState.currentPlayerIndex > 0) {
      if (drawButton) drawButton.disabled = true;
      setTimeout(() => {
        cpuTakeTurn(window.gameState.currentPlayerIndex);
        if (window.gameState.currentPlayerIndex === 0 && drawButton) drawButton.disabled = false;
      }, 1500);
    } else if (drawButton) drawButton.disabled = false;
  }

  function checkNormanPeriodEnd() {
    if (window.gameState.isNormanPeriod && window.gameState.players.every(p => p.hasPlayedThisRound)) {
      window.gameState.isNormanPeriod = false;
      window.gameState.players.forEach(p => p.hasPlayedThisRound = false);
      updateGameMessage(document.getElementById('game-message').textContent + " Norman period ended.");
    }
  }

  function tryPlayPlayer1SelectedCards() {
    if (window.gameState.currentPlayerIndex !== 0) return;
    const selIdx = window.gameState.player1SelectedCards;
    const player = window.gameState.players[0];
    if (selIdx.length === 1) playCard(0, selIdx[0]);
    else if (selIdx.length === 2) {
      const c1 = player.hand[selIdx[0]], c2 = player.hand[selIdx[1]];
      if (!c1 || !c2) {
        updateGameMessage("Error with selection.");
        clearPlayer1Selection(); renderPlayerHand(0); return;
      }
      const pTop = window.gameState.pile.length > 0 ? window.gameState.pile[window.gameState.pile.length - 1] : null;
      const sameR = c1.rank === c2.rank;
      const c1Play = !pTop || c1.suit === pTop.suit || c1.rank === pTop.rank;
      const c2Play = !pTop || c2.suit === pTop.suit || c2.rank === pTop.rank;
      if (sameR && (c1Play || c2Play)) {
        let primC = c1Play ? c1 : c2;
        [selIdx[0], selIdx[1]].sort((a,b)=>b-a).forEach(i=>player.hand.splice(i,1));
        window.gameState.pile.push(primC);
        player.hasPlayedThisRound = true; window.gameState.consecutivePasses = 0;
        clearPlayer1Selection(); renderPlayerHand(0); renderPile();
        updateGameMessage(`P1 played two ${getRankDisplay(primC.rank)}s. Hand: ${player.hand.length}.`);
        if (checkWin(0)) { updateGameMessage(`P1 MANNED! Round over.`); updateScores(0); return; }
        checkNormanPeriodEnd(); endTurn();
      } else {
        updateGameMessage(`Invalid two-card play. ${!sameR ? "Ranks differ." : "Neither playable."}`);
        clearPlayer1Selection(); renderPlayerHand(0);
      }
    } else { clearPlayer1Selection(); renderPlayerHand(0); }
  }

  function playCard(pIdx, cardHIdx) {
    const player = window.gameState.players[pIdx];
    if (!player) return;
    const card = player.hand[cardHIdx];
    if (pIdx !== window.gameState.currentPlayerIndex || !card) return;
    const pTop = window.gameState.pile[window.gameState.pile.length - 1];
    if (window.gameState.pile.length > 0 && card.suit !== pTop.suit && card.rank !== pTop.rank) {
      updateGameMessage(`Invalid move for P${player.id}.`); return;
    }
    player.hand.splice(cardHIdx, 1); window.gameState.pile.push(card);
    player.hasPlayedThisRound = true; window.gameState.consecutivePasses = 0;
    if (pIdx === 0) clearPlayer1Selection();
    renderPlayerHand(pIdx); renderPile();
    updateGameMessage(`P${player.id} played ${card.suit}${getRankDisplay(card.rank)}. Hand: ${player.hand.length}.`);
    if (checkWin(pIdx)) { updateGameMessage(`P${player.id} MANNED!`); updateScores(pIdx); return; }
    checkNormanPeriodEnd(); endTurn();
  }

  function drawCard(playerIndex) {
    console.log("drawCard function called. Setting debug_drawCardCalled.");
    window.debug_drawCardCalled = true;
    const player = window.gameState.players[playerIndex];
    if (!player || playerIndex !== window.gameState.currentPlayerIndex) return;
    if (window.gameState.deck.length === 0) {
      if (playerIndex === 0 && !playerHasPlayableCard(0)) {
        window.gameState.consecutivePasses++;
        updateGameMessage(`P1 passes (deck empty, no play). Passes: ${window.gameState.consecutivePasses}`);
        if (!checkStalemate()) endTurn();
      } else if (playerIndex === 0) updateGameMessage("Deck empty. You have playable cards.");
      else updateGameMessage(`Deck empty. P${player.id} cannot draw.`);
      return;
    }
    window.debug_deckLengthBeforePop = window.gameState.deck.length;
    window.debug_handLengthBeforePush = player.hand.length;
    window.debug_isHandArrayBeforePush = Array.isArray(player.hand);
    if (!window.debug_isHandArrayBeforePush) {
      console.error(`CRITICAL: P${playerIndex} hand not array! Fix.`); player.hand = [];
    }
    const drawnCard = window.gameState.deck.pop();
    if (!drawnCard) { console.error("drawnCard undefined after pop."); return; }
    window.debug_drawnCard = JSON.parse(JSON.stringify(drawnCard));
    window.debug_deckLengthAfterPop = window.gameState.deck.length;
    player.hand.push(drawnCard); // Changed from window.gameState.players[playerIndex].hand.push
    window.debug_handLengthAfterPush = player.hand.length;
    player.hasPlayedThisRound = true; window.gameState.consecutivePasses = 0;
    if (playerIndex === 0) clearPlayer1Selection();
    renderPlayerHand(playerIndex);
    window.debug_handLength_after_renderPlayerHand = player.hand.length;
    updateGameMessage(`P${player.id} drew. Hand: ${player.hand.length}.`);
    window.debug_handLength_after_updateGameMessage = player.hand.length;
    checkNormanPeriodEnd();
    window.debug_handLength_after_checkNormanPeriodEnd = player.hand.length;
    endTurn();
    window.debug_player1HandLength_after_endTurn_call_in_drawCard = window.gameState.players[playerIndex]?.hand.length; // playerIndex is still 0 here
  }

  function endTurn() {
    window.debug_player1HandLength_at_endTurn_start = window.gameState.players[0]?.hand.length;
    if (!window.gameState.players[window.gameState.currentPlayerIndex]) {
        window.gameState.currentPlayerIndex = 0;
    }
    window.gameState.currentPlayerIndex = (window.gameState.currentPlayerIndex + 1) % window.gameState.players.length;
    if (window.gameState.currentPlayerIndex === 0) {
        window.gameState.roundCount++;
        if(window.gameState.isNormanPeriod) window.gameState.players.forEach(p => p.hasPlayedThisRound = false);
    }
    if (window.gameState.isGameOver) return;
    startTurn();
  }

  function cpuTakeTurn(cpuPlayerIndex) {
    window.debug_player1HandLength_at_cpuTurn_start = window.gameState.players[0]?.hand.length;
    window.debug_cpuPlayerIndex_at_cpuTurn_start = cpuPlayerIndex;
    const player = window.gameState.players[cpuPlayerIndex];
    if (!player) { endTurn(); return; }
    let bestCardIndex = -1;
    const topPileCard = window.gameState.pile.length > 0 ? window.gameState.pile[window.gameState.pile.length - 1] : null;
    for (let i = 0; i < player.hand.length; i++) {
      const card = player.hand[i];
      if (!topPileCard || card.suit === topPileCard.suit || card.rank === topPileCard.rank) {
        bestCardIndex = i; break;
      }
    }
    if (bestCardIndex !== -1) playCard(cpuPlayerIndex, bestCardIndex);
    else if (window.gameState.deck.length > 0) drawCard(cpuPlayerIndex);
    else {
      window.gameState.consecutivePasses++;
      updateGameMessage(`P${player.id} passes. Passes: ${window.gameState.consecutivePasses}`);
      if (!checkStalemate()) endTurn();
    }
  }

  function playerHasPlayableCard(playerIndex) {
    const player = window.gameState.players[playerIndex];
    if (!player) return false;
    const topPileCard = window.gameState.pile.length > 0 ? window.gameState.pile[window.gameState.pile.length - 1] : null;
    if (!topPileCard) return true;
    return player.hand.some(card => card.suit === topPileCard.suit || card.rank === topPileCard.rank);
  }

  function checkWin(playerIndex) {
    const player = window.gameState.players[playerIndex];
    if (!player || window.gameState.isNormanPeriod) return false;
    const handSum = player.hand.reduce((sum, card) => sum + card.rank, 0);
    if (window.gameState.pile.length === 0) return false;
    const topPileCard = window.gameState.pile[window.gameState.pile.length - 1];
    if (handSum === topPileCard.rank) {
      console.log(`DEBUG: checkWin is TRUE for player ${player.id}. Hand sum: ${handSum}, Pile rank: ${topPileCard.rank}`);
      window.debug_checkWin_returned_true_for_player = player.id;
      return true;
    }
    return false;
  }

  function checkStalemate() {
    if (window.gameState.consecutivePasses >= window.gameState.players.length) {
      window.gameState.isGameOver = true;
      updateGameMessage("Stalemate! No move possible. Draw. Click Restart.");
      const btn = document.getElementById('restart-button');
      if (btn) btn.style.display = 'block';
      return true;
    }
    return false;
  }

  function updateScores(winnerPlayerIndex) {
    const winner = window.gameState.players[winnerPlayerIndex];
    if (!winner) return;
    winner.score += 1;
    const loser = window.gameState.players[(winnerPlayerIndex - 1 + window.gameState.players.length) % window.gameState.players.length];
    if (loser && loser.id !== winner.id) loser.score -= 1;
    renderScores();
    const overallWinner = window.gameState.players.find(p => p.score >= WINNING_SCORE);
    if (overallWinner) {
        window.gameState.isGameOver = true;
        updateGameMessage(`GAME OVER! P${overallWinner.id} wins! Restart?`);
        const btn = document.getElementById('restart-button');
        if (btn) btn.style.display = 'block';
        return;
    } else {
        console.log(`DEBUG: updateScores is about to call initGame. Winner: Player ${winner.id}`);
        window.debug_updateScores_called_initGame = true;
        updateGameMessage(`P${winner.id} won round! Scores: P1=${window.gameState.players[0].score},P2=${window.gameState.players[1].score},P3=${window.gameState.players[2].score},P4=${window.gameState.players[3].score}. New round...`);
        initGame();
    }
  }

  window.tryPlayPlayer1SelectedCards = tryPlayPlayer1SelectedCards;
  window.initGame = initGame;
});
