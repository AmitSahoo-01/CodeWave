import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { YSocketIO } from "y-socket.io/dist/server";
import cors from "cors";
import axios from "axios";
import rateLimit from "express-rate-limit";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const app = express();
app.use(express.static("public"));
app.use(express.json());
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"]
}));

// Rate limiting for execution endpoint
const executeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: "Too many execution requests from this IP, please try again after a minute"
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: [ "GET", "POST" ]
    }
});

const ySocketIO = new YSocketIO(io);
ySocketIO.initialize();

app.get('/health', (req, res) => {
    res.status(200).json({
        message: "ok",
        success: true
    });
});

app.post('/api/execute', executeLimiter, async (req, res) => {
    try {
        const { language, code } = req.body;
        
        const fileId = randomUUID();
        let extension = "";
        let command = "";
        
        if (language === 'javascript' || language === 'typescript') {
            extension = ".js";
            command = "node";
        } else if (language === 'python') {
            extension = ".py";
            command = "python";
        } else {
             return res.json({
                 run: { output: `Execution Error: Local execution for language '${language}' is not implemented yet.` }
             });
        }
        
        const tempFilePath = path.join(process.cwd(), `temp_${fileId}${extension}`);
        await fs.writeFile(tempFilePath, code);
        
        exec(`${command} ${tempFilePath}`, { timeout: 5000 }, async (error, stdout, stderr) => {
            // clean up temp file
            try { await fs.unlink(tempFilePath); } catch(e) {}
            
            if (error && error.killed) {
                return res.json({ run: { output: "Error: Execution timed out." } });
            }
            
            const outStr = stdout ? stdout.toString() : "";
            const errStr = stderr ? stderr.toString() : "";
            const output = outStr + errStr || (error ? error.message : "");
            
            res.json({
                run: { output }
            });
        });
        
    } catch (error) {
        console.error("Execution error:", error.message);
        res.status(500).json({ 
            error: "Failed to execute code", 
            details: error.message 
        });
    }
});

httpServer.listen(3000, () => {
    console.log("Server is running on port 3000");
});
// Trigger restart