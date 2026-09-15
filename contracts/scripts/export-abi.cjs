const fs = require('fs')
const path = require('path')

const out = path.join(__dirname, '../../src/abi')
fs.mkdirSync(out, { recursive: true })

for (const name of ['BlockoraToken', 'BlockoraNFT']) {
  const artPath = path.join(
    __dirname,
    `../artifacts/contracts/${name}.sol/${name}.json`,
  )
  const art = JSON.parse(fs.readFileSync(artPath, 'utf8'))
  fs.writeFileSync(
    path.join(out, `${name}.json`),
    JSON.stringify({ abi: art.abi, bytecode: art.bytecode }, null, 2),
  )
  console.log('exported', name)
}
