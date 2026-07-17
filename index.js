const { utf8ToBinary } = require('./lib/utf8')
const { requireDirectory } = require('./lib/require-directory')

const log = console.log
const methods = requireDirectory('./methods')
const input = process.argv.slice(2).join(' ')

let map = {}
let map_= 0
for (let m in methods) {
	map[m] = map_++
}

let str = utf8ToBinary(input)
	str += '++00000111111111111111111111111111_01010101_00000111111111111111111111111111'
	log(str + "\n")
	log("-------------------")
	const len_str = str.length

let cans = {}
let candidate
function setCandidate (m) {
	candidate = cans[m]
	log('')
	log('candidate: ', candidate)
}

function cleanCandidate () {

	candidate.splice(key_s, key_s)
	candidate.splice(key_l, key_l)
}

const key_m = 0
const key_n = 1
const key_v = 2
const key_l = 3
const key_s = 4

for (let m in methods) {

	let attempt
	const method = methods[m]
	const encode = method.encode

	for (a of method.arguments()) {

		log('arg: ', a)
		const { a_, s, n, v } = encode(str, a)
		const l = s.length

		function setAttempt (a, s, n, v, l) {
			attempt = { a_, s, n, v, l }
		}

		if (attempt === undefined) {
			setAttempt(a_, s, n, v, l)
		}

		if (l < attempt.l) {
			setAttempt(a_, s, n, v, l)
		}
	}

	const result = [
		map[m],
		attempt.n,
		attempt.v,
		attempt.l,
		attempt.s,
	]

	cans[m] = result
}

const dew = Object.keys(cans).reduce((b, c) => cans[c][key_l] > cans[b][key_l] ? c : b)
setCandidate(dew)

const len_s = candidate[key_s].length

log('')
str = cans[dew][key_s]
log('str: ', str)
cleanCandidate()
console.log('cleaned: ', candidate)
log('')

const json = JSON.stringify(candidate)
const len_j = json.length
const len_t = len_s + len_j

log(`string length from ${len_str} to ${len_t}`)

let p = len_t / len_str;
	p = p * 100
	p = p - 100
	p = p * -1

log(`${p}% compressed`)