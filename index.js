const express = require("express");
const db = require("./config/db.js");
const cors = require("cors");
const midtransClient = require("midtrans-client");
const WebSocket = require("ws"); // Import WebSocket library

const app = express();
const PORT = 5174;



// Middleware
app.use(cors());
app.use(express.json());

// Blog Page

// Blog API Endpoints
app.get("/api/get", (req, res) => {
    db.query("SELECT * FROM postingan_all", [], (err, results) => {
      if (err) {
        console.error("Error fetching posts:", err);
        return res.status(500).send(err);
      }
  
      // Convert image blob to Base64 format
      const modifiedResults = results.map((row) => {
        if (row.image) {
          row.image = Buffer.from(row.image).toString("base64");
        }
        return row;
      });
  
      res.send(modifiedResults);
    });
  });



  app.get("/api/getFromId/:id", (req, res) => {
    const { id } = req.params;
  
    db.query("SELECT * FROM postingan_all WHERE id = ?", [id], (err, result) => {
      if (err) {
        console.error("Error fetching post by ID:", err);
        return res.status(500).send(err);
      }
  
      // Convert image blob to Base64 if present
      if (result[0]?.image) {
        result[0].image = `data:image/png;base64,${Buffer.from(result[0].image).toString("base64")}`;
      }
  
      res.send(result);
    });
  });


  app.post("/api/create", (req, res) => {
    const { userName, title, subTitle, text } = req.body;
  
    db.query(
      "INSERT INTO postingan_all (title, post_text, username, sub_title) VALUES (?,?,?,?)",
      [title, text, userName, subTitle],
      (err, result) => {
        if (err) {
          console.error("Error creating post:", err);
          return res.status(500).send(err);
        }
  
        res.status(201).send({ message: "Post created successfully", result });
      }
    );
  });

// Blog Page

// Midtrans Integration
const SERVER_KEY = "SB-Mid-server-g1fxd5NerYOl_cr6LRYQrzbo";
const CLIENT_KEY = "SB-Mid-client-PGWmgbTDKETXuTD6";

const coreApi = new midtransClient.CoreApi({
    isProduction: false, // Use Sandbox mode for testing
    serverKey: SERVER_KEY, // Use your server key here
    clientKey: CLIENT_KEY, // Add your client key here (optional for frontend)
  });
  
// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });
const clients = new Map(); // To keep track of WebSocket connections by orderId

// Handle WebSocket connections
wss.on("connection", (ws, req) => {
  console.log("WebSocket connection established.");

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    if (data.type === "register") {
      clients.set(data.orderId, ws); // Associate WebSocket client with an order ID
      console.log(`Registered client for Order ID: ${data.orderId}`);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed.");
    for (const [orderId, client] of clients.entries()) {
      if (client === ws) {
        clients.delete(orderId); // Remove client from the map on disconnect
      }
    }
  });
});


// Create Transaction Endpoint
app.post('/api/create-transaction', async (req, res) => {
    try {
      console.log('Received request body:', req.body);
      const { orderId, totalPrice, items, email, paymentType } = req.body;
  
      // Filter out items with quantity 0
      const filteredItems = items.filter((item) => item.quantity > 0);
  
      // Base parameter
      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: filteredItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        },
        item_details: filteredItems,
        customer_details: {
          email: email || 'example@email.com',
        },
      };
  
      let response;
  
      // Handle different payment methods
      if (paymentType === 'qris') {
        parameter.payment_type = 'qris';
        response = await coreApi.charge(parameter);
        res.json({
          paymentUrl: response.actions[0]?.url || response.qris.qr_url,
        });
      } else if (paymentType === 'gopay') {
        parameter.payment_type = 'gopay';
        response = await coreApi.charge(parameter);
        res.json({
          paymentUrl: response.actions[0]?.url,
        });
      } else if (paymentType === 'bca') {
        // Handle BCA Virtual Account
        parameter.payment_type = 'bank_transfer';
        parameter.bank_transfer = { bank: 'bca' }; // Specify BCA as the bank
        response = await coreApi.charge(parameter);
        res.json({
          vaNumber: response.va_numbers[0]?.va_number, // Send back the Virtual Account Number
          bank: 'bca',
        });
      } else if (paymentType === "mandiri") {
        parameter.payment_type = "bank_transfer";
        parameter.bank_transfer = { bank: "permata" }; // Mandiri defaults to Permata VA
        response = await coreApi.charge(parameter);
        res.json({
          permataVaNumber: response.permata_va_number,
          bank: "mandiri",
        });
      } else {
        // Unsupported payment type
        return res.status(400).json({ error: `The payment type '${paymentType}' is not supported.` });
      }
  
      console.log('Payment Response:', response);
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Email

  const { sendEmail } = require("./email");

  app.post("/api/send-email", sendEmail);

  // Mock database to store payment statuses temporarily
// const paymentStatusDB = {}; // Key: orderId, Value: payment status

// Payment Notification Endpoint
app.post("/api/payment-notification", async (req, res) => {
  try {
    const notification = req.body;

    // Verify notification using Midtrans SDK
    const transactionStatus = await coreApi.transaction.notification(notification);
    const { order_id, transaction_status } = transactionStatus;

    console.log(`Payment Notification for Order ID: ${order_id}`);
    console.log(`Transaction Status: ${transaction_status}`);

    // Notify the client via WebSocket if registered
    if (clients.has(order_id)) {
      const client = clients.get(order_id);
      client.send(
        JSON.stringify({
          orderId: order_id,
          status: transaction_status,
        })
      );
      console.log(`Notified client for Order ID: ${order_id}`);
    }

    res.status(200).send("Payment notification processed successfully.");
  } catch (error) {
    console.error("Error processing payment notification:", error);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/api/payment-status/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    // Retrieve payment status from Midtrans
    const transactionStatus = await coreApi.transaction.status(orderId);

    console.log("Transaction Status:", transactionStatus);

    // Send transaction status back to the frontend
    res.status(200).json({
      transaction_status: transactionStatus.transaction_status,
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).send("Failed to retrieve payment status.");
  }
});



// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Upgrade HTTP server to handle WebSocket connections
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});