const { utf8ToBinary } = require('./lib/utf8')
const { compress, compressMeta, decompress, decompressMeta, arguments } = require('./lib/occurence.js')

const log = console.log
const input = process.argv
	.slice (2)
	.join(' ')

function percent (from, to) {
	if (from === 0) {
		return 0
	}

	let p = to / from
		p = p * 100
		p = p - 100
		p = p * -1

	return Number ( p.toFixed (2))
}

let i = utf8ToBinary (input)
//log (i)

log (' ')
log (' ')
log (' ')
log (' ')
log ( arguments ())
log (' ')
log (' ')
log (' ')
log (' ')
log ('----------------')

let results = arguments () .map (a => {

	let { s, n, v } = compress (i, a)
	let o = n

	if (

		v &&
		n !== '0'

	) {

		n = compressMeta (n)
		n = compressMeta (n)

		s += '_' + n + '?' + v

		let p = percent (i.length, s.length)

		if (p > 10) {

			log ('||||')
			log (a + '||')
			log ('||||')
			log (' ')

			log (o)
			log (n)
			log (v)

			n = decompressMeta (n)
			n = decompressMeta (n)
			s = decompress (s, n, v)

			log ('___')

			log (i.length)
			log (s.length)
			log (p + '%')

			log ('----------------')
		}
	}
})
