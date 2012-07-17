// tetris.js 0.1.4 2005年12月28日 14:37:01
// © 2006 magicant

var elements;
var showNext, frameSpeed, aiEnabled, ai, aiPlacement;
var gameID;
var random = new MersenneTwister;

var matrix, score;
var manualInput;

var intervalID;

var SL, Shape, Tetromino, Placement;

var WIDTH = 10, HEIGHT = 20;
var FRAMES_TO_FALL = 60;
var FRAMES_TO_NEXT = 16;
var HOLD_THRESHOLD = 10;
var FPS_FRAME_COUNT = 12;

var PROMPT_GAME_NO = 'ゲームの番号を入力してください。(0-4294967295)';
var MSG_READY = '準備完了';
var MSG_LIMITED = '準備完了 (マニュアル操作無効)';


// ==================== Shape ==================== //

/** constructor Shape(Array<Array<boolean>> blocks)
 * @param shape 形を表す 2 次元配列。１次元目が行、2次元目が列。
 */
Shape = function(blocks) {
	this.blocks = blocks;
};

/** boolean hasRoom(Array<Array<?>> matrix, int x, int y)
 * 指定した行列の指定した座標にこの形が入るか調べる。 */
Shape.prototype.hasRoom = function(matrix, x, y) {
	for (var i = this.blocks.length; --i >= 0; ) {
		var row = this.blocks[i];
		var matrixRow = matrix[y + i];
		
		if (!matrixRow)
			return false;
		for (var j = row.length; --j >= 0; ) {
			if (row[j] && !hasRowRoom(matrixRow, x + j))
				return false;
		}
	}
	return true;
	
	function hasRowRoom(row, x) {
		return x >= 0 && x < WIDTH && !row[x];
	}
};

Shape.prototype.toString = function() {
	return this._string;
};


// ==================== Tetromino ==================== //

/** Tetromino(string type, string color, Shape... shape) */
Tetromino = function(type, color) {
	var r = new Array;
	
	r.color = color;
	r.type = type;
	for (var i = 0, l = arguments.length - 2; i < l; i++) {
		var s = arguments[i + 2];
		r[i] = s;
		s._string = type + i;
		s.tetromino = r;
		s.orientation = i;
	}
	
	r.getShape = function(orientation) {
		return this[orientation & (this.length - 1)];
	};
	Tetromino[type] = r;
};

SL = {
	f:   [],
	t:   [true],
	ft:  [false, true],
	tt:  [true, true],
	fft: [false, false, true],
	ftt: [false, true, true],
	ttt: [true, true, true]
};

Tetromino("O", "#d7d713",
	new Shape([SL.f, SL.ftt, SL.ftt]));
Tetromino("I", "#d71313",
	new Shape([SL.f, SL.f, [true, true, true, true]]),
	new Shape([SL.ft, SL.ft, SL.ft, SL.ft]));
Tetromino("S", "#d713d7",
	new Shape([SL.f, SL.ftt, SL.tt]),
	new Shape([SL.t, SL.tt, SL.ft]));
Tetromino("Z", "#13d713",
	new Shape([SL.f, SL.tt, SL.ftt]),
	new Shape([SL.fft, SL.ftt, SL.ft]));
Tetromino("L", "#ea7f15",
	new Shape([SL.f, SL.ttt, SL.t]),
	new Shape([SL.ft, SL.ft, SL.ftt]),
	new Shape([SL.fft, SL.ttt]),
	new Shape([SL.tt, SL.ft, SL.ft]));
Tetromino("J", "#9595ff",
	new Shape([SL.f, SL.ttt, SL.fft]),
	new Shape([SL.ftt, SL.ft, SL.ft]),
	new Shape([SL.t, SL.ttt]),
	new Shape([SL.ft, SL.ft, SL.tt]));
