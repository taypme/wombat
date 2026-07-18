const { char, utf8 } = require('../lib/utf8')
const characters = utf8()

module.exports.arguments = () => {

	let range = []
	let i = 10

	while (i <= 32) {
		range.push(i)
		i++
	}

	return range
}

function countNeedle (full, needle, a) {
	let count = 0
	let i = 0
	const len = full.length

	while (i < len) {
		if (i + a > len) {
			i++
			continue
		}

		let o = full.slice(i, i + a).join('')

		if (o === needle) {
			count++
			i += a
			continue
		}

		i++
	}

	return count
}

function findNeedle (str, a) {
	let full = Array.from(str)
	let len = full.length
	let seen = {}
	let needle
	let count = 0
	let i = 0

	while (i < len) {
		if (i + a > len) {
			i++
			continue
		}

		let o = full.slice(i, i + a).join('')

		if (seen[o] !== undefined) {
			i++
			continue
		}

		seen[o] = true

		let c = countNeedle(full, o, a)

		if (c > count) {
			needle = o
			count = c
		}

		i++
	}

	return { needle, count }
}

function markString (characters, str) {
	for (let c of str) {
		characters[c] = true
	}
}

function replaceNeedle (str, needle, marker) {
	let full = Array.from(str)
	let len = full.length
	let a = Array.from(needle).length
	let s = ''
	let i = 0

	while (i < len) {
		if (i + a > len) {
			s += full[i]
			i++
			continue
		}

		let o = full.slice(i, i + a).join('')

		if (o === needle) {
			s += marker
			i += a
			continue
		}

		s += full[i]
		i++
	}

	return s
}

module.exports.compress = (str, a) => {

	let chars = Object.create(characters)
	let s = str
	let n = []
	let found = true

	console.log('utf8 length: ', a, 'start: ', Array.from(str).length)

	markString(chars, s)

	while (found) {
		const { needle, count } = findNeedle(s, a)

		if (needle === undefined || count < 2) {
			console.log('utf8 length: ', a, 'done: ', n.length)
			found = false
			continue
		}

		let picked = char(chars)
		let marker = picked.c
		chars = picked.utf8

		if (marker === undefined) {
			found = false
			continue
		}

		s = replaceNeedle(s, needle, marker)
		n.push([marker, needle])
		console.log('utf8 length: ', a, 'count: ', count, 'marker: ', marker, 'needle: ', needle)
	}

	return { a_: a, s, n, v: '' }
}

module.exports.decompress = (str, n, v) => {
	let s = str
	let i = n.length - 1

	while (i >= 0) {
		let marker = n[i][0]
		let needle = n[i][1]
		s = s.split(marker).join(needle)
		i--
	}

	return s
}
