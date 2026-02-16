import express from "express";
import cors from "cors";
import {db} from './db';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', async (_req, res) => {
    const result = await db.any("SELECT * FROM hello");
    res.json(result);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});