Tetromino("T", "#14e0e0",
	new Shape([SL.f, SL.ttt, SL.ft]),
	new Shape([SL.ft, SL.ftt, SL.ft]),
	new Shape([SL.ft, SL.ttt]),
	new Shape([SL.ft, SL.tt, SL.ft]));

/** Tetromino nextRandom()
 * 次のランダムなテトロミノを返す。 */
Tetromino.nextRandom = function() {
	switch (random.nextInt(7)) {
	case 0:  return Tetromino.O;
	case 1:  return Tetromino.I;
	case 2:  return Tetromino.S;
	case 3:  return Tetromino.Z;
	case 4:  return Tetromino.L;
	case 5:  return Tetromino.J;
	case 6:  return Tetromino.T;
	}
};


// ==================== Placement ==================== //

/** constructor Placement(Shape shape, int x, int y) */
Placement = function(shape, x, y) {
	this.shape = shape;
	this.x = x;
	this.y = y;
	this.tetromino = shape.tetromino;
	this.orientation = shape.orientation;
};


// ==================== matrix ==================== //

matrix = [[], [], [], [], [], [], [], [], [], [],
          [], [], [], [], [], [], [], [], [], [] ];

matrix.width = WIDTH;
matrix.height = HEIGHT;
matrix.current = null;
matrix.currentO = 0;
matrix.currentX = 0;
matrix.currentY = 0;
matrix.next = null;
matrix._next = null;
matrix.gameOver = true;
matrix.framesToFall = 0;

matrix.getAt = function(x, y) {
	return this[y][x];
};

matrix.startNewGame = function() {
	this._next = Tetromino.nextRandom();
	this.gameOver = false;
	
	// 行列を初期化
	for (var i = this.length; --i >= 0; )
		this[i].length = 0;
	
	score.clear();
	this.startNext();
};

/** void nextFrame() */
matrix.nextFrame = function() {
	if (this.gameOver) return;
	
	var drop = false;
	var move = getNextMove();
	
	if (!this.current) {
		if (--this.framesToFall <= 0) {
			this.startNext();
		}
		return;
	}
	switch (move) {
	case "t":
		this.tryMove(this.currentX, this.currentY, this.currentO + 1);
		break;
	case "l":
		this.tryMove(this.currentX - 1, this.currentY, this.currentO);
		break;
	case "r":
		this.tryMove(this.currentX + 1, this.currentY, this.currentO);
		break;
	case "d":
		drop = true;
		score.drop();
		break;
	}
	if (drop || --this.framesToFall <= 0) {
		if (this.tryMove(this.currentX, this.currentY + 1, this.currentO)) {
			this.framesToFall = FRAMES_TO_FALL;
		} else {
			this.fix();
			this.framesToFall = FRAMES_TO_NEXT;
		}
	}
};

/** boolean tryMove(int x, int y, int orientation)
 * @return 指定位置に動かせたかどうか */
matrix.tryMove = function(x, y, o) {
	if (this.current.getShape(o).hasRoom(this, x, y)) {
		this.currentX = x;
		this.currentY = y;
		this.currentO = o;
		this.repaintRequired = true;
		return true;
	} else {
		return false;
	}
};

/** void startNext() */
matrix.startNext = function() {
	this.framesToFall = FRAMES_TO_FALL;
	this.current = this._next;
	this.currentX = 3;
	this.currentY = 0;
	this.currentO = 0;
	this._next = Tetromino.nextRandom();
	this.next = showNext ? this._next : null;
	
	score.newTetromino(this.current);
	
	if (!this.current.getShape(0).hasRoom(this, 3, 0))
		this.gameOver = true;
	this.repaintRequired = true;
};

