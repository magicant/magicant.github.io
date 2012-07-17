// ai-masteady-1.4.12.js / v1.4.12.1 / 2005-12-28
// © 2006 magicant

// MA Steady AI v1.4.12
// Original: jp.ac.u_tokyo.ecc.user.g440707.tetris.maai.SteadyAI5;


// ========== <Utility> ========== //

Array.fill = function(array, value) {
	for (var i = array.length; --i >= 0; )
		array[i] = value;
};


// ========== AI_SteadyAI5 ========== //

function AI_SteadyAI5() {
	this.name = "MA Steady AI v1.4.12";
	this.list1 = [];
	this.list2 = [];
	this.list3 = [];
	this.model = new MatrixAnalyzer;
	this.simulator = new MatrixAnalyzer;
	this.intary1 = [];
}

AI_SteadyAI5.prototype.toString = function() {
	return this.name;
};

AI_SteadyAI5.prototype.nextPlacement = function(matrix) {
	var c1 = this.list1, c2 = this.list2, c3 = this.list3;
	var p1;
	
	c1.length = 0;
	this.model.copy(matrix);
	if (this.model.current == Tetromino.I && this.model.getISpots(c1) > 0) {
		if (c1.length == 0)
			return c1[0];
		this.simulateAllPlacements(c1, c2);
		return c2[0];
	}
	
	this.model.getAllPossiblePlacements(c1);
	
	c2.length = c3.length = 0;
	this.pickFittingPlacements(c1, c2, c3);
	
	var maxSafeness = this.simulateAllPlacements(c2, c1);
//	debug_clear();
//	debug_print(maxSafeness);
	if (maxSafeness < 0) {
		if (maxSafeness < this.simulateAllPlacements(c3, c2))
			c1 = c2;
//		var maxSafeness2 = this.simulateAllPlacements(c3, c2);
//		debug_print(maxSafeness2);
//		if (maxSafeness < maxSafeness2)
//			c1 = c2;
	}
	return c1[0];
};

AI_SteadyAI5.prototype.pickFittingPlacements = function(src, dst1, dst2) {
	var m = this.model;
	
	for (var i in src) {
		var p = src[i];
		if (ShapeAnalyzer[p.shape].fits(m, p.x))
			dst1.push(p);
		else if (dst2)
			dst2.push(p);
	}
};

AI_SteadyAI5.prototype.simulateAllPlacements = function(src, dst) {
	var maxSafeness = -Infinity;
	var ma = this.simulator;
	
	for (var i in src) {
		var p = src[i];
		ma.copy(this.model);
		ma.fix(p);
		
		var safeness = this.computeSafeness(ma, p, maxSafeness);
		if (safeness > maxSafeness) {
			maxSafeness = safeness;
			dst.length = 0;
		}
		if (safeness == maxSafeness)
			dst.push(p);
	}
	return maxSafeness;
};

AI_SteadyAI5.prototype.computeSafeness = function(ma, p) {
	var top = ma.pileTopAll();
	var count = ma.pileCountAll();
	var y = p.y;
	var safeness = 2000;
	
	safeness += (top >= 6) ? (y * 40) : (6 * 40 - 6 * 500 + y * 500);
	safeness += this.computeCoverSafeness(ma);
	safeness -= count * (top >= 6 ? 30 : 100);
	safeness += this.computeRoughSafeness(ma);
	return safeness;
};

AI_SteadyAI5.prototype.computeCoverSafeness = function(ma) {
	var width = ma.width, height = ma.height;
	var minY = height;
	var holeMinYs = this.intary1;
	var holeCount = 0, result = 0;
	
	holeMinYs.length = width;
	Array.fill(holeMinYs, height);
	for (var x = width; --x >= 0; ) {
		for (var y = ma.pileTop(x); ++y < height; ) {
			if (!ma.getAt(x, y)) {
				if (y < holeMinYs[x]) {
					holeMinYs[x] = y;
					if (y < minY) minY = y;
				}
				holeCount++;
			}
		}
	}
	if (holeCount == 0) return 0;
	
	for (var x = width; --x >= 0; )
		if (holeMinYs[x] == minY)
			result -= minY - ma.pileTop(x);
	return result * 40 - (height - minY) * 60 - holeCount * 350;
};

