import express from "express"

import http from "http"
import { connect } from "http2"
import connectDB from "./database"

const hostname = "localhost"
const port = 8080

const startServer = async () => {
    try {
        await connectDB();
        const app = express();
        const server = http.createServer(app);
        

    } catch(error) {
        console.log(`Server start failure:`)
    }

}



