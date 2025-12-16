import { Pool } from "pg"

const connectDB = async () => {
    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        const query = (text, params) => pool.query(text, params);
    } catch (error) {
        console.log("Db connection failure:" + error)
        process.exit(1);
    }
}



export default connectDB;