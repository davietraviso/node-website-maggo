const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "jerrysanchez2415@gmail.com",
    pass: "bbif uymp yvtk jumj",
  },
});

const sendEmail = async (req, res) => {
  const { penjemputanData, penjemputan2Data } = req.body;

  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Penjemputan Request</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 10px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        h3 {
          color: #2C3E50;
          text-align: center;
          margin-bottom: 10px;
        }
        .info {
          background-color: #f9f9f9;
          padding: 10px;
          border-radius: 5px;
          margin: 10px 0;
        }
        .info p {
          margin: 5px 0;
          color: #555555;
        }
        .highlight {
          color: #2980B9;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          font-size: 0.9em;
          color: #777777;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h3>🚛 Penjemputan Request 🚛</h3>
        
        <div class="info">
          <p><strong>Customer Name:</strong> <span class="highlight">${penjemputanData.name || "N/A"}</span></p>
          <p><strong>Customer Gender:</strong> <span class="highlight">${penjemputanData.gender || "N/A"}</span></p>
          <p><strong>Customer Phone:</strong> <span class="highlight">${penjemputanData.phone || "N/A"}</span></p>
          <p><strong>E-mail:</strong> <span class="highlight">${penjemputanData.email || "N/A"}</span></p>
          <p><strong>Address:</strong> ${penjemputanData.address || "N/A"}</p>
          <p><strong>Coordinate:</strong> ${
            penjemputanData.coordinate
              ? `${penjemputanData.coordinate.lat}, ${penjemputanData.coordinate.lng}`
              : "N/A"
          }</p>

        </div>

        <div class="info">
          <p><strong>Trash Type:</strong> ${penjemputan2Data.jenisSampah || "N/A"}</p>
          <p><strong>Trash Weight:</strong> ${penjemputan2Data.volumeSampah || "N/A"}</p>
          <p><strong>Requested Date:</strong> ${penjemputan2Data.tanggal || "N/A"}</p>
          <p><strong>Metode Insentif:</strong> ${penjemputan2Data.metodeInsentif || "N/A"}</p>
          <p><strong>Nomor Rekening:</strong> ${penjemputan2Data.nomorRekening || "N/A"}</p>
          <p><strong>Status Notifikasi:</strong> ${penjemputan2Data.notifikasi || "N/A"}</p>
        </div>

        <p style="text-align: center; margin-top: 20px;">
          📧 <strong>This request was sent via your website.</strong>
        </p>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Your Company Name. All Rights Reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: "jerrysanchez2415@gmail.com",
      to: "luketamar6@gmail.com",
      subject: "🚨 NEW Penjemputan Request 🚨",
      html: emailBody, // Use the HTML email template
    });

    res.status(200).send("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Failed to send email.");
  }
};


module.exports = { sendEmail };