/** void fix() */
matrix.fix = function() {
	var blocks = this.current.getShape(this.currentO).blocks;
	var lines = 0;
	
	c: for (var i = 0; i < blocks.length; i++) {
		var blocksRow = blocks[i];
		var matrixRow = this[this.currentY + i];
		
		// 固定
		for (var j = blocksRow.length; --j >= 0; )
			if (blocksRow[j])
				matrixRow[this.currentX + j] = this.current.color;
		
		// 行消去確認
		for (var j = WIDTH; --j >= 0; )
			if (!matrixRow[j])
				continue c;
		
		// 行消去実行
		matrixRow.length = 0;
		for (var j = this.currentY + i; j > 0; )
			this[j] = this[--j];
		this[0] = matrixRow;
		lines++;
	}
	
	if (lines)
		score.linesCleared(lines);
	this.current = null;
	this.repaintRequired = true;
};

/** 画面の行列を再描画 */
matrix.repaint = function() {
	if (!this.repaintRequired) return;
	this.repaintRequired = false;
	
	var tableRows = elements.main.rows;
	
	for (var i = this.length; --i >= 0; ) {
		var matrixRow = this[i];
		var tableRowCells = tableRows.item(i).cells;
		
		for (var j = WIDTH; --j >= 0; ) {
			var cs = tableRowCells.item(j).style;
			
			cs.color = cs.backgroundColor = matrixRow[j] || "black";
		}
	}
	if (this.current) {
		var shape = this.current.getShape(this.currentO).blocks;
		var color = this.current.color;
		
		for (var i = shape.length; --i >= 0; ) {
			var shapeRow = shape[i];
			var tableRowCells = tableRows.item(this.currentY + i).cells;
			
			for (var j = shapeRow.length; --j >= 0; ) {
				if (shapeRow[j]) {
					var cs = tableRowCells.item(this.currentX + j).style;
					cs.color = cs.backgroundColor = color;
				}
			}
		}
	}
	
	tableRows = elements.next.rows;
	if (this.next) {
		var shape = this.next.getShape(0).blocks;
		var color = this.next.color;
		
		for (var i = 3; --i >= 1; ) {
			var shapeRow = shape[i];
			var tableRowCells = tableRows.item(i - 1).cells;
			
			for (var j = 4; --j >= 0; ) {
				var cs = tableRowCells.item(j + 3).style;
				cs.color = cs.backgroundColor = shapeRow[j] ? color : "black";
			}
		}
	} else {
		for (var i = 2; --i >= 0; ) {
			var tableRowCells = tableRows.item(i).cells;
			for (var j = 7; --j >= 3; ) {
				var cs = tableRowCells.item(j).style;
				cs.color = cs.backgroundColor = "black";
			}
		}
	}
};


// ==================== ScoreManager ==================== //

score = {
	
	SINGLE:   40,
	DOUBLE:  100,
	TRIPLE:  300,
	TETRIS: 1200,
	
	score: 0,
	singles: 0, doubles: 0, triples: 0, tetrises: 0,
	os: 0, is: 0, ss: 0, zs: 0, ls: 0, js: 0, ts: 0,
	
	/** repaintRequired(Score/Lines/Counts) */
	rrs: false, rrl: false, rrc: false,
	
	clear: function() {
		this.score = 0;
		this.singles = this.doubles = this.triples = this.tetrises = 0;
		this.os = this.is = this.ss = this.zs = this.ls = this.js = this.ts = 0;
		this.rrs = this.rrl = this.rrc = true;
	},
	
	drop: function() {
		this.score++;
		this.rrs = true;
	},
	
	linesCleared: function(lines) {
		switch (lines) {
		case 1:  this.singles++;  this.score += this.SINGLE;  break;
		case 2:  this.doubles++;  this.score += this.DOUBLE;  break;
		case 3:  this.triples++;  this.score += this.TRIPLE;  break;
		case 4:  this.tetrises++; this.score += this.TETRIS;  break;
		}
		this.rrs = this.rrl = true;
	},
	
	newTetromino: function(tetromino) {
		switch (tetromino) {
		case Tetromino.O:  this.os++;  break;
		case Tetromino.I:  this.is++;  break;
		case Tetromino.S:  this.ss++;  break;
		case Tetromino.Z:  this.zs++;  break;
		case Tetromino.L:  this.ls++;  break;
		case Tetromino.J:  this.js++;  break;
		case Tetromino.T:  this.ts++;  break;
		}
		this.rrc = true;
	},
	
	repaint: function() {
		if (this.rrs) {
			elements.score.innerHTML = this.score;
			this.rrs = false;
		}
		if (this.rrl) {
			elements.l1.innerHTML = this.singles;
			elements.l2.innerHTML = this.doubles;
			elements.l3.innerHTML = this.triples;
			elements.l4.innerHTML = this.tetrises;
			elements.lines.innerHTML
				= this.singles * 1 + this.doubles * 2
				+ this.triples * 3 + this.tetrises * 4;
			this.rrl = false;
		}
		if (this.rrc) {
			elements.counto.innerHTML = this.os;
			elements.counti.innerHTML = this.is;
			elements.counts.innerHTML = this.ss;
			elements.countz.innerHTML = this.zs;
			elements.countl.innerHTML = this.ls;
			elements.countj.innerHTML = this.js;
			elements.countt.innerHTML = this.ts;
			elements.count .innerHTML
				= this.os + this.is + this.ss
				+ this.zs + this.ls + this.js + this.ts;
			this.rrc = false;
		}
	}//,
	
};


