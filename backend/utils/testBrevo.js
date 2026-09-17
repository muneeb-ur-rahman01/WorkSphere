require('dotenv').config();

const { BrevoClient } = require('@getbrevo/brevo');

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY
});

async function testEmail() {
  try {
    console.log(
      '[WorkSphere] Brevo API key:',
      process.env.BREVO_API_KEY ? 'LOADED' : 'MISSING'
    );

    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: process.env.BREVO_FROM_NAME || 'WorkSphere',
        email: process.env.BREVO_FROM_EMAIL
      },
      to: [
        {
          email: 'muneeburrahmanshahzad2023@gmail.com'
        }
      ],
      subject: 'WorkSphere Brevo Test',
      htmlContent: `
        <html>
          <body>
            <h2>WorkSphere Email Test</h2>
            <p>Brevo HTTPS API is working successfully.</p>
          </body>
        </html>
      `
    });

    console.log('[WorkSphere] Brevo SUCCESS:', result);
  } catch (error) {
    console.error('[WorkSphere] Brevo FAILED:', error);
  }
}

testEmail();