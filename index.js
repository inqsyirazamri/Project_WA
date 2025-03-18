
require('dotenv').config(); // Load .env file
const express = require("express");
const axios = require("axios");
const { saveMessageLog } = require("./database");

const app = express();
app.use(express.json())

const { WHATSAPP_ACCESS_TOKEN, WEBHOOK_VERIFY_TOKEN, HYBRID_ANALYSIS_KEY } = process.env;

app.post("/webhook", async (req, res) => {
  const { entry } = req.body;

  if (!entry || entry.length === 0) {
    return res.status(400).send("Invalid Request");
  }

  const changes = entry[0].changes;

  if (!changes || changes.length === 0) {
    return res.status(400).send("Invalid Request");
  }

  const statuses = changes[0].value.statuses?.[0] ?? null;
  const messages = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (statuses) {
    // Handle message status
    console.log(`
      MESSAGE STATUS UPDATE:
      ID: ${statuses.id},
      STATUS: ${statuses.status}
    `);
  }

  if (messages && messages.type === "text") {
    const messageBody = messages.text.body;
    if (messageBody.toLowerCase().includes("link")) {
      await sendLinksToScan(messages.from, messages.id);
      return res.status(200).send("Random link sent");
      await checkAnsw();
    }
  }
  res.status(200).send("Webhook processed");
});

async function sendMessage(to, body) {
  try {
    const response = await axios({
      url: "https://graph.facebook.com/v22.0/557649867435943/messages",
      method: "post",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      }
      , data: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
    console.log("Message sent successfully:", response.data);
  } catch (error) {
    console.error("Error sending message:", error.response ? error.response.data : error.message);
  }
}

async function sendLinksToScan(to, messageId, originalUrl) {
  const randlink = getRandomLink();
  try {
    const response = await axios({
      url: `https://graph.facebook.com/v22.0/557649867435943/messages`,
      method: "post",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: {
          type: "list",
          header: {
            type: "text",
            text: "Scam Link Awareness",
          },
          body: {
            text: `${randlink} \nChoose an option below to classify the link correctly.`,
          },
          footer: {
            text: "Analyze wisely before making your choice!",
          },
          "action": {
            "button": "Classify Link",
            "sections": [
              {
                "title": "The link is...",
                "rows": [
                  {
                    "id": "safe",
                    "title": "Safe ✅",
                    "description": "This link is trustworthy and not a scam."
                  },
                  {
                    "id": "potential_scam",
                    "title": "Potential Scam ⚠️",
                    "description": "This link seems suspicious or untrustworthy."
                  }
                ]
              }
            ]
          },
        },
        context: { message_id: messageId },
      }),
    });
    console.log("Random link sent successfully:", response.data);
  } catch (error) {
    console.error("Error sending random link:", error.response ? error.response.data : error.message);
  }
}

// Predefined list (will update with proper dataset later)
const predefinedLinks = [
  "https://example.com/link3",
  "https://example.com/link2",
  "https://example.com/link1"
];

// Function to get a random link
function getRandomLink() {
  return predefinedLinks[Math.floor(Math.random() * predefinedLinks.length)];
}


app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const token = req.query["hub.verify_token"];

  if (mode && token === WEBHOOK_VERIFY_TOKEN) {
    // respond with 200 OK and challenge token from the request
    res.status(200).send(challenge);
    console.log("Webhook verified successfully!");
  } else {
    // respond with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);
  }
});

app.get("/", (req, res) => {
  res.send("Whatsapp with Node.js and Webhooks");
});

// Start the server
app.listen(3000, () => {
  console.log("Server started on port 3000");
});