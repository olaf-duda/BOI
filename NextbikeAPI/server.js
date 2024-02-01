const express = require("express");
const path = require("path");

const app = express();
const port = 3000;

const jsonFilePath = path.join(__dirname, "test.json");

app.get("/", (req, res) => {
	res.sendFile(jsonFilePath, (err) => {
	  if (err) {
		console.error(err);
		res.status(500).send("Internal Server Error");
	  } else {
		console.log('Sent data');
	  }
	});
  });

app.listen(port, '0.0.0.0', () => {
	console.log(`Server listening on port ${port}`);
});