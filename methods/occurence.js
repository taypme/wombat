module.exports.arguments = () => {

	let range = []

	let i = 10

	while (i <= 42) {
		range.push(i)
		i++
	}

	return range
}

module.exports.compress = (str, a) => {

	let full = str.split('')
	let len = full.length

	let c = {}
	let s = ''
	let n = []
	let needle
	let count = 0

	let i = 0

	while (i < len) {

		if (i + a > len) {
			i++
			continue
		}		

		let o = full.slice(i, i + a).join('')

		if (c[o] !== undefined) {
			i++
			continue
		}

		c[o] = 0

		let j = 0

		while (j < len) {

			if (j + a > len) {
				j++
				continue
			}

			let x = full.slice(j, j + a).join('')

			if (x === o) {
				c[o]++
				j += a
				continue
			}

			j++
		}

		if (c[o] > count) {
			needle = o
			count = c[o]
		}

		i++
	}

	i = 0

	while (i < len) {

		if (i + a > len) {
			s += full[i]
			i++
			continue
		}

		let o = full.slice(i, i + a).join('')

		if (o === needle) {
			n.push(i)
			i += a
			continue
		}

		else {
			s += full[i]
		}

		i++
	}

	return { a_: a, s, n, v: needle }
}

module.exports.decompress = (str, n, v) => {
	let s = str

	for (let i of n) {
		s = s.slice(0, i) + v + s.slice(i)
	}

	return s
}
