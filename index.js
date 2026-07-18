const fs = require('node:fs')
const { utf8ToBinary } = require('./lib/utf8')
const { requireDirectory } = require('./lib/require-directory')

const log = console.log
const methods = requireDirectory('./methods')
const runs = Number(process.argv[2] || 1)
let input = process.argv.slice(3).join(' ')

if (input === '') {
	input = fs.readFileSync(0, 'utf8')
}

let map = {}
let map_= 0

for (let m in methods) {
	map[m] = map_++
}

const key_m = 0
const key_n = 1
const key_v = 2
const key_l = 3
const key_s = 4
const key_t = 5

function percent (from, to) {
	if (from === 0) {
		return 0
	}

	let p = to / from
		p = p * 100
		p = p - 100
		p = p * -1

	return Number(p.toFixed(2))
}

function cleanCandidate (candidate) {
	candidate.splice(key_s, key_s)
	candidate.splice(key_l, key_l)
}

function sizeCandidate (m, n, v, s) {
	const json = JSON.stringify([
		map[m],
		n,
		v,
	])

	return s.length + json.length
}

function compress (str) {
	let cans = {}

	for (let m in methods) {

		let attempt
		const method = methods[m]
		const methodCompress = method.compress

		for (let a of method.arguments()) {

			const { a_, s, n, v } = methodCompress(str, a)
			const l = s.length
			const t = sizeCandidate(m, n, v, s)

			function setAttempt (a, s, n, v, l, t) {
				attempt = { a_, s, n, v, l, t }
			}

			if (attempt === undefined) {
				setAttempt(a_, s, n, v, l, t)
			}

			if (t < attempt.t) {
				setAttempt(a_, s, n, v, l, t)
			}
		}

		cans[m] = [
			map[m],
			attempt.n,
			attempt.v,
			attempt.l,
			attempt.s,
			attempt.t,
		]
	}

	const name = Object.keys(cans).reduce((b, c) => cans[c][key_t] < cans[b][key_t] ? c : b)
	const candidate = cans[name]
	const from = str.length

	log('')
	log('candidate: ', candidate)
	log('')

	if (candidate[key_t] >= from) {
		return {
			str,
			candidate: [],
			json: '',
			from,
			to: from,
		}
	}

	str = candidate[key_s]
	cleanCandidate(candidate)

	const json = JSON.stringify(candidate)

	return {
		str,
		candidate,
		json,
		from,
		to: str.length + json.length,
	}
}

let str = utf8ToBinary(input)
const start = str.length
let total = start
let mapJson = []

log('\n' + str + '\n')

let i = 1

while (i <= runs) {

	log('-------------------')
	log('run: ', i)
	log('-------------------')

	const result = compress(str)
	str = result.str

	if (result.json !== '') {
		mapJson.push(result.candidate)
	}

	let mapText = ''

	if (mapJson.length > 0) {
		mapText = JSON.stringify(mapJson)
	}

	total = str.length + mapText.length

	console.log('cleaned: ', result.candidate)
	log('')
	log(`iteration length: ${result.from} to ${result.to}`)
	log(`iteration compressed: ${percent(result.from, result.to)}%`)
	log('')
	log(`total length: ${start} to ${total}`)
	log(`total compressed: ${percent(start, total)}%`)
	log('')

	i++
}