// ==================== manualInput ==================== //

manualInput = {
	
	left: false, right: false, down: false, turn: false,
	holdCount: 0,
	
	keyPressed: function(keyCode) {
		switch (keyCode) {
		case 0x46:  case 0x66:  // 'F' 'f'
			this.turn = true;
			return false;
		case 0x4a:  case 0x6a:  // 'J' 'j'
			this.left = true;
			this.holdCount = HOLD_THRESHOLD;
			return false;
		case 0x4b:  case 0x6b:  // 'K' 'k'
			this.down = true;
			return false;
		case 0x4c:  case 0x6c:  // 'L' 'l'
			this.right = true;
			this.holdCount = HOLD_THRESHOLD;
			return false;
		}
		return true;
	},
	
	keyReleased: function(keyCode) {
		switch (keyCode) {
		case 0x46:  case 0x66:  // 'F' 'f'
			this.turn = false;
			return false;
		case 0x4a:  case 0x6a:  // 'J' 'j'
			this.left = false;
			return false;
		case 0x4b:  case 0x6b:  // 'K' 'k'
			this.down = false;
			return false;
		case 0x4c:  case 0x6c:  // 'L' 'l'
			this.right = false;
			return false;
		}
		return true;
	},
	
	nextMove: function() {
		if (this.turn) {
			this.turn = false;
			return "t";
		} else if (this.left) {
			if (this.holdCount-- == HOLD_THRESHOLD || this.holdCount < 0)
				return "l";
		} else if (this.right) {
			if (this.holdCount-- == HOLD_THRESHOLD || this.holdCount < 0)
				return "r";
		} else if (this.down) {
			return "d";
		}
		return null;
	}//,
	
};

