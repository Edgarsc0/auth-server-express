import express from "express";
import http from "http";
import morgan from "morgan";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import con from "./db/config.js";
import myQuerys from "./db/querys.js";
import CryptoJS from "crypto-js";
import cookieParser from "cookie-parser";
dotenv.config();

// Initializations
const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static("public"))
app.use(bodyParser.urlencoded({ extended: false }))
const server = http.createServer(app);
const io = new SocketServer(server, {
    cors: {
        origin: "https://next-client-gabow.vercel.app",
    },
});


app.get("/Edificio/:place",(req,res)=>{
    const place=req.params.place;
    console.log(place);
    if(place=="Town Center"){
        res.redirect("/vistaGeneral.html");
    }if(place=="CECyT 9"){
        res.redirect("/espaciosLibres.html");
    }
});

// Middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));

io.on("connection", (socket) => {
    console.log("Socket conectado...");
    globalThis.registerSocket=socket;
    console.log(socket.id);
    socket.on("newCor",({cor,to})=>{
        io.emit("newCor",{cor:cor,to:to});
    })
    socket.on("stopWp",({to})=>{
        io.emit("stopWp",{to:to});
    })
});

app.post("/api/session/clear",(req,res)=>{
    console.log(req.cookies);
    return res.json({
        status:"Eliminando cookie..."
    });
})

app.post("/api/auth/register",(req,res)=>{
    const {webToken}=req.body;
    const {email,user,password}=jwt.verify(webToken,process.env.SECURE_KEY);
    con.query(myQuerys.registerUser,[email,password,user],(error,result)=>{
        if(error){console.log(error);return res.json({
            status:"Something went wrong",
        })}else{
            return res.json({
                status:"User registered"
            })
        }
    })
});

app.post("/api/auth/login",(req,res)=>{
    const {email,password}=req.body;
    con.query(myQuerys.selectUser,[email],(error,result)=>{
        if(error){
            return res.json({
                status:"Something went wrong"
            });
        }else{
            if(result.length==0){
                return res.json({
                    status:"Error User not found"
                });
            }else{
                if(result[0].usu_password==password){
                    const token=jwt.sign({
                        user:result[0].usu_nombre,
                        email:email,
                    },process.env.SECURE_KEY);
                    return res.json({
                        status:"Ok",
                        token:CryptoJS.AES.encrypt(token,process.env.SECRET_KEY).toString()
                    });
                }else{
                    return res.json({
                        status:"Wrong Password",
                    });
                }
            }
        }
    })
})

app.post("/api/token/verifyToken",(req,res)=>{
    if(req.body.jwt){
        console.log(req.body.jwt)
        try {
            jwt.verify(req.body.jwt,process.env.SECURE_KEY);
            registerSocket.emit("redirect",{jwt:req.body.jwt});
            return res.json({
                status:"Token verified"
            });
        } catch (error) {
            console.log(error);
            return res.json({
                status:"Invalid token"
            });
        }
    }else{
        console.log(req.body.jwt)
        return res.json({
            status:"Must provide a token"
        })
    }
})
const port=process.env.PORT||8000;
server.listen(port,()=>{
    console.log(`server on port ${port}`);
});