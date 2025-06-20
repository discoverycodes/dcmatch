import crypto from 'crypto';

// Dados do webhook (status como número conforme documentação Plisio)
const payload = {
  txn_id: '6850c334ca30d2bfe0055f48',
  status: '1',
  source_amount: '14.87'
};

// Secret key real do banco de dados
const secretKey = 'H6CuCwgRl1mp38gc2OSFz9RGe-rAVgWLnSHl0-uqRkhdhLDT5pyvqQf-D-TVRH_W';

// Gerar hash
const data = JSON.stringify(payload);
const hash = crypto.createHash('md5').update(data + secretKey).digest('hex');

console.log('Payload:', payload);
console.log('Hash gerado:', hash);

// Simular requisição curl
const curlCommand = `curl -X POST http://localhost:5000/api/webhooks/plisio?verify_hash=${hash} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({
    txn_id: '6850c334ca30d2bfe0055f48',
    source_amount: '14.87',
    status: '1',
    currency: 'USDT_BSC',
    order_number: 'MG-6850c334ca'
  })}' \\
  -v`;

console.log('\nComando curl:');
console.log(curlCommand);