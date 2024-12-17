const mysql = require("mysql");

// Create a connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "postinganblog", // Your existing database name
  connectionLimit: 10, // Maximum number of connections in the pool
  waitForConnections: true, // Wait if no connections are available
  queueLimit: 0, // No limit to the request queue
});

// Export a query function to simplify usage
module.exports = {
  query: (query, params, callback) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error getting connection from pool:", err);
        callback(err, null);
        return;
      }

      connection.query(query, params, (queryErr, results) => {
        // Release connection back to the pool after query
        connection.release();

        if (queryErr) {
          console.error("Error executing query:", queryErr);
          callback(queryErr, null);
          return;
        }

        callback(null, results);
      });
    });
  },
};
