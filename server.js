const express = require("express");
const bodyParser = require("body-parser");
const DuckDB = require("@duckdb/node-api");
require("dotenv").config();
const cors = require("cors");

const app = express();
const PORT = process.env.PORT;

// Middleware to parse JSON requests
app.use(bodyParser.json(), cors());

// Set up DuckDB database
const connection = DuckDB.DuckDBInstance.create("apiKeys.db").then((db) => {
  return db.connect();
});

// Create the "licenses" table if it doesn't exist
(async () => {
  try {
    (await connection).run(`
            CREATE TABLE IF NOT EXISTS licenses (
              licenseKey TEXT PRIMARY KEY,
              expiryDate DATE,
              userName TEXT,
              isValid BOOLEAN DEFAULT TRUE
            );
          `);
    console.log('Table "licenses" is ready');

    const testLicenseKey = process.env.TEST_KEY;
    const expiryDate = process.env.EXPIRY_DATE;
    const userName = process.env.USER_NAME;

    // Insert license only if it's defined
    if (testLicenseKey) {
      try {
        (await connection).run(
          "INSERT INTO licenses (licenseKey, expiryDate, userName) VALUES (?, ?, ?) ON CONFLICT(licenseKey) DO NOTHING",
          [testLicenseKey, expiryDate, userName]
        );
        console.log("Test license added from environment variables.");
      } catch (error) {
        console.error("Error inserting test license:", err);
      }
    }
  } catch (err) {
    console.error("Error creating table:", err);
  }
})();

// Basic Authentication middleware
const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  // Decode Base64 credentials (format: 'Basic <base64-encoded-string>')
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "ascii"
  );
  const [username, password] = credentials.split(":");

  // Verify credentials (replace 'admin' and 'password123' with your desired credentials)
  const masterUsername = process.env.BASIC_AUTH_USER;
  const masterPassword = process.env.BASIC_AUTH_PASS;

  if (username === masterUsername && password === masterPassword) {
    return next(); // Proceed to the next middleware or route handler
  } else {
    console.log(masterPassword, masterUsername, username, password);

    return res.status(403).json({ message: "Invalid credentials" });
  }
};

// API endpoint to validate a license (protected with Basic Auth)
app.post("/validate", async (req, res) => {
  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res
      .status(400)
      .json({ isValid: false, message: "License key is required" });
  }

  (await connection)
    .runAndReadAll("SELECT * FROM licenses WHERE licenseKey = ?", [licenseKey])
    .then((v) => {
      const result = v.getRowObjectsJson();

      if (result.length > 0) {
        const row = result[0];
        const notExpired = row.expiryDate > new Date().toISOString();

        if (notExpired && row.isValid) {
          return res.json({ isValid: true, message: "License is valid" });
        } else {
          return res.json({
            isValid: false,
            message: "License is invalid or expired",
          });
        }
      } else {
        return res.json({ isValid: false, message: "License not found" });
      }
    })
    .catch((err) => {
      console.error("Database error:", err);
      return res.status(500).json({ isValid: false, message: "Server error" });
    });
});

// API endpoint to add a new license (protected with Basic Auth)
app.post("/add-license", basicAuth, async (req, res) => {
  const { licenseKey, expiryDate, userName } = req.body;

  if (!licenseKey || !expiryDate || !userName) {
    return res
      .status(400)
      .json({ message: "License key and expiry date are required" });
  }

  if (!/^[A-Z0-9-]+$/.test(licenseKey)) {
    return res.status(400).json({ message: "Invalid license key format" });
  }
  if (!/^[A-Za-z0-9-]+$/.test(userName)) {
    return res.status(400).json({ message: "Invalid user name format" });
  }
  if (isNaN(Date.parse(expiryDate))) {
    return res.status(400).json({ message: "Invalid expiry date" });
  }

  try {
    (await connection).run(
      "INSERT OR REPLACE INTO licenses (licenseKey, expiryDate, userName) VALUES (?, ?, ?)",
      [licenseKey, expiryDate, userName]
    );
    res.json({ message: "License added successfully" });
  } catch (err) {
    console.error("Error adding license:", err);
    return res.status(500).json({ message: "Error adding license" });
  }
  await logKeys(licenseKey);
});

async function logKeys(licenseKey) {
  (await connection)
    .runAndReadAll(
      "SELECT licenseKey, strftime(expiryDate, '%Y-%m-%d') AS expiryDate, isValid FROM licenses WHERE licenseKey = ?",
      [licenseKey]
    )
    .then((v) => {
      console.log(v.getRowObjectsJson());
    });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Licensing server running on http://localhost:${PORT}`);
});
