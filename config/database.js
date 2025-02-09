require("dotenv").config();

const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);


// Test the connection
(async () => {
    try {
        const result = await sql`SELECT version()`;
        console.log("Connected to PostgreSQL:", result[0].version);
    } catch (error) {
        console.error("Database connection failed:", error);
    }
})();

// Export the connection for use in other files
module.exports = sql;