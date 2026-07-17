module.exports.arguments = () => {

	return [7, 32]
}

module.exports.encode = (str, a) => {

	let full = str.split('')
	let len = full.length

	console.log('len: ', len)

	let c = {}
	let s = ''
	let n = []

	for (let i = 0; i < len; i++) {

		if (i + a > len) {
			continue
		}		

		let o = full.slice(i, i + a).join('')

		if (c[o] === undefined) {
			c[o] = 0
		}

		c[o]++
	}

	const needle = Object.keys(c).reduce((best, current) => c[current] > c[best] ? current : best)
	console.log('needle: ', needle)

	for (let i = 0; i < len; i++) {

		if (i + a > len) {
			continue
		}

		let o = full.slice(i, i + a).join('')

		if (o === needle) {
			n.push(i)
			i += a - 1
		}

		else {
			s += full[i]
		}

	}

	console.log("-------------------")
	return { a_: a, s, n, v: needle }
}

module.exports.decode = (str, a) => {

}