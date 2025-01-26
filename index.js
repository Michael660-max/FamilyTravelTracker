import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 15;

let users = [
  { id: 15, name: "Angela", color: "teal" },
  { id: 16, name: "Jack", color: "powderblue" },
];

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getUser() {
  const result = await db.query("SELECT * FROM users");
  return result.rows;
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const filteredUsers = await getUser();
  const result = await db.query("SELECT color FROM users WHERE id = $1", [
    currentUserId,
  ]);
  const userColor = result.rows[0]?.color;

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: filteredUsers,
    color: userColor,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data?.country_code;

    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
    } catch (err) {
      console.log(err);
    }
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  const userInput = req.body.add;
  if (userInput == "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *",
      [req.body.name, req.body.color]
    );
    const newUser = result.rows[0];
    users.push(newUser);
    currentUserId = newUser.id;
  } catch (err) {
    console.log(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
