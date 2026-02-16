import pgPromise from "pg-promise";
const pgp = pgPromise();
export const db = pgp('postgres://postgres:Adht7244@localhost:5432/fiverr');