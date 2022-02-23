module.exports = {
  development: {
    // Necessary for being able to connect to MySQL container with correct AUTH type
    client: 'mysql2',
    connection: {
      // "db" refers to the name of the service in docker-compose
      host: 'db',
      user: 'MYSQL_USER',
      password: 'MYSQL_PASSWORD',
      database: 'blog',
      charset: 'utf8',
    }
  }
};