AI_SteadyAI5.prototype.computeRoughSafeness = function(ma) {
	var width = ma.width;
	var result = 0;
	
	var last = 0, dy0 = 0, dy1 = 0, dym1 = 0;
	var is = 0, ls = 0, js = 0, ljs = 0, sr = 0, zr = 0;
	
	for (var x = -1; x <= width; x++) {
		var dy = ma.dy(x);
		switch (dy) {
			case 0:
				dy0++;
				if (last == 1)
					zr++;
				break;
			case 1:
				dy1++;
				break;
			case -1:
				dym1++;
				if (last == 0)
					sr++;
				break;
			default:
				result -= Math.floor(dy * dy * 2.5);
				break;
		}
		if (last >= 2 && dy <= -2) {
			if (last == 2)
				if (dy == -2)
					ljs++;
				else
					ls++;
			else
				if (dy == -2)
					js++;
				else {
					var h = Math.min(last, -dy);
					is += Math.floor(h * h / 9);
				}
		}
		last = dy;
	}
	
	result -= (dy0 == 0 ? 200 : 0) + (width - dy0) * 20;
	if (dy1  == 0) result -= 30;
	if (dym1 == 0) result -= 30;
	
	switch (ma.next) {
		case Tetromino.O:
			if (dy0 == 0)
				result -= 80;
			break;
		case Tetromino.I:
			if (is > 0)
				is--;
			break;
		case Tetromino.S:
			if (dy1 == 0 && sr == 0)
				result -= 80;
			break;
		case Tetromino.Z:
			if (dym1 == 0 && zr == 0)
				result -= 80;
			break;
		case Tetromino.L:
			if (ls > 0)
				ls--;
			else if (ljs > 0)
				ljs--;
			break;
		case Tetromino.J:
			if (js > 0)
				js--;
			else if (ljs > 0)
				ljs--;
			break;
	}
	result -= is * 350;
	result -= (ls + js) * 200;
	result -= ljs * 100;
	return result;
};


// ========== MatrixAnalyzer ========== //

/** constructor MatrixAnalyzer(Array<Array<?>> matrix?) */
function MatrixAnalyzer(matrix) {
	if (matrix) this.copy(matrix);
}

MatrixAnalyzer.prototype.getAt = function(x, y) {
	return this[x][y];
};

MatrixAnalyzer.prototype.setSize = function(width, height) {
	this.width = width;
	this.height = height;
	for (var i = width; --i >= 0; )
		this[i] = new Array;
	if (width > 0) {
		this.counts = new Array(width);
		this.tops  = new Array(width);
		this.diffs = new Array(width - 1);
	}
	this.countsRow = new Array(height);
};

/** void copy(MatrixModel m) */
MatrixAnalyzer.prototype.copy = function(m) {
	this.current = m.current;
	this.currentX = m.currentX;
	this.currentY = m.currentY;
	this.currentO = m.currentO;
	this.next = m.next;
	
	if (this.width != m.width || this.height != m.height)
		this.setSize(m.width, m.height);
	
	for (var x = m.width; --x >= 0; ) {
		var col = this[x];
		for (var y = m.height; --y >= 0; )
			col[y] = m.getAt(x, y);
	}
//	this.clearLines(0, m.height);
	this.matrixChanged();
};

/** void fix(Placement p?) */
MatrixAnalyzer.prototype.fix = function(p) {
	var blocks, x, y;
	
	if (p) {
		blocks = p.shape.blocks;
		x = p.x;
		y = p.y;
	} else {
		blocks = this.current.getShape(this.currentO).blocks;
		x = this.currentX;
		y = this.currentY;
	}
	
	for (var i = blocks.length; --i >= 0; ) {
		var rowB = blocks[i];
		for (var j = rowB.length; --j >= 0; ) {
			if (rowB[j]) this[x+j][y+i] = true;
		}
	}
	
	this.clearLines(y, y + blocks.length);
	this.matrixChanged();
};

MatrixAnalyzer.prototype.clearLines = function(y1, y2) {
	var count = 0;
	while (y1 < y2)
		count += this.clearLine(y1++);
	return count;
};

MatrixAnalyzer.prototype.clearLine = function(y) {
	for (var x = this.width; --x >= 0; )
		if (!this[x][y]) return false;
	for (var x = this.width; --x >= 0; ) {
		var col = this[x];
		for (var i = y; i > 0; )
			col[i] = col[--i];
		col[0] = false;
	}
	return true;
};

MatrixAnalyzer.prototype.matrixChanged = function() {
	var d = this.diffs, t = this.tops;
	
	Array.fill(this.countsRow, 0);
	for (var x = this.width; --x >= 0; ) {
		var col = this[x];
		var count = 0, top = this.height;
		
		for (var y = this.height; --y >= 0; ) {
			if (col[y]) {
				count++;
				this.countsRow[y]++;
				top = y;
			}
		}
		this.counts[x] = count;
		t[x] = top;
	}
	for (var x = this.width - 2; x >= 0; x--)
		d[x] = t[x + 1] - t[x];
	d[-1] = t[0];
	d[this.width - 1] = -t[this.width - 1];
};

MatrixAnalyzer.prototype.pileCount = function(x) {
	return this.counts[x] || 0;
};

MatrixAnalyzer.prototype.pileCountAll = function() {
	var count = 0, counts = this.counts;
	for (var x = this.width; --x >= 0; )
		count += counts[x];
	return count;
};

MatrixAnalyzer.prototype.pileCountOfRow = function(y) {
	return this.countsRow[y] || 0;
};

