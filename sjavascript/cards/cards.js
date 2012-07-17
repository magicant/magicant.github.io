// cards.js 0.2 (2005-10-24)

/** Enumeration: the 13 ranks */
Rank = { ACE : 1, TWO : 2, THREE : 3, FOUR : 4, FIVE : 5, SIX : 6,
	SEVEN : 7, EIGHT : 8, NINE : 9, TEN : 10, JACK : 11, QUEEN : 12,
	KING : 13 };

/** Enumeration: the four suits */
Suit = { SPADES : "s", HEARTS : "h", DIAMONDS : "d", CLUBS : "c" };

/** Constructor: Card(Rank rank, Suit suit) */
function Card(rank, suit) {
	this.rank = rank;
	this.suit = suit;
}

/** Method: string toString() */
Card.prototype.toString = function() {
	return Card.rankToString(this.rank) + " of "
		+ Card.suitToString(this.suit);
}

/** Function: Array<Card> createNewDeck([number numberOfJokers]) */
Card.createNewDeck = function(jokers) {
	var newDeck = new Array();
	for (var i = 1; i <= 13; i++) {
		newDeck.push(new Card(i, Suit.SPADES));
	}
	for (var i = 1; i <= 13; i++) {
		newDeck.push(new Card(i, Suit.HEARTS));
	}
	for (var i = 1; i <= 13; i++) {
		newDeck.push(new Card(i, Suit.DIAMONDS));
	}
	for (var i = 1; i <= 13; i++) {
		newDeck.push(new Card(i, Suit.CLUBS));
	}
	for (var i = 0; i < jokers; i++) {
		newDeck.push(new Card(0));
	}
	return newDeck;
}

/**
 * Function: Array<Card> shuffle(Array<Card> cards[, function random])
 * shuffles the cards and returns it.
 * The parameter random: a function that takes an integer as the only argument
 * and returns a random integer that is greater than or equal to 0 and less
 * than the argument.
 */
Card.shuffle = function(cards, random) {
	if (typeof random != "function") {
		random = function(max) {
			var x;
			do {
				x = Math.random();
			} while (x == 1);
			return Math.floor(x * max);
		};
	}
	
	for (var i = cards.length; i > 1; ) {
		var j = random(i);
		var s = cards[j];
		cards[j] = cards[--i];
		cards[i] = s;
	}
	return cards;
}

Card.rankToString = function(x) {
	if (x instanceof Card) {
		x = x.rank;
	}
	switch (x) {
		case Rank.ACE:    return "A";
		case Rank.TWO:    return "2";
		case Rank.THREE:  return "3";
		case Rank.FOUR:   return "4";
		case Rank.FIVE:   return "5";
		case Rank.SIX:    return "6";
		case Rank.SEVEN:  return "7";
		case Rank.EIGHT:  return "8";
		case Rank.NINE:   return "9";
		case Rank.TEN:    return "10";
		case Rank.JACK:   return "J";
		case Rank.QUEEN:  return "Q";
		case Rank.KING:   return "K";
		default:          return undefined;
	}
}

Card.suitToString = function(x) {
	if (x instanceof Card) {
		x = x.suit;
	}
	switch (x) {
		case Suit.SPADES:    return "spades";
		case Suit.HEARTS:    return "hearts";
		case Suit.DIAMONDS:  return "diams";
		case Suit.CLUBS:     return "clubs";
		default:             return undefined;
	}
}

Card.isJoker = function(card) {
	return card.rank == 0;
}
