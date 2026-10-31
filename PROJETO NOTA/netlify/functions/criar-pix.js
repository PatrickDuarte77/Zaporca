const https = require('https');

exports.handler = async function(event, context) {
  // Apenas aceita requisições POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const dadosBody = JSON.parse(event.body || '{}');
    const emailUsuario = dadosBody.email || 'cliente@zaporca.com';

    // Token seguro obtido através das Variáveis de Ambiente da Netlify
    const ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    const payload = JSON.stringify({
      transaction_amount: 35.00,
      description: "ZapOrça Prático - Acesso PRO Vitalício",
      payment_method_id: "pix",
      payer: {
        email: emailUsuario
      }
    });

    const options = {
      hostname: 'api.mercadopago.com',
      port: 443,
      path: '/v1/payments',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': 'zaporca-' + Date.now()
      }
    };

    const respostaMP = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { resolve({ statusCode: res.statusCode, body: data }); });
      });

      req.on('error', (error) => { reject(error); });
      req.write(payload);
      req.end();
    });

    const respostaJson = JSON.parse(respostaMP.body);

    if (respostaMP.statusCode >= 200 && respostaMP.statusCode < 300) {
      const dadosPix = respostaJson.point_of_interaction.transaction_data;
      return {
        statusCode: 200,
        body: JSON.stringify({
          sucesso: true,
          paymentId: respostaJson.id,
          qrCodeBase64: dadosPix.qr_code_base64,
          qrCodeCopyPaste: dadosPix.qr_code
        })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ sucesso: false, erro: respostaJson })
      };
    }

  } catch (erro) {
    return {
      statusCode: 500,
      body: JSON.stringify({ sucesso: false, mensagem: erro.message })
    };
  }
};
