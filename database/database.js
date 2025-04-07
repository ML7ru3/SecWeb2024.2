import mysql from 'mysql2'

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Trung@3112004',
    database: '2048db'
}).promise()

const result = await pool.query('select * from user')
const rows = result[0]
console.log(rows)