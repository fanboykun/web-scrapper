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
    query(sql, callback = null, closeConnection = true ) {

        const connection = this.connect()

        console.log('connecting')

        if(connection == null) throw('Cant Connect')

        connection.connect((err) => {
            if(err) throw err
            console.log('connected to database')

            connection.query(sql, (err, result) => {

                if(err) throw err

                if(typeof callback == 'function') {
                    callback(result)
                }
                if(closeConnection === true) {
                    connection.end()
                }
            })

        })
    }
}

module.exports = db
