// snake.js 1.1.2 (2005-10-24)
// © 2005 Magicant

var eCols, eReserve, eId, eCounter, eInfo, eHelp;
var DECK, gameId, cards, back, reserve, selection, move, completion;
var intervalID, time, random;
var showHelp;

var PROMPT_GAME_NO = 'ゲームの番号を入力してください。(0-4294967295)';
var RESTART_CONFIRM = 'このゲームを初めからやり直しますか?';
var RESERVE_HTML1 = '<div class="card back" onclick="cardClicked(-1);">?</div>';
var RESERVE_HTML2 = '<div class="card null"></div>';
var CONGRATS = '<h2 id="congrats">Congratulations!!</h2>';

function init() {
	eReserve = document.getElementById("main-field-reserve");
	eId      = document.getElementById("game-id");
	eCounter = document.getElementById("time-counter");
	eInfo    = document.getElementById("main-field-info");
	eHelp    = document.getElementById("help");
	eCols = [
		document.getElementById("main-field-col0"),
		document.getElementById("main-field-col1"),
		document.getElementById("main-field-col2"),
		document.getElementById("main-field-col3"),
		document.getElementById("main-field-col4"),
		document.getElementById("main-field-col5"),
		document.getElementById("main-field-col6")
	];
	
	document.getElementById("main-field").onselectstart = function() {
		return false;
	}
	eHelp.style.display = "none";
	showHelp = false;
	
	DECK = Card.createNewDeck();
	cards = new Array(7);
	random = new MersenneTwister();
}

function switchHelp() {
	eHelp.style.display = (showHelp = !showHelp) ? "block" : "none";
}

function startGame(id) {
	if (id === undefined) {
		id = parseInt(window.prompt(PROMPT_GAME_NO, simpleRandom()));
		if (!(0 <= id && id < 0x100000000))
			return;
	}
	random.setSeed(id);
	eInfo.style.display = "none";
	eHelp.style.display = "none";
	showHelp = false;
	
	var deck = Card.shuffle(DECK.slice(0),
	                        function(m) { return random.nextInt(m); });
	back = [3, 3, 3, 3];
	completion = new Array();
	for (var i = 0; i < 7; i++) {
		cards[i] = deck.slice(7 * i, 7 * (i + 1));
		refresh(i);
	}
	reserve = deck.slice(7 * 7);
	eReserve.innerHTML = RESERVE_HTML1;
	
	window.clearInterval(intervalID);
	gameId = id;
	selection = null;
	move = new Array();
	time = -1;
	displayTime();
	eId.innerHTML = "#" + id;
	intervalID = window.setInterval(displayTime, 1000);
}

function restartGame() {
	if (gameId === undefined || window.confirm(RESTART_CONFIRM)) {
		startGame(gameId);
	}
}

function simpleRandom() {
	var x = new Date().getTime() >>> 0;
	x ^= x  << 29;
	x ^= x >>>  2;
	x ^= x  << 23;
	x ^= x >>>  3;
	x ^= x  << 19;
	x ^= x >>>  5;
	return x >>> 0;
}

function displayTime() {
	if (!showHelp)
		eCounter.innerHTML = ++time + " 秒";
}

/** refreshes the innerHTML of the given column. */
function refresh(colNo) {
	var html = "";
	
	if (completion[colNo]) {
		var suit = Card.suitToString(cards[colNo][0]);
		for (var i = Rank.KING; i >= Rank.ACE; i--) {
			html += '<div class="card ' + suit + '">&' + suit + "; "
				+ Card.rankToString(i) + "</div>";
		}
	} else {
		var col = cards[colNo], b = back[colNo];
		for (var i = 0; i < col.length; i++) {
			if (i < b) {  // back
				html += '<div class="card back">?</div>';
			} else {  // front
				var card = col[i];
				var suit = Card.suitToString(card);
				var rank = Card.rankToString(card);
				card = (colNo << 8) | i;
				html += '<div id="card' + card + '" class="card ' + suit
					+ '" onmousedown="cardClicked(' + card
					+ ');">&' + suit + '; ' + rank + '</div>';
			}
		}
		html += '<div class="card null" onmouseup="cardClicked('
			+ ((colNo << 8) | 0xff) + ');"></div>';
	}
	eCols[colNo].innerHTML = html;
}

function cardClicked(cardId) {
	if (cardId < 0) {  // open the reserved cards
		clearSelection();
		move.push(".");
		eReserve.innerHTML = RESERVE_HTML2;
		for (var i = 0; i < reserve.length; i++) {
			cards[i].push(reserve[i]);
			completion[i] = false;
			refresh(i);
		}
		reserve = null;
	} else if (cardId & 0x80) {  // move the selection to the clicked column
		if (selection === null)
			return;
		var fromCol = selection >>> 8, fromRow = selection & 0xff;
		var toCol = cardId >>> 8;
		clearSelection();
		if (!isMovable(fromCol, fromRow, toCol))
			return;
		
		var from = cards[fromCol], to = cards[toCol];
		for (var i = fromRow; i < from.length; i++) {
			to.push(from[i]);
		}
		from.length = fromRow;
		move.push(toCol);
		if (fromCol < back.length && back[fromCol] == fromRow) {
			back[fromCol]--;
		} else {
			checkCompletion(fromCol);
		}
		checkCompletion(toCol);
		refresh(fromCol);
		refresh(toCol);
		checkFinish();
	} else {  // select the clicked card
		clearSelection();
		setSelection(cardId);
	}
}

function clearSelection() {
	if (selection !== null) {
		document.getElementById("card" + selection).style.backgroundColor
			= "white";
	}
	selection = null;
}

function setSelection(cardId) {
	selection = cardId;
	document.getElementById("card" + selection).style.backgroundColor
		= "yellow";
}

function isMovable(fromCol, fromRow, toCol) {
	if (fromCol == toCol)
		return false;
	var fromCard = cards[fromCol][fromRow];
	var toCard = cards[toCol][cards[toCol].length-1];
	return toCard  // cards[toCol].length > 0
		? fromCard.suit == toCard.suit && fromCard.rank + 1 == toCard.rank
		: fromCard.rank == Rank.KING;
}

function checkCompletion(colNo) {
	var col = cards[colNo];
	if (col.length != 13)
		return false;
	
	var suit = col[0].suit;
	for (var i = 0; i < col.length; i++) {
		var card = col[i];
		if (card.suit != suit || card.rank != 13 - i)
			return false;
	}
	completion[colNo] = true;
	return true;
}

function checkFinish() {
	var count = 0;
	for (var i = 0; i < completion.length; i++) {
		if (completion[i])
			count++;
	}
	if (count == 4) {
		completion.finished = true;
		window.clearInterval(intervalID);
		eInfo.innerHTML = CONGRATS;
		eInfo.style.display = "block";
	}
}