/** 初期化 */
function init() {
	elements = {
		nextc:  document.getElementById("next-checkbox"),
		speed:  document.getElementById("speed-select"),
		status: document.getElementById("status"),
		fps:    document.getElementById("frames-per-second"),
		next:   document.getElementById("next-matrix"),
		main:   document.getElementById("main-matrix"),
		score:  document.getElementById("score-value"),
		l1:     document.getElementById("singles"),
		l2:     document.getElementById("doubles"),
		l3:     document.getElementById("triples"),
		l4:     document.getElementById("tetrises"),
		lines:  document.getElementById("lines"),
		counto: document.getElementById("o-tetrominoes"),
		counti: document.getElementById("i-tetrominoes"),
		counts: document.getElementById("s-tetrominoes"),
		countz: document.getElementById("z-tetrominoes"),
		countl: document.getElementById("l-tetrominoes"),
		countj: document.getElementById("j-tetrominoes"),
		countt: document.getElementById("t-tetrominoes"),
		count:  document.getElementById("total-tetrominoes"),
		debug:  document.getElementById("debug-output")
	};
	
	// キーリスナーを登録
	var uai = new UAIdentifier();
	var manualInputAvailable;
	if (uai.trident || uai.tasman || uai.opera) {
		document.body.onkeydown = keydown;
		document.body.onkeyup = keyup;
		manualInputAvailable = true;
	} else if (document.body.addEventListener) {
		document.body.addEventListener("keydown", keydown, true);
		document.body.addEventListener("keyup", keyup, true);
		manualInputAvailable = true;
	}
	
	// AI初期化
	ai = new AI_SteadyAI5;
	
	resetShowNext();
	resetSpeed();
	setAIEnabled(true);
	
	intervalID = window.setInterval(nextFrame, 1000 / 60);
	elements.status.innerHTML = manualInputAvailable ? MSG_READY : MSG_LIMITED;
	document.getElementById("manual-button").disabled = !manualInputAvailable;
}

function finalize() {
	window.clearInterval(intervalID);
}

function keydown(e) {
	if (!e) e = window.event;
	return manualInput.keyPressed(e.keyCode);
}

function keyup(e) {
	if (!e) e = window.event;
	return manualInput.keyReleased(e.keyCode);
}

/** void setAIEnabled(aiEnabled) */
function setAIEnabled(enabled) {
	aiEnabled = enabled;
	if (enabled && !matrix.gameOver)
		decideAINextPlacement();
}

/** showNext の値をチェックボックスの値に更新 */
function resetShowNext() {
	showNext = elements.nextc.checked;
	matrix.next = showNext ? matrix._next : null;
	matrix.repaintRequired = true;
}

/** frameSpeed の値をスピード選択の値に更新 */
function resetSpeed() {
	frameSpeed = elements.speed.value - 0;
}

/** ゲーム開始 */
function startGame(id) {
	if (id === undefined) {
		id = parseInt(window.prompt(PROMPT_GAME_NO, simpleRandom()));
		if (!(0 <= id && id < 0x100000000))
			return;
	}
	random.setSeed(id);
	gameID = id;
	elements.status.innerHTML = "#" + id;
	
	aiPlacement = null;
	matrix.startNewGame();
}

/** 一フレームごとに実行されるタイマーコールバックメソッド */
function nextFrame() {
	if (--nextFrame.frameCount < 0) {
		var now = new Date().getTime();
		var diff = now - nextFrame.time;
		nextFrame.frameCount = FPS_FRAME_COUNT;
		nextFrame.time = now;
		elements.fps.innerHTML = Util.formatNumber(
			FPS_FRAME_COUNT / diff, "0.0", 3);
	}
	
	if (matrix.gameOver) return;
	
	for (var i = frameSpeed; --i >= 0; ) {
		matrix.nextFrame();
		if (matrix.gameOver) {
			elements.status.innerHTML += " - GAME OVER...";
			break;
		}
	}
	matrix.repaint();
	score.repaint();
}

nextFrame.frameCount = 0;
nextFrame.time = new Date().getTime();

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

/** string getNextMove(): 次の操作を返す */
function getNextMove() {
	if (aiEnabled) {
		if (!matrix.current) {
			aiPlacement = null;
			return null;
		}
		if (!aiPlacement)
			decideAINextPlacement();
		if (matrix.currentO != aiPlacement.orientation)
			return "t";
		if (matrix.currentX < aiPlacement.x)
			return "r";
		if (matrix.currentX > aiPlacement.x)
			return "l";
		return "d";
	} else {
		return manualInput.nextMove();
	}
}

/** void decideAINextPlacement(): AIの次の配置を決める */
function decideAINextPlacement() {
	aiPlacement = ai.nextPlacement(matrix);
}

function debug_print(v) {
	elements.debug.innerHTML += "<p>" + v;
}

function debug_clear() {
	elements.debug.innerHTML = "";
}