MatrixAnalyzer.prototype.pileTop = function(x) {
	return this.tops[x] || 0;
};

MatrixAnalyzer.prototype.pileTopAll = function() {
	return Math.min.apply(null, this.tops);
};

MatrixAnalyzer.prototype.dy = function(x) {
	return this.diffs[x] || 0;
};

MatrixAnalyzer.prototype.getAllPossiblePlacements = function(c) {
	for (var i = this.current.length; --i >= 0; ) {
		var shape = ShapeAnalyzer[this.current[i]];
		for (var j = this.width - shape.width(), k = shape.leftX(); j >= k; j--) {
			var y = shape.landingY(this, j);
			if (this.currentY <= y)
				c.push(new Placement(shape.shape, j, y));
		}
	}
};

/** int getISpots(Array<Placement> c?) */
MatrixAnalyzer.prototype.getISpots = function(c) {
	var sa = ShapeAnalyzer.I1;
	var count = 0;
	
	for (var x = 0, w = this.width; x < w; ) {
		if (this.dy(x - 1) >= 3 && this.dy(x) <= -3) {
			count++;
			if (c)
				c.push(new Placement(sa.shape, x-1, sa.landingY(this, x-1)));
			x += 2;
		} else {
			x += 1;
		}
	}
	return count;
}


// ========== ShapeAnalyzer ========== //

function ShapeAnalyzer(tetromino, orientation, left, heights) {
	this.tetromino = tetromino;
	this.orientation = orientation;
	this.shape = tetromino.getShape(orientation);
	this.left = left;
	this.heights = heights;
	
	var dy = new Array(heights.length - 1);
	for (var i = dy.length; --i >= 0; )
		dy[i] = heights[i + 1] - heights[i];
	this.dy = dy;
	
	ShapeAnalyzer[this.shape] = this;
}

new ShapeAnalyzer(Tetromino.O, 0, true,  [ 3, 3 ]);
new ShapeAnalyzer(Tetromino.I, 0, false, [ 3, 3, 3, 3 ]);
new ShapeAnalyzer(Tetromino.I, 1, true,  [ 4 ]);
new ShapeAnalyzer(Tetromino.S, 0, false, [ 3, 3, 2 ]);
new ShapeAnalyzer(Tetromino.S, 1, false, [ 2, 3 ]);
new ShapeAnalyzer(Tetromino.Z, 0, false, [ 2, 3, 3 ]);
new ShapeAnalyzer(Tetromino.Z, 1, true,  [ 3, 2 ]);
new ShapeAnalyzer(Tetromino.L, 0, false, [ 3, 2, 2 ]);
new ShapeAnalyzer(Tetromino.L, 1, true,  [ 3, 3 ]);
new ShapeAnalyzer(Tetromino.L, 2, false, [ 2, 2, 2 ]);
new ShapeAnalyzer(Tetromino.L, 3, false, [ 1, 3 ]);
new ShapeAnalyzer(Tetromino.J, 0, false, [ 2, 2, 3 ]);
new ShapeAnalyzer(Tetromino.J, 1, true,  [ 3, 1 ]);
new ShapeAnalyzer(Tetromino.J, 2, false, [ 2, 2, 2 ]);
new ShapeAnalyzer(Tetromino.J, 3, false, [ 3, 3 ]);
new ShapeAnalyzer(Tetromino.T, 0, false, [ 2, 3, 2 ]);
new ShapeAnalyzer(Tetromino.T, 1, true,  [ 3, 2 ]);
new ShapeAnalyzer(Tetromino.T, 2, false, [ 2, 2, 2 ]);
new ShapeAnalyzer(Tetromino.T, 3, false, [ 2, 3 ]);

/** このShapeを最も左に寄せたときのx座標を返す */
ShapeAnalyzer.prototype.leftX = function() {
	return this.left ? -1 : 0;
};

/** このShapeの幅を返す */
ShapeAnalyzer.prototype.width = function() {
	return this.heights.length + this.left;
};

/** boolean fits(MatrixAnalyzer matrix, int x)
 * 指定した行列の指定したx座標に隙間なく嵌るか調べる
 */
ShapeAnalyzer.prototype.fits = function(matrix, x) {
	var dy = this.dy;
	
	if (this.left) x++;
	for (var i = dy.length; --i >= 0; )
		if (dy[i] != matrix.dy(x + i))
			return false;
	return true;
};

/** int landingY(MatrixAnalyzer matrix, int x)
 * この Shape を指定した行列の指定した x 座標に落下させた場合での、
 * 落下先の y 座標を求めます。
 * すでに matrix に多くのブロックが積まれている場合、
 * 負の値を返すこともある。(余地がないということ)
 */
ShapeAnalyzer.prototype.landingY = function(matrix, x) {
	var h = this.heights;
	var result = Infinity;
	
	if (this.left) x++;
	for (var i = h.length; --i >= 0; )
		result = Math.min(result, matrix.pileTop(x + i) - h[i]);
	return result;
};

