module.exports.arguments = () => {

	let range = []

	let i = 3

	while (i <= 30) {
		range.push (i)
		i++
	}

	return range
}

module.exports.compress = (str, a) => {

	let full = str.split ('')
	let len = full.length

	let c = {}
	let s = ''
	let n = ''
	let needle
	let count = 0

	let i = 0

	while (i < len) {

		if (i + a > len) {
			i++
			continue
		}		

		let o = full
			.slice (i, i + a)
			.join ('')

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

			let x = full
				.slice(j, j + a)
				.join('')

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

		let o = full
			.slice(i, i + a)
			.join('')

		if (o === needle) {
			n += i + '_'
			i += a
			continue
		}

		else {
			s += full[i]
		}

		i++
	}

	n = n.slice (0, -1)

	return { s, n, v: needle }
}

module.exports.decompress = (str, n, v) => {
	let s = str

	if (!n) {
		return s
	}

	let n_ = Array.isArray (n)
		? n
		: n
			.split ('_')
			.map (Number)

	for ( let i of n_) {
		s = s.slice (0, i) + v + s.slice (i)
	}

	return s
}

module.exports.compressMeta = n => {
	if (!n || n.length === 0) {
		return ''
	}

	const values = Array.isArray(n) ? n.map(Number) : n.split('_').map(Number)
	let previous = 0

	return values.map((value, index) => {
		const delta = index === 0 ? value : value - previous
		previous = value
		return delta
	}).join('_')
}

module.exports.decompressMeta = meta => {
	if (!meta) {
		return []
	}

	let position = 0
	let values = Array.isArray(meta) ? meta : meta.split('_').map(Number)

	return values.map(delta => {
		position += Number(delta)
		return position
	})
}
