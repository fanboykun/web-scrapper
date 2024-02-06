const mysql = require('mysql')

const db = {
    connect() {
        return mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'kpop'
        })
    },
    pool() {
        return mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'kpop'
        })
    },
    query(query, param = null,  callback = null, closeConnection = true ) {

        const connection = this.connect()

        console.log('connecting')

        if(connection == null) throw('Cant Connect')

        connection.connect((err) => {
            if(err) throw err
            console.log('connected to database')

            connection.query(query, param, (err, result) => {

                if(err) throw err

                if( closeConnection === true ) { connection.end() }
                if(typeof callback == 'function') {
                    callback(result)
                }
            })

        })
    }
}

module.exports = db
