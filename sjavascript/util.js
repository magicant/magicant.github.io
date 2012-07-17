// util.js v0.1 2005-12-14
// (C) 2006 magicant

var Util = new Object;

// Returns new RegExp object which matches exact string.
Util.regexp = function regexp(string, flags) {
	return new RegExp(string.replace(/[\^$\\.*+?()[\]{}|]/g, "\\$&"), flags);
};

// Replaces searchValue in string with replaceValue
// this function is same as String.prototype.replace
Util.replace = function replace(string, searchValue, replaceValue) {
	string = String(string);
	
	var replacement;
	
	if (replaceValue instanceof Function) {
		replacement = replaceValue;
	} else {
		replacement = rp;
		replaceValue = String(replaceValue);
	}
	
	if (searchValue instanceof RegExp) {
		var result = "";
		
		if (searchValue.global) searchValue.lastIndex = 0;
		for (;;) {
			var lastIndex = searchValue.lastIndex;
			var matchResult = searchValue.exec(string);
			var index = matchResult ? matchResult.index : string.length;
			
			if (lastIndex < index)
				result += string.substring(lastIndex, index);
			if (!matchResult)
				break;
			matchResult.push(matchResult.index, string);
			result += replacement.apply(null, matchResult);
			if (!searchValue.global) {
				result += string.substring(searchValue.lastIndex);
				break;
			}
			if (searchValue.lastIndex == lastIndex)
				searchValue.lastIndex++;
		}
		return result;
	} else {
		var searchString = String(searchValue);
		var index = string.indexOf(searchString);
		
		if (index < 0)
			return string;
		return string.substring(0, index) +
			replacement.apply(null, [searchString, index, string]) +
			string.substring(index + searchString.length);
	}
	
	function rp() {
		var a = arguments;
		var m = a.length - 3;
		var leader = a[m + 2].substring(0, a[m + 1]);
		var trailer = a[m + 2].substring(a[m + 1] + a[0].length);
		
		return Util.replace(replaceValue, /\$([$&\x27`]|\d{1,2})/g, rp2);
		
		function rp2(match, arg) {
			switch (arg) {
				case "$":  return "$";
				case "&":  return a[0];
				case "`":  return leader;
				case "'":  return trailer;
				default:
					var n = parseInt(arg);
					return (0 < n && n <= m) ? a[n] || "" : match;
			}
		}
	}
};

if ("a" != "a".replace(/(a)/, "$1") || "1" != "2".replace(/(2)/, function(a, b) {
	return arguments[2] == 0 && arguments[3] == "2" && b - 1;
})) {
	String.prototype.replace = function replace(searchValue, replaceValue) {
		return Util.replace(this, searchValue, replaceValue);
	};
	//alert("debug: replaced String.prototype.replace");
}

// Formats a string.
// *Examples:
//    format("{0} {1}.",          3, "cars") -> "3 cars."
//    format("{0} of {1,8:0.00}", 2, 12.345) -> "2 of     12.34"
//    format("{{0}} of you",      "none"   ) -> "{0}} of you"
Util.format = function format(str) {
	var a = arguments;
	
	return String(str).replace(/\{(?:(\d+)(,(.*?))?(:(.*?))?\}|\{)/g, rp);
	
/*	return Util.replace(str, /\{(?:(\d+)(,(.*?))?(:(.*?))?\}|\{)/g, rp);
	
	var result = "";
	var re = /\{(?:(\d+)(,(.*?))?(:(.*?))?\}|\{)/g;
	
	str = String(str);
	for (;;) {
		var lastIndex = re.lastIndex;
		var mr = re.exec(str);
		if (lastIndex < (mr ? mr.index : str.length))
			result += str.substring(lastIndex, (mr ? mr.index : str.length));
		if (!mr)
			break;
		mr.push(mr.index, str);
		result += rp.apply(null, mr);
	}
	return result;//fixme:delete*/
	
	function rp(m, i, ls, length, fs, format) {
		if (m == "{{") return "{";
		
		var r = a[parseInt(i) + 1];
		
		if (fs) r = Util.formatNumber(r, format);
		else    r = String(r);
		while (r.length < length) r = " " + r;
		return r;
	}
};

// Formats a number.
// num: a finite number to format.
// format: a string or positive integer which specifies format.
//   If format is an integer, it specifies the least significant place.
//   If format is a string, it will be parsed as follows:
//     '+' / '-': enforced/optional sign.
//     '0' / '#': enforced/optional digit.
//     '.' / '.?': enforced/optional point.
//     '\' followed by a char: the char (escaping).
//     other char: char literal (It has no special meaning.)
// exp: (optional) if specified, num will be multiplied by 10 to the power exp.
// *Examples:
//    formatNumber(123.45, "+0000.0000" ) -> "+0123.4500"
//    formatNumber(123.45, "-####.?####") -> "123.45"
//    formatNumber(123,    "0."         ) -> "123."
//    formatNumber(123,    "0.?"        ) -> "123"
//    formatNumber(-123,   "\++0.45"    ) -> "+-123.45"
//    formatNumber(100.01, "0.0"        ) -> "100.0"
//    formatNumber(999.99, "0.0"        ) -> "1000.0"
//    formatNumber(123.45, 1            ) -> "123.4"     (same as "-0.?0")
//    formatNumber(123.45, 4            ) -> "123.4500"  (same as "-0.?0000")
// *Error:
//    If format contains more than one '.' or '.?', an Error will be thrown.
Util.formatNumber = function formatNumber(num, format, exp) {
	if (typeof format == "number") {
		var i = format >>> 0;
		format = "-0.?";
		while (--i >= 0) format += "0";
	}
	if (!isFinite(num) || typeof format != "string")
		return String(num);
	
	// enforced/optional digits before/after point
	var edb = 0, odb = 0, eda = 0, oda = 0;
	var re = /\\.|[+0#-]|\.\??/g;
	var f = new Array;
	
	for (;;) {
		var lastIndex = re.lastIndex;
		var mr = re.exec(format);
		if (lastIndex < (mr ? mr.index : format.length))
			f.push(format.substring(lastIndex, mr ? mr.index : format.length));
		if (!mr)
			break;
		f.push(mr[0]);
	}
	
//	var f = format.match(/\\.|[+0#-]|\.\??|[^\\.+0#-]+/g) || { length: 0 };
	
	// count #'s and 0's.
	for (var i = 0, p = false; i < f.length; i++) {
		switch (f[i]) {
			case "0":  if (p) eda++; else edb++;  break;
			case "#":  if (p) oda++; else odb++;  break;
			case ".":  case ".?":  p = true;      break;
		}
	}
	
	exp = isFinite(exp) ? exp : 0;
	
	var db = edb + odb, da = eda + oda;
	var neg = Infinity / num < 0;
	var mag = String(Math.round(pow10(Math.abs(num), da + exp)));
	
	if (mag.indexOf("e") >= 0) return String(num);
	while (mag.length < da) mag = "0" + mag;
	
	var magb = mag.slice(0, da ? -da : mag.length);
	var maga = mag.slice(-da).replace(/0+$/, "");
	
	var result = "";
	
	for (var i = 0, p = -db; i < f.length; i++) {
		switch (f[i]) {
			case "#":
				if (p == -db && magb.length > db) {
					result += magb.slice(0, -db);
					magb = magb.slice(-db);
				}
				result += p < 0 ? magb.charAt(magb.length + p) : maga.charAt(p);
				p++;
				break;
			case "0":
				if (p == -db && magb.length > db) {
					result += magb.slice(0, -db);
					magb = magb.slice(-db);
				}
				result += (p < 0 ? magb.charAt(magb.length + p) : maga.charAt(p)) || "0";
				p++;
				break;
			case "+":
				if (!neg)
					result += "+";
			case "-":
				if (neg)
					result += "-";
				break;
			case ".?":
				if (eda == 0 && maga - 0 == 0)
					break;
			case ".":
				if (p == db && magb.length > 0) {
					result += magb;
				}
				result += ".";
				break;
			default:
				if (f[i].length >= 2 && f[i].charAt(0) == "\\")
					result += f[i].substring(1);
				else
					result += f[i];
				break;
		}
	}
	return result;
	
	function pow10(num, exp) {
		if (exp > 0) {
			while (exp-- > 0) {
				num *= 10;
			}
		} else {
			while (exp++ < 0) {
				num /= 10;
			}
		}
		return num;
	}
